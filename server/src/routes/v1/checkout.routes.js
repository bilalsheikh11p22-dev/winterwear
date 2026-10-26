import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { apiLimiter, checkoutLimiter } from '../../middleware/rateLimiter.js';
import Product from '../../models/Product.js';
import Coupon from '../../models/Coupon.js';
import { checkout } from '../../controllers/orderController.js';
import { validate } from '../../middleware/validate.js';
import { checkoutSchema } from '../../validators/orderValidators.js';

const router = Router();

// POST /api/v1/checkout/validate (Calculate and validate prices, stock, discounts, and shipping)
router.post('/validate', authenticate, apiLimiter, async (req, res, next) => {
  try {
    const { items, couponCode, shippingAddress } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No items provided for validation.',
      });
    }

    let subtotal = 0;
    const validatedItems = [];
    const errors = [];

    for (const item of items) {
      const product = await Product.findById(item.productId || item.product || item.id);
      if (!product || !product.isPublished) {
        errors.push(`Item '${item.name || 'Unknown'}' is no longer available.`);
        continue;
      }

      if (product.stockQuantity < item.quantity) {
        errors.push(`Only ${product.stockQuantity} units available for '${product.name}'.`);
      }

      const verifiedPrice = product.salePrice ?? product.regularPrice;
      const lineTotal = verifiedPrice * item.quantity;
      subtotal += lineTotal;

      validatedItems.push({
        productId: product._id,
        name: product.name,
        slug: product.slug,
        image: product.images[0]?.url || item.image || '',
        sku: item.sku || product.sku,
        size: item.size,
        color: item.color,
        price: verifiedPrice,
        regularPrice: product.regularPrice,
        salePrice: product.salePrice,
        quantity: item.quantity,
        maxStock: product.stockQuantity,
        lineTotal,
      });
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cart validation errors occurred.',
        data: {
          errors,
          items: validatedItems,
        },
      });
    }

    // Server-side coupon verification
    let discountAmount = 0;
    let appliedCoupon = null;

    if (couponCode) {
      const cleanCode = couponCode.trim().toUpperCase();
      const coupon = await Coupon.findOne({
        code: cleanCode,
        isActive: true,
        validFrom: { $lte: new Date() },
        validUntil: { $gte: new Date() },
      });

      if (coupon) {
        if (coupon.minOrderAmount <= subtotal) {
          if (coupon.discountType === 'percentage') {
            discountAmount = (subtotal * coupon.discountValue) / 100;
            if (coupon.maxDiscountAmount) {
              discountAmount = Math.min(discountAmount, coupon.maxDiscountAmount);
            }
          } else {
            discountAmount = Math.min(coupon.discountValue, subtotal);
          }
          appliedCoupon = {
            code: coupon.code,
            discountType: coupon.discountType,
            discountValue: coupon.discountValue,
            discountAmount,
          };
        } else {
          errors.push(`Minimum order of PKR ${coupon.minOrderAmount.toLocaleString()} required for code ${cleanCode}`);
        }
      } else {
        errors.push(`Coupon '${cleanCode}' is invalid or expired.`);
      }
    }

    // Server-side shipping calculation in PKR
    const freeShippingThreshold = Number(process.env.FREE_SHIPPING_THRESHOLD_PKR) || 5000;
    const flatShippingFee = Number(process.env.FLAT_SHIPPING_FEE_PKR) || 250;
    const shippingFee = subtotal >= freeShippingThreshold ? 0 : flatShippingFee;
    const totalAmount = Math.max(0, subtotal - discountAmount + shippingFee);

    return res.status(200).json({
      success: true,
      message: 'Cart and pricing validated successfully',
      data: {
        items: validatedItems,
        subtotal,
        discountAmount,
        appliedCoupon,
        shippingFee,
        freeShippingThreshold,
        taxAmount: 0,
        totalAmount,
        currency: process.env.DEFAULT_CURRENCY || 'PKR',
        isEligibleForCod: process.env.ENABLE_CASH_ON_DELIVERY !== 'false',
        errors: errors.length > 0 ? errors : undefined,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/checkout/create-order (Authenticated order creation)
router.post(
  '/create-order',
  authenticate,
  checkoutLimiter,
  validate(checkoutSchema),
  checkout
);

export default router;
