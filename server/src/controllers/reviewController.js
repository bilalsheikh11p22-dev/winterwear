import Review from '../models/Review.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';

export const createReview = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { productId, rating, title, comment, fitFeedback, images } = req.body;

    // Check if user already reviewed this product
    const existingReview = await Review.findOne({ product: productId, user: userId });
    if (existingReview) {
      const error = new Error('You have already submitted a review for this piece.');
      error.status = 400;
      throw error;
    }

    // Check if user has a verified delivered order with this product
    const verifiedOrder = await Order.findOne({
      customer: userId,
      orderStatus: 'delivered',
      'items.product': productId,
    });

    const isVerifiedPurchase = Boolean(verifiedOrder);

    const review = await Review.create({
      product: productId,
      user: userId,
      order: verifiedOrder?._id || null,
      isVerifiedPurchase,
      rating,
      title,
      comment,
      fitFeedback: fitFeedback || 'True to Size',
      images: images || [],
      status: 'approved', // auto-approve verified, or approved by default for active storefront
    });

    // Update Product average rating and total reviews
    const stats = await Review.aggregate([
      { $match: { product: review.product, status: 'approved' } },
      {
        $group: {
          _id: null,
          avgRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 },
        },
      },
    ]);

    if (stats.length > 0) {
      await Product.findByIdAndUpdate(productId, {
        rating: Math.round(stats[0].avgRating * 10) / 10,
        numReviews: stats[0].totalReviews,
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Review submitted successfully',
      data: review,
    });
  } catch (error) {
    next(error);
  }
};

export const getProductReviews = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;

    const query = { product: productId, status: 'approved' };

    const total = await Review.countDocuments(query);
    const reviews = await Review.find(query)
      .populate('user', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return res.status(200).json({
      success: true,
      message: 'Reviews retrieved',
      data: reviews,
      meta: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const moderateReview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['pending', 'approved', 'rejected'].includes(status)) {
      const error = new Error('Invalid status. Use pending, approved, or rejected.');
      error.status = 400;
      throw error;
    }

    const review = await Review.findByIdAndUpdate(id, { status }, { new: true });
    if (!review) {
      const error = new Error('Review not found');
      error.status = 404;
      throw error;
    }

    return res.status(200).json({
      success: true,
      message: `Review moderation status updated to ${status}`,
      data: review,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteReview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const review = await Review.findByIdAndDelete(id);

    if (!review) {
      const error = new Error('Review not found');
      error.status = 404;
      throw error;
    }

    return res.status(200).json({
      success: true,
      message: 'Review deleted',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};
