import mongoose from 'mongoose';
import Product from '../models/Product.js';
import ProductSubscription from '../models/ProductSubscription.js';
import { listLatestProducts } from '../services/productService.js';

const httpError = (m, s) => Object.assign(new Error(m), { status: s });

// GET /products/latest — real published products ordered by actual publication date
export const getLatestProducts = async (req, res, next) => {
  try {
    const products = await listLatestProducts({ limit: req.query.limit, category: req.query.category });
    res.json({ success: true, data: { products } });
  } catch (err) {
    next(err);
  }
};

export const subscribeToProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const type = req.body?.type || 'back_in_stock';
    const product = await Product.findOne({ _id: id, isPublished: true }).select('_id');
    if (!product) throw httpError('Product not found.', 404);
    // Subscriptions always belong to the authenticated user; the unique index prevents duplicates.
    const r = await ProductSubscription.updateOne(
      { user: req.user._id, product: product._id, type },
      { $setOnInsert: { user: req.user._id, product: product._id, type } },
      { upsert: true }
    );
    res.status(r.upsertedCount ? 201 : 200).json({ success: true, data: { subscribed: true, type, created: !!r.upsertedCount } });
  } catch (err) {
    next(err);
  }
};

export const unsubscribeFromProduct = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) throw httpError('Product not found.', 404);
    const type = req.body?.type || req.query.type || 'back_in_stock';
    await ProductSubscription.deleteOne({ user: req.user._id, product: req.params.id, type });
    res.json({ success: true, data: { subscribed: false, type } });
  } catch (err) {
    next(err);
  }
};

export const getMyProductSubscriptions = async (req, res, next) => {
  try {
    const subs = await ProductSubscription.find({ user: req.user._id }).select('product type createdAt').lean();
    res.json({ success: true, data: { subscriptions: subs } });
  } catch (err) {
    next(err);
  }
};
