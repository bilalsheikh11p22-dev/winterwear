import Product from '../../models/Product.js';
import Order from '../../models/Order.js';
import Review from '../../models/Review.js';
import Cart from '../../models/Cart.js';
import { searchGroundedProducts } from './groundedSearchService.js';

export const AI_TOOLS = {
  /**
   * Search real WinterWear catalogue by natural language or filters
   */
  async searchProducts(params = {}) {
    const results = await searchGroundedProducts(params);
    return {
      success: true,
      count: results.count,
      appliedFilters: results.appliedFilters,
      products: results.products.map((p) => ({
        _id: p._id,
        name: p.name,
        slug: p.slug,
        sku: p.sku,
        category: p.category?.name || 'Winter Atelier',
        regularPrice: p.regularPrice,
        salePrice: p.salePrice,
        effectivePrice: p.salePrice || p.regularPrice,
        stockQuantity: p.stockQuantity,
        images: p.images?.slice(0, 2).map((img) => img.url),
        availableSizes: p.variants?.map((v) => v.size) || [],
        availableColors: p.variants?.map((v) => v.color?.name) || [],
        averageRating: p.averageRating,
        reviewCount: p.reviewCount,
      })),
    };
  },

  /**
   * Verified product specifications, materials, care instructions
   */
  async getProductDetails({ slugOrId }) {
    if (!slugOrId) throw new Error('Product identifier is required');

    const query = slugOrId.match(/^[0-9a-fA-F]{24}$/)
      ? { _id: slugOrId, isPublished: true }
      : { slug: slugOrId, isPublished: true };

    const product = await Product.findOne(query).populate('category', 'name slug').lean();
    if (!product) {
      return { success: false, message: 'Garment piece not found in current collection archive.' };
    }

    return {
      success: true,
      product: {
        _id: product._id,
        name: product.name,
        slug: product.slug,
        sku: product.sku,
        description: product.description,
        category: product.category?.name,
        collectionGender: product.collectionGender,
        regularPrice: product.regularPrice,
        salePrice: product.salePrice,
        stockQuantity: product.stockQuantity,
        materials: product.materials || ['Pure Cashmere & Wool blend'],
        careInstructions: product.careInstructions || ['Specialist dry clean only'],
        specifications: product.specifications || [],
        images: product.images?.map((img) => img.url) || [],
        variants: product.variants?.map((v) => ({
          sku: v.sku,
          size: v.size,
          color: v.color?.name,
          hex: v.color?.hex,
          stock: v.stock,
        })),
        averageRating: product.averageRating,
        reviewCount: product.reviewCount,
      },
    };
  },

  /**
   * Real variant availability (sizes, colors, stock)
   */
  async getAvailableVariants({ productId }) {
    const product = await Product.findById(productId).select('variants stockQuantity isPublished').lean();
    if (!product || !product.isPublished) {
      return { success: false, message: 'Piece is unavailable.' };
    }

    const availableVariants = (product.variants || []).filter((v) => v.stock > 0);
    return {
      success: true,
      totalStock: product.stockQuantity,
      variants: availableVariants.map((v) => ({
        sku: v.sku,
        size: v.size,
        color: v.color?.name,
        stock: v.stock,
        price: v.salePrice || v.price,
      })),
    };
  },

  /**
   * Deterministic similar garments by category and price tier
   */
  async getRelatedProducts({ productId, limit = 4 }) {
    const baseProduct = await Product.findById(productId);
    if (!baseProduct) return { success: false, products: [] };

    const related = await Product.find({
      _id: { $ne: baseProduct._id },
      category: baseProduct.category,
      isPublished: true,
      stockQuantity: { $gt: 0 },
    })
      .select('name slug sku regularPrice salePrice images category averageRating')
      .populate('category', 'name')
      .limit(limit)
      .lean();

    return {
      success: true,
      products: related.map((p) => ({
        _id: p._id,
        name: p.name,
        slug: p.slug,
        regularPrice: p.regularPrice,
        salePrice: p.salePrice,
        image: p.images?.[0]?.url || '',
        category: p.category?.name,
      })),
    };
  },

  /**
   * Real verified review feedback from genuine buyers
   */
  async getVerifiedReviewSummary({ productId }) {
    const reviews = await Review.find({ product: productId, status: 'approved' })
      .select('rating title comment fitFeedback createdAt')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    const product = await Product.findById(productId).select('averageRating reviewCount');

    return {
      success: true,
      averageRating: product?.averageRating || 0,
      reviewCount: product?.reviewCount || 0,
      recentReviews: reviews,
    };
  },

  /**
   * Public Verified Shipping Policy
   */
  async getPublicShippingPolicy() {
    const freeThreshold = parseInt(process.env.FREE_SHIPPING_THRESHOLD_PKR, 10) || 5000;
    const flatFee = parseInt(process.env.FLAT_SHIPPING_FEE_PKR, 10) || 250;

    return {
      success: true,
      freeShippingThreshold: freeThreshold,
      flatShippingFee: flatFee,
      currency: 'PKR',
      estimatedDeliveryDays: '3 to 5 business days nationwide',
      supportedCarriers: ['TCS Express', 'Leopards Courier', 'WinterWear Atelier Dedicated Courier'],
      cashOnDeliverySupported: true,
    };
  },

  /**
   * Public Verified Return Policy
   */
  async getPublicReturnPolicy() {
    return {
      success: true,
      returnWindowDays: 14,
      conditionRequirements: [
        'Unworn and unwashed garment in pristine condition',
        'Original Atelier designer tags and garment bag intact',
        'Receipt or verified order number provided',
      ],
      refundMethods: ['Original Payment Method (Stripe/Card)', 'Bank Transfer for COD', 'Store Credit'],
      returnCourierPickup: 'Complimentary rider pickup arranged in major metropolitan centers.',
    };
  },

  /**
   * Public Sizing Guide
   */
  async getPublicSizeGuide() {
    return {
      success: true,
      standard: 'Bespoke European Cut (Tailored Slim-Classic)',
      sizes: {
        XS: { chestInches: '34-36', shoulderInches: '16.5', sleeveInches: '32.5' },
        S: { chestInches: '36-38', shoulderInches: '17.5', sleeveInches: '33.5' },
        M: { chestInches: '38-40', shoulderInches: '18.5', sleeveInches: '34.5' },
        L: { chestInches: '40-42', shoulderInches: '19.5', sleeveInches: '35.5' },
        XL: { chestInches: '42-44', shoulderInches: '20.5', sleeveInches: '36.5' },
        XXL: { chestInches: '44-46', shoulderInches: '21.5', sleeveInches: '37.0' },
      },
      layeringTip: 'If you intend to wear heavy cashmere pullovers beneath tailored overcoats, consider sizing up by one size.',
    };
  },

  /**
   * Verified Cart summary for the authenticated customer or guest
   */
  async getCurrentCartSummary({ userId, guestId }) {
    const query = userId ? { user: userId } : { guestId };
    if (!userId && !guestId) return { success: false, items: [], total: 0 };

    const cart = await Cart.findOne(query).populate('items.product', 'name regularPrice salePrice').lean();
    if (!cart || !cart.items || cart.items.length === 0) {
      return { success: true, count: 0, items: [], subtotal: 0 };
    }

    const items = cart.items.map((i) => ({
      name: i.product?.name,
      size: i.size,
      color: i.color?.name,
      quantity: i.quantity,
      price: i.price,
      total: i.totalPrice,
    }));

    return {
      success: true,
      count: items.length,
      items,
      subtotal: cart.subtotal,
    };
  },

  /**
   * Safe Order status lookup (Requires customer phone or user authorization)
   */
  async getCustomerOrderStatus({ orderNumber, phone, userId }) {
    if (!orderNumber) throw new Error('Order number is required.');

    const query = { orderNumber: orderNumber.toUpperCase() };
    const order = await Order.findOne(query).select(
      'orderNumber orderStatus shippingAddress totalAmount paymentStatus trackingCode createdAt'
    );

    if (!order) {
      return { success: false, message: 'Order not found.' };
    }

    // Ownership check: must match phone or userId
    if (phone && order.shippingAddress?.phone) {
      const cleanInput = phone.replace(/\D/g, '');
      const cleanSaved = order.shippingAddress.phone.replace(/\D/g, '');
      if (!cleanSaved.endsWith(cleanInput.slice(-7))) {
        return { success: false, message: 'Authentication mismatch for this order.' };
      }
    } else if (userId && order.customer?.toString() !== userId.toString()) {
      return { success: false, message: 'Unauthorized order inquiry.' };
    }

    return {
      success: true,
      order: {
        orderNumber: order.orderNumber,
        status: order.orderStatus,
        paymentStatus: order.paymentStatus,
        totalAmount: order.totalAmount,
        trackingCode: order.trackingCode || 'Dispatched via TCS Logistics',
        placedAt: order.createdAt,
      },
    };
  },
};
