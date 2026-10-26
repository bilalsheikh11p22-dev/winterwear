import mongoose from 'mongoose';
import Coupon from '../models/Coupon.js';
import CouponRedemption from '../models/CouponRedemption.js';
import Product from '../models/Product.js';
import { logAuditEvent } from '../services/auditService.js';
import { evaluateCoupon, listAvailableForUser, couponAnalytics, describeCoupon } from '../services/coupons/couponService.js';

const httpError = (message, status = 400, code) => Object.assign(new Error(message), { status, ...(code ? { code } : {}) });
const audit = (req, action, target, details = {}) =>
  logAuditEvent({
    actorId: req.user._id, actorEmail: req.user.email, actorRole: req.user.role, action,
    targetModel: 'Coupon', targetId: target, details, ipAddress: req.ip,
  });

const shippingFeeFor = (subtotal) => {
  const threshold = Number(process.env.FREE_SHIPPING_THRESHOLD_PKR) || 5000;
  return subtotal >= threshold ? 0 : Number(process.env.FLAT_SHIPPING_FEE_PKR) || 250;
};

// ── Customer ───────────────────────────────────────────────────────────────────────────
/**
 * POST /coupons/validate — PREVIEW ONLY. Prices come from MongoDB, never from the request,
 * and nothing is reserved or consumed. Redemption happens during checkout.
 */
export const validateCoupon = async (req, res, next) => {
  try {
    const { code, items, subtotal: legacySubtotal } = req.body;
    let lines;

    if (items) {
      const products = await Product.find({ _id: { $in: items.map((i) => i.productId) }, isPublished: true });
      const byId = new Map(products.map((p) => [String(p._id), p]));
      lines = items.map((i) => {
        const p = byId.get(String(i.productId));
        if (!p) throw httpError('An item in your cart is no longer available.', 400, 'PRODUCT_UNAVAILABLE');
        return {
          productId: p._id, categoryId: p.category, price: p.salePrice ?? p.regularPrice, quantity: i.quantity,
          onSale: p.salePrice != null && p.salePrice < p.regularPrice,
        };
      });
    } else {
      lines = [{ productId: null, categoryId: null, price: legacySubtotal, quantity: 1, onSale: false }];
    }

    const subtotal = lines.reduce((s, l) => s + l.price * l.quantity, 0);
    const result = await evaluateCoupon({ code, userId: req.user?._id || null, lines, shippingFee: shippingFeeFor(subtotal) });

    if (!result.valid) {
      return res.status(400).json({ success: false, message: result.message, code: `COUPON_${result.reason}`, reason: result.reason });
    }
    const c = result.coupon;
    return res.json({
      success: true,
      message: `Coupon applied: ${describeCoupon(c)}.`,
      data: {
        code: c.code,
        discountType: c.discountType,
        discountValue: c.discountValue,
        discountAmount: result.discountAmount,
        freeShipping: result.freeShipping,
        shippingDiscount: result.shippingDiscount,
        eligibleSubtotal: result.eligibleSubtotal,
        expiresAt: c.validUntil,
        preview: true,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getAvailableCoupons = async (req, res, next) => {
  try {
    res.json({ success: true, data: { coupons: await listAvailableForUser(req.user._id) } });
  } catch (err) {
    next(err);
  }
};

// ── Admin ──────────────────────────────────────────────────────────────────────────────
const statusQuery = (status, now = new Date()) => {
  switch (status) {
    case 'disabled': return { isActive: false };
    case 'expired': return { isActive: true, validUntil: { $lt: now } };
    case 'scheduled': return { isActive: true, validFrom: { $gt: now } };
    case 'exhausted': return { isActive: true, maxUsageCount: { $ne: null }, $expr: { $gte: [{ $add: ['$currentUsageCount', '$reservedCount'] }, '$maxUsageCount'] } };
    case 'active':
      return {
        isActive: true, validFrom: { $lte: now }, validUntil: { $gte: now },
        $or: [{ maxUsageCount: null }, { $expr: { $lt: [{ $add: ['$currentUsageCount', '$reservedCount'] }, '$maxUsageCount'] } }],
      };
    default: return {};
  }
};

export const listCoupons = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, parseInt(req.query.limit, 10) || 25);
    const q = { ...statusQuery(req.query.status) };
    if (req.query.search) q.code = new RegExp(`^${String(req.query.search).replace(/[^A-Za-z0-9_-]/g, '')}`, 'i');
    const [coupons, total] = await Promise.all([
      Coupon.find(q).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      Coupon.countDocuments(q),
    ]);
    res.json({ success: true, data: { coupons, total, page, pages: Math.max(1, Math.ceil(total / limit)) } });
  } catch (err) {
    next(err);
  }
};

export const getCoupon = async (req, res, next) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) throw httpError('Coupon not found.', 404);
    res.json({ success: true, data: { coupon } });
  } catch (err) {
    next(err);
  }
};

export const createCoupon = async (req, res, next) => {
  try {
    const coupon = await Coupon.create({ ...req.body, createdBy: req.user._id });
    await audit(req, 'COUPON_CREATED', coupon._id, { code: coupon.code });
    res.status(201).json({ success: true, message: 'Coupon created.', data: { coupon } });
  } catch (err) {
    if (err.code === 11000) return next(httpError('A coupon with this code already exists.', 409, 'COUPON_CODE_EXISTS'));
    return next(err);
  }
};

export const updateCoupon = async (req, res, next) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) throw httpError('Coupon not found.', 404);

    const used = await CouponRedemption.exists({ coupon: coupon._id });
    if (used && req.body.code && req.body.code !== coupon.code) throw httpError('The code of a coupon that has been used cannot be changed.', 409);
    if (used && (req.body.discountType || req.body.discountValue !== undefined)) {
      throw httpError('Discount terms cannot be changed after the coupon has been used. Create a new coupon instead.', 409, 'COUPON_TERMS_LOCKED');
    }
    if (req.body.maxUsageCount != null && req.body.maxUsageCount < coupon.currentUsageCount + coupon.reservedCount) {
      throw httpError('The usage limit cannot be lower than the number of redemptions already made or reserved.', 409);
    }

    coupon.set(req.body);
    await coupon.save();
    await audit(req, 'COUPON_UPDATED', coupon._id, { fields: Object.keys(req.body) });
    res.json({ success: true, message: 'Coupon updated.', data: { coupon } });
  } catch (err) {
    if (err.code === 11000) return next(httpError('A coupon with this code already exists.', 409, 'COUPON_CODE_EXISTS'));
    return next(err);
  }
};

export const setCouponStatus = async (req, res, next) => {
  try {
    const coupon = await Coupon.findByIdAndUpdate(req.params.id, { $set: { isActive: req.body.isActive } }, { new: true });
    if (!coupon) throw httpError('Coupon not found.', 404);
    await audit(req, req.body.isActive ? 'COUPON_ACTIVATED' : 'COUPON_DEACTIVATED', coupon._id, { code: coupon.code });
    res.json({ success: true, message: req.body.isActive ? 'Coupon activated.' : 'Coupon deactivated.', data: { coupon } });
  } catch (err) {
    next(err);
  }
};

/** Legacy DELETE: hard-delete only when the coupon was never used; otherwise it is deactivated. */
export const deleteCoupon = async (req, res, next) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) throw httpError('Coupon not found.', 404);
    if (await CouponRedemption.exists({ coupon: coupon._id })) {
      coupon.isActive = false;
      await coupon.save();
      await audit(req, 'COUPON_DEACTIVATED', coupon._id, { reason: 'delete_requested_but_used' });
      return res.json({ success: true, message: 'This coupon has redemptions, so it was deactivated instead of deleted.', data: { coupon } });
    }
    await coupon.deleteOne();
    await audit(req, 'COUPON_DELETED', coupon._id, { code: coupon.code });
    return res.json({ success: true, message: 'Coupon deleted.' });
  } catch (err) {
    return next(err);
  }
};

export const getCouponAnalytics = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) throw httpError('Coupon not found.', 404);
    const data = await couponAnalytics(req.params.id);
    if (!data) throw httpError('Coupon not found.', 404);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
