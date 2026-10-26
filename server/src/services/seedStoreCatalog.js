import Category from '../models/Category.js';
import Product from '../models/Product.js';

/**
 * Non-destructive: makes sure the storefront demo catalogue (the same products the shop pages show)
 * exists in MongoDB so cart / checkout can use real ObjectIds. Existing products are never modified.
 */
export const seedStoreCatalog = async () => {
  const { PRODUCT_FIXTURES } = await import('../../../client/src/data/productFixtures.js');
  const catCache = {};
  const getCategory = async (slug, name, collection) => {
    if (catCache[slug]) return catCache[slug];
    let cat = await Category.findOne({ slug });
    if (!cat) {
      cat = await Category.findOne({ name });
    }
    if (!cat) {
      const type = /women/i.test(collection || '')
        ? 'Women'
        : /men/i.test(collection || '')
        ? 'Men'
        : /access/i.test(collection || '')
        ? 'Accessories'
        : 'General';
      cat = await Category.create({ name, slug, collectionType: type });
    }
    catCache[slug] = cat;
    return cat;
  };

  const validSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'One Size'];
  let created = 0;
  let updated = 0;

  for (const f of PRODUCT_FIXTURES) {
    const category = await getCategory(f.category, f.categoryName || f.category, f.collection);
    const perVariantStock = Math.max(1, Math.floor((f.stockQuantity || 10) / Math.max(1, f.sizes.length)));

    const variants = [];
    for (const size of f.sizes) {
      const s = validSizes.includes(size) ? size : 'One Size';
      for (const color of f.colors || [{ name: 'Default', hex: '#17191C' }]) {
        variants.push({
          sku: `${f.sku}-${s.replace(/\s+/g, '')}-${color.name.replace(/\s+/g, '').slice(0, 3)}`.toUpperCase(),
          size: s,
          color: { name: color.name, hex: color.hex },
          price: f.regularPrice,
          salePrice: f.salePrice ?? null,
          costPrice: f.costPrice || 0,
          stock: perVariantStock,
        });
      }
    }

    const doc = {
      name: f.name,
      sku: f.sku,
      slug: f.slug,
      description: f.description,
      shortDescription: (f.shortDescription || '').slice(0, 300),
      category: category._id,
      collectionGender: ["Men's Collection", "Women's Collection", 'Unisex Collection', "Kids' Collection"].includes(
        f.collection
      )
        ? f.collection
        : 'Unisex Collection',
      images: (f.images || []).map((img, i) => ({
        public_id: `fixture/${f.slug}/${i}`,
        url: img.url,
        isPrimary: i === 0,
        altText: img.alt || f.name,
      })),
      regularPrice: f.regularPrice,
      salePrice: f.salePrice ?? null,
      costPrice: f.costPrice || 0,
      stockQuantity: f.stockQuantity || 0,
      lowStockThreshold: f.lowStockThreshold || 5,
      variants,
      specifications: f.specifications || [],
      materials: f.materials || [],
      careInstructions: f.careInstructions || [],
      isPublished: true,
      isFeatured: !!f.isFeatured,
      isNewArrival: !!f.isNewArrival,
      isBestSeller: !!f.isBestSeller,
      isOnSale: !!f.isOnSale,
      averageRating: f.averageRating || 0,
      reviewCount: f.reviewCount || 0,
    };

    const existing = await Product.findOne({ slug: f.slug });
    if (existing) {
      // keep live stock / price edits made in the admin panel
      updated += 1;
    } else {
      await Product.create(doc);
      created += 1;
    }
  }

  return { created, present: updated };
};