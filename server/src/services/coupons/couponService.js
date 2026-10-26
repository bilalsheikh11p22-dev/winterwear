import mongoose from 'mongoose';
import Coupon from '../../models/Coupon.js';
import CouponRedemption from '../../models/CouponRedemption.js';
import Order from '../../models/Order.js';

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const COUNTING_ORDER_EXCLUDED = ['cancelled', 'failed', 'pending_payment', 'checkout_pending'];
const fmt = (n) => Number(n).toLocaleString('en-PK');

export class CouponError extends Error {
  constructor(reason, message, status = 400) {
    super(message);
    this.name = 'CouponError';
    this.code = `COUPON_${reason}`;
    this.reason = reason;
    this.status = status;
  }
}

const reject = (reason, message) => ({ valid: false, reason, message });

export const priorOrderCount = (userId, excludeOrderId = null) =>
  Order.countDocuments({
    customer: userId,
    orderStatus: { $nin: COUNTING_ORDER_EXCLUDED },
    ...(excludeOrderId ? { _id: { $ne: excludeOrderId } } : {}),
  });

const activeUseCount = (couponId, userId) =>
  CouponRedemption.countDocuments({ coupon: couponId, user: userId, active: true });

/**
 * Pure-ish validation + calculation. Never mutates anything, so a PREVIEW never consumes a coupon.
 * `lines` MUST be server-priced: [{ productId, categoryId, price, quantity, onSale }]
 */
export const evaluateCoupon = async ({ code, userId = null, lines, shippingFee = 0, excludeOrderId = null, now = new Date() }) => {
  const clean = String(code || '').trim().toUpperCase();
  if (!clean) return reject('NOT_FOUND', 'Enter a coupon code.');

  const coupon = await Coupon.findOne({ code: clean });
  if (!coupon) return reject('NOT_FOUND', `Coupon "${clean}" does not exist.`);
  if (!coupon.isActive) return reject('DISABLED', `Coupon "${clean}" is no longer active.`);
  if (coupon.validFrom > now) return reject('SCHEDULED', `Coupon "${clean}" is not valid yet. It starts on ${coupon.validFrom.toDateString()}.`);
  if (coupon.validUntil < now) return reject('EXPIRED', `Coupon "${clean}" expired on ${coupon.validUntil.toDateString()}.`);
  if (coupon.maxUsageCount != null && coupon.currentUsageCount + coupon.reservedCount >= coupon.maxUsageCount) {
    return reject('EXHAUSTED', `Coupon "${clean}" has reached its redemption limit.`);
  }

  const subtotal = round2(lines.reduce((s, l) => s + l.price * l.quantity, 0));
  if (subtotal < coupon.minOrderAmount) {
    return reject('MIN_ORDER', `Add PKR ${fmt(round2(coupon.minOrderAmount - subtotal))} more to use "${clean}" (minimum order PKR ${fmt(coupon.minOrderAmount)}).`);
  }

  // Customer-specific rules require a signed-in customer.
  const needsUser = coupon.customerSegment !== 'all' || coupon.firstOrderOnly || coupon.perCustomerLimit > 0;
  if (needsUser && !userId) return reject('LOGIN_REQUIRED', 'Sign in to use this coupon.');

  if (userId) {
    if ((await activeUseCount(coupon._id, userId)) >= coupon.perCustomerLimit) {
      return reject('CUSTOMER_LIMIT', `You have already used "${clean}" the maximum number of times.`);
    }
    if (coupon.customerSegment === 'specific' && !coupon.eligibleCustomers.some((id) => String(id) === String(userId))) {
      return reject('SEGMENT', `Coupon "${clean}" is not available for your account.`);
    }
    if (coupon.firstOrderOnly || coupon.customerSegment === 'new_customers' || coupon.customerSegment === 'returning_customers') {
      const prior = await priorOrderCount(userId, excludeOrderId);
      if (coupon.firstOrderOnly && prior > 0) return reject('FIRST_ORDER_ONLY', `Coupon "${clean}" is only valid on a first order.`);
      if (coupon.customerSegment === 'new_customers' && prior > 0) return reject('SEGMENT', `Coupon "${clean}" is for new customers only.`);
      if (coupon.customerSegment === 'returning_customers' && prior === 0) return reject('SEGMENT', `Coupon "${clean}" is for returning customers only.`);
    }
  }

  // Item eligibility
  const prodSet = new Set(coupon.eligibleProducts.map(String));
  const catSet = new Set(coupon.applicableCategories.map(String));
  const restricted = prodSet.size > 0 || catSet.size > 0;
  const eligibleLines = lines.filter((l) => {
    if (coupon.excludeSaleItems && l.onSale) return false;
    if (!restricted) return true;
    return prodSet.has(String(l.productId)) || (l.categoryId && catSet.has(String(l.categoryId)));
  });
  const eligibleSubtotal = round2(eligibleLines.reduce((s, l) => s + l.price * l.quantity, 0));

  if (coupon.discountType !== 'free_shipping' && eligibleSubtotal <= 0) {
    return reject(
      'NOT_ELIGIBLE_ITEMS',
      coupon.excludeSaleItems && !restricted
        ? `Coupon "${clean}" does not apply to sale items, and every item in your cart is on sale.`
        : `None of the items in your cart are eligible for "${clean}".`
    );
  }

  let discountAmount = 0;
  let freeShipping = false;
  if (coupon.discountType === 'percentage') {
    discountAmount = (eligibleSubtotal * coupon.discountValue) / 100;
    if (coupon.maxDiscountAmount) discountAmount = Math.min(discountAmount, coupon.maxDiscountAmount);
  } else if (coupon.discountType === 'fixed_amount') {
    discountAmount = Math.min(coupon.discountValue, eligibleSubtotal);
  } else {
    freeShipping = true;
    if (!shippingFee) return reject('NOT_ELIGIBLE_ITEMS', 'Your order already qualifies for free shipping.');
  }
  discountAmount = round2(Math.min(discountAmount, eligibleSubtotal)); // hard ceiling

  return { valid: true, coupon, discountAmount, freeShipping, subtotal, eligibleSubtotal, shippingDiscount: freeShipping ? shippingFee : 0 };
};

export const describeCoupon = (c) => {
  if (c.discountType === 'percentage') return `${c.discountValue}% off${c.maxDiscountAmount ? ` (up to PKR ${fmt(c.maxDiscountAmount)})` : ''}`;
  if (c.discountType === 'fixed_amount') return `PKR ${fmt(c.discountValue)} off`;
  return 'Free shipping';
};

// ── Reservation lifecycle (atomic) ───────────────────────────────────────────────────────
export const newOrderId = () => new mongoose.Types.ObjectId();

/**
 * Atomically claim: (1) one unit of global capacity, (2) one per-customer slot.
 * Both claims are single-document atomic operations, so concurrent checkouts cannot exceed either limit.
 */
export const reserveCoupon = async ({ coupon, userId, orderId, discountAmount, freeShipping = false, orderTotal = 0 }) => {
  const now = new Date();
  const cap = await Coupon.findOneAndUpdate(
    {
      _id: coupon._id,
      isActive: true,
      validFrom: { $lte: now },
      validUntil: { $gte: now },
      $or: [{ maxUsageCount: null }, { $expr: { $lt: [{ $add: ['$currentUsageCount', '$reservedCount'] }, '$maxUsageCount'] } }],
    },
    { $inc: { reservedCount: 1 } },
    { new: true }
  );
  if (!cap) throw new CouponError('EXHAUSTED', `Coupon "${coupon.code}" is no longer available.`, 409);

  const rollback = () => Coupon.updateOne({ _id: coupon._id, reservedCount: { $gt: 0 } }, { $inc: { reservedCount: -1 } });

  for (let slot = 1; slot <= cap.perCustomerLimit; slot += 1) {
    try {
      const redemption = await CouponRedemption.create({
        coupon: coupon._id, couponCode: cap.code, user: userId, order: orderId, slot,
        discountAmount, freeShipping, orderTotal,
      });
      return redemption;
    } catch (err) {
      if (err.code !== 11000) { await rollback(); throw err; }
      if (err.keyPattern?.order) { // same order retried → idempotent
        await rollback();
        return CouponRedemption.findOne({ order: orderId });
      }
      // slot taken by a parallel/earlier redemption → try the next slot
    }
  }
  await rollback();
  throw new CouponError('CUSTOMER_LIMIT', `You have already used "${coupon.code}" the maximum number of times.`, 409);
};

/** reserved → redeemed (payment verified, or COD order confirmed). Idempotent. */
export const redeemForOrder = async (orderId, orderTotal) => {
  const r = await CouponRedemption.findOneAndUpdate(
    { order: orderId, status: 'reserved' },
    { $set: { status: 'redeemed', redeemedAt: new Date(), ...(orderTotal != null ? { orderTotal } : {}) } },
    { new: true }
  );
  if (r) await Coupon.updateOne({ _id: r.coupon }, { $inc: { reservedCount: -1, currentUsageCount: 1 } });
  return r;
};

/** reserved|redeemed → released (order failed / cancelled / expired). Frees both capacity and the customer slot. */
export const releaseForOrder = async (orderId, reason = 'order_closed') => {
  const r = await CouponRedemption.findOneAndUpdate(
    { order: orderId, status: { $in: ['reserved', 'redeemed'] } },
    { $set: { status: 'released', active: false, releasedAt: new Date(), releaseReason: reason } },
    { new: false } // we need the PRE-update status to know which counter to give back
  );
  if (!r) return null;
  await Coupon.updateOne(
    { _id: r.coupon },
    r.status === 'reserved' ? { $inc: { reservedCount: -1 } } : { $inc: { currentUsageCount: -1 } }
  );
  return r;
};

// ── Customer-facing list ─────────────────────────────────────────────────────────────────
export const listAvailableForUser = async (userId) => {
  const now = new Date();
  const coupons = await Coupon.find({
    isActive: true,
    validFrom: { $lte: now },
    validUntil: { $gte: now },
    $or: [{ visibility: 'public', customerSegment: { $ne: 'specific' } }, { customerSegment: 'specific', eligibleCustomers: userId }],
  }).sort({ validUntil: 1 }).limit(50);

  const prior = await priorOrderCount(userId);
  const mine = await CouponRedemption.aggregate([
    { $match: { user: new mongoose.Types.ObjectId(String(userId)), active: true, coupon: { $in: coupons.map((c) => c._id) } } },
    { $group: { _id: '$coupon', n: { $sum: 1 }, redeemed: { $sum: { $cond: [{ $eq: ['$status', 'redeemed'] }, 1, 0] } } } },
  ]);
  const usage = new Map(mine.map((m) => [String(m._id), m]));

  const out = [];
  for (const c of coupons) {
    const u = usage.get(String(c._id)) || { n: 0, redeemed: 0 };
    let eligible = true;
    let reason = '';
    if (c.maxUsageCount != null && c.currentUsageCount + c.reservedCount >= c.maxUsageCount) { eligible = false; reason = 'Fully redeemed'; }
    else if (u.n >= c.perCustomerLimit) { eligible = false; reason = u.redeemed ? 'Already redeemed' : 'In use on a pending order'; }
    else if (c.firstOrderOnly && prior > 0) { eligible = false; reason = 'First order only'; }
    else if (c.customerSegment === 'new_customers' && prior > 0) { eligible = false; reason = 'New customers only'; }
    else if (c.customerSegment === 'returning_customers' && prior === 0) { eligible = false; reason = 'Returning customers only'; }

    out.push({
      _id: String(c._id),
      code: c.code,
      name: c.name,
      description: c.description || describeCoupon(c),
      discountType: c.discountType,
      discountValue: c.discountValue,
      summary: describeCoupon(c),
      minOrderAmount: c.minOrderAmount,
      maxDiscountAmount: c.maxDiscountAmount,
      validUntil: c.validUntil,
      excludeSaleItems: c.excludeSaleItems,
      firstOrderOnly: c.firstOrderOnly,
      restrictedToItems: c.eligibleProducts.length + c.applicableCategories.length > 0,
      perCustomerLimit: c.perCustomerLimit,
      myUses: u.n,
      redeemedByMe: u.redeemed > 0,
      eligible,
      ineligibleReason: reason,
    });
  }
  return out;
};

// ── Admin analytics ─────────────────────────────────────────────────────────────────────
export const couponAnalytics = async (couponId) => {
  const id = new mongoose.Types.ObjectId(String(couponId));
  const [coupon, byStatus, daily] = await Promise.all([
    Coupon.findById(id),
    CouponRedemption.aggregate([
      { $match: { coupon: id } },
      { $group: { _id: '$status', count: { $sum: 1 }, discount: { $sum: '$discountAmount' }, sales: { $sum: '$orderTotal' }, customers: { $addToSet: '$user' } } },
    ]),
    CouponRedemption.aggregate([
      { $match: { coupon: id, status: 'redeemed', redeemedAt: { $gte: new Date(Date.now() - 30 * 86400000) } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$redeemedAt' } }, redemptions: { $sum: 1 }, sales: { $sum: '$orderTotal' } } },
      { $sort: { _id: 1 } },
    ]),
  ]);
  if (!coupon) return null;
  const get = (s) => byStatus.find((x) => x._id === s) || { count: 0, discount: 0, sales: 0, customers: [] };
  const redeemed = get('redeemed');
  return {
    code: coupon.code,
    status: coupon.status,
    redemptions: redeemed.count,
    reserved: get('reserved').count,
    released: get('released').count,
    remaining: coupon.maxUsageCount == null ? null : Math.max(0, coupon.maxUsageCount - coupon.currentUsageCount - coupon.reservedCount),
    totalDiscountGiven: round2(redeemed.discount),
    // Attribution rule: an order is attributed to a coupon when that coupon was redeemed on it (last-touch on code use).
    couponAttributedSales: round2(redeemed.sales),
    uniqueCustomers: redeemed.customers.length,
    averageOrderValue: redeemed.count ? round2(redeemed.sales / redeemed.count) : 0,
    last30Days: daily.map((d) => ({ date: d._id, redemptions: d.redemptions, sales: round2(d.sales) })),
  };
};
