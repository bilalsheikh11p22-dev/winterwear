import Product from '../models/Product.js';
import ProductVariant from '../models/ProductVariant.js';
import Category from '../models/Category.js';
import Order from '../models/Order.js';
import { syncInventoryToProductStock } from './inventoryService.js';
import { publishProductPublished, publishPriceDropped, publishStockChanged } from './notifications/events.js';

const effectivePrice = (p) => (p.salePrice != null && p.salePrice < p.regularPrice ? p.salePrice : p.regularPrice);

export const listProducts = async ({
  category,
  collection,
  minPrice,
  maxPrice,
  size,
  color,
  search,
  sort,
  page = 1,
  limit = 12,
  includeUnpublished = false,
}) => {
  const query = {};

  if (!includeUnpublished) {
    query.isPublished = true;
  }

  if (category) {
    // If slug provided, lookup category id
    if (!category.match(/^[0-9a-fA-F]{24}$/)) {
      const catDoc = await Category.findOne({ slug: category });
      if (catDoc) query.category = catDoc._id;
    } else {
      query.category = category;
    }
  }

  if (collection) {
    query.collectionGender = collection;
  }

  if (minPrice !== undefined || maxPrice !== undefined) {
    query.regularPrice = {};
    if (minPrice !== undefined) query.regularPrice.$gte = Number(minPrice);
    if (maxPrice !== undefined) query.regularPrice.$lte = Number(maxPrice);
  }

  if (search) {
    query.$text = { $search: search };
  }

  const sortMap = {
    'price-low': { regularPrice: 1 },
    'price-high': { regularPrice: -1 },
    rating: { averageRating: -1 },
    bestseller: { isBestSeller: -1, createdAt: -1 },
    newest: { createdAt: -1 },
  };

  const sortOption = sortMap[sort] || { createdAt: -1 };

  const skip = (Number(page) - 1) * Number(limit);
  const total = await Product.countDocuments(query);
  const products = await Product.find(query)
    .sort(sortOption)
    .skip(skip)
    .limit(Number(limit))
    .populate('category', 'name slug');

  return {
    products,
    total,
    page: Number(page),
    pages: Math.ceil(total / Number(limit)),
  };
};

export const getProductBySlug = async (slug, includeUnpublished = false) => {
  const query = { slug };
  if (!includeUnpublished) query.isPublished = true;

  const product = await Product.findOne(query).populate('category', 'name slug');
  if (!product) {
    const error = new Error('Product not located in catalog archive.');
    error.status = 404;
    throw error;
  }

  // Fetch all variants
  const variants = await ProductVariant.find({ product: product._id, isActive: true });

  return { product, variants };
};

const slugify = (text) =>
  String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const createProduct = async (productData) => {
  const data = { ...productData };
  if (!data.slug) {
    const base = slugify(data.name) || `product-${Date.now()}`;
    let slug = base;
    let n = 1;
    while (await Product.exists({ slug })) {
      n += 1;
      slug = `${base}-${n}`;
    }
    data.slug = slug;
  }
  const product = await Product.create(data);
  // Only products that are actually public are announced. A draft (isPublished:false) never triggers anything.
  if (product.isPublished) await publishProductPublished(product);
  return product;
};

export const updateProduct = async (id, updateData) => {
  const previous = await Product.findById(id).lean();
  if (!previous) {
    const error = new Error('Product not found.');
    error.status = 404;
    throw error;
  }

  // Stamp the first publication time when a draft becomes public.
  if (updateData.isPublished === true && !previous.isPublished && !previous.publishedAt) {
    updateData = { ...updateData, publishedAt: new Date() };
  }

  const product = await Product.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  });

  // Keep the warehouse record in step with admin stock edits so checkout sees the new quantity
  if (updateData.stockQuantity !== undefined && previous.stockQuantity !== product.stockQuantity) {
    await syncInventoryToProductStock(product._id, product.stockQuantity);
  }

  // Business events (deduplicated by deterministic ids inside the outbox)
  if (!previous.isPublished && product.isPublished) await publishProductPublished(product);
  if (product.isPublished && effectivePrice(product) < effectivePrice(previous)) {
    await publishPriceDropped({ productId: product._id, oldPrice: effectivePrice(previous), newPrice: effectivePrice(product) });
  }
  if (previous.stockQuantity !== product.stockQuantity) {
    await publishStockChanged({ productId: product._id, prevQty: previous.stockQuantity, newQty: product.stockQuantity });
  }
  return product;
};

/** Public "New Arrivals" feed: real, published products ordered by actual publication date. */
export const listLatestProducts = async ({ limit = 12, category } = {}) => {
  const query = { isPublished: true };
  if (category) query.category = category;
  return Product.find(query)
    .sort({ publishedAt: -1, createdAt: -1 })
    .limit(Math.min(Number(limit) || 12, 50))
    .populate('category', 'name slug');
};

export const archiveOrDeleteProduct = async (id) => {
  // Check if product is referenced by historical orders
  const referencedCount = await Order.countDocuments({ 'items.product': id });
  if (referencedCount > 0) {
    // Soft-archive to preserve order integrity
    const product = await Product.findByIdAndUpdate(
      id,
      { isPublished: false },
      { new: true }
    );
    return { action: 'archived', product };
  }

  // Safe to delete completely
  const deleted = await Product.findByIdAndDelete(id);
  await ProductVariant.deleteMany({ product: id });
  return { action: 'deleted', product: deleted };
};
