import Wishlist from '../models/Wishlist.js';
import Product from '../models/Product.js';

export const getWishlist = async (req, res, next) => {
  try {
    const userId = req.user._id;

    let wishlist = await Wishlist.findOne({ user: userId }).populate({
      path: 'products',
      select: 'name slug images regularPrice salePrice stockQuantity isPublished category tags',
    });

    if (!wishlist) {
      wishlist = await Wishlist.create({ user: userId, products: [] });
    }

    return res.status(200).json({
      success: true,
      message: 'Wishlist retrieved successfully',
      data: wishlist,
    });
  } catch (error) {
    next(error);
  }
};

export const addItem = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { productId } = req.body;

    if (!productId) {
      const error = new Error('Product ID is required');
      error.status = 400;
      throw error;
    }

    const product = await Product.findById(productId);
    if (!product || !product.isPublished) {
      const error = new Error('Product not found or unavailable');
      error.status = 404;
      throw error;
    }

    let wishlist = await Wishlist.findOneAndUpdate(
      { user: userId },
      { $addToSet: { products: productId } },
      { new: true, upsert: true }
    ).populate({
      path: 'products',
      select: 'name slug images regularPrice salePrice stockQuantity isPublished category tags',
    });

    return res.status(200).json({
      success: true,
      message: 'Product added to wishlist',
      data: wishlist,
    });
  } catch (error) {
    next(error);
  }
};

export const removeItem = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { productId } = req.params;

    const wishlist = await Wishlist.findOneAndUpdate(
      { user: userId },
      { $pull: { products: productId } },
      { new: true }
    ).populate({
      path: 'products',
      select: 'name slug images regularPrice salePrice stockQuantity isPublished category tags',
    });

    return res.status(200).json({
      success: true,
      message: 'Product removed from wishlist',
      data: wishlist || { products: [] },
    });
  } catch (error) {
    next(error);
  }
};
