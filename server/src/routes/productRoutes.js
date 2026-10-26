import express from 'express';
import Product from '../models/Product.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// GET /api/products - Get all products with filters, search & pagination
router.get('/', async (req, res, next) => {
  try {
    const { category, collection, minPrice, maxPrice, search, sort, page = 1, limit = 12 } = req.query;
    const query = { isPublished: true };

    if (category) query.category = category;
    if (collection) query.collectionGender = collection;
    if (minPrice || maxPrice) {
      query.regularPrice = {};
      if (minPrice) query.regularPrice.$gte = Number(minPrice);
      if (maxPrice) query.regularPrice.$lte = Number(maxPrice);
    }
    if (search) {
      query.$text = { $search: search };
    }

    const sortOption = {};
    if (sort === 'price-low') sortOption.regularPrice = 1;
    else if (sort === 'price-high') sortOption.regularPrice = -1;
    else if (sort === 'rating') sortOption.averageRating = -1;
    else sortOption.createdAt = -1;

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Product.countDocuments(query);
    const products = await Product.find(query)
      .sort(sortOption)
      .skip(skip)
      .limit(Number(limit))
      .populate('category', 'name slug');

    res.json({
      success: true,
      count: products.length,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      data: products,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/products/:slug - Get single product by slug
router.get('/:slug', async (req, res, next) => {
  try {
    const product = await Product.findOne({ slug: req.params.slug, isPublished: true })
      .populate('category', 'name slug');

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
});

// POST /api/products - Create product (Admin / Inventory Manager only)
router.post('/', protect, authorize('admin', 'superadmin', 'inventory_manager'), async (req, res, next) => {
  try {
    const newProduct = await Product.create(req.body);
    res.status(201).json({ success: true, data: newProduct });
  } catch (err) {
    next(err);
  }
});

export default router;
