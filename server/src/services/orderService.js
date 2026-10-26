import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Warehouse from '../models/Warehouse.js';
import { reserveStock, releaseReservedStock, commitStockSale } from './inventoryService.js';
import {
  evaluateCoupon, reserveCoupon, redeemForOrder, releaseForOrder, newOrderId, CouponError,
} from './coupons/couponService.js';
import {
  publishOrderPlaced, publishOrderStatusChanged, publishCouponRejected, publishCouponApplied,
} from './notifications/events.js';

// Strict State Transition Map
const ALLOWED_ORDER_TRANSITIONS = {
  pending_payment: ['confirmed', 'failed', 'cancelled'],
  confirmed: ['processing', 'cancellation_requested', 'cancelled'],
  processing: ['packing', 'cancellation_requested', 'cancelled'],
  packing: ['ready_for_dispatch', 'cancelled'],
  ready_for_dispatch: ['assigned_to_rider', 'cancelled'],
  assigned_to_rider: ['picked_up', 'ready_for_dispatch', 'cancelled'],
  picked_up: ['out_for_delivery', 'returned_to_warehouse'],
  out_for_delivery: ['delivered', 'delivery_failed', 'rescheduled', 'returned_to_warehouse'],
  delivered: ['return_requested'],
  cancellation_requested: ['cancelled', 'processing'],
  cancelled: [],
  return_requested: ['returned', 'processing'],
  returned: ['refund_pending'],
  refund_pending: ['refunded'],
  refunded: [],
  failed: [],
};

export const createOrderFromCheckout = async ({
  userId,
  items,
  shippingAddress,
  paymentMethod,
  couponCode,
  deliveryNotes,
  idempotencyKey,
}) => {
  // Check for duplicate idempotent request
  if (idempotencyKey) {
    const existingOrder = await Order.findOne({
      $or: [{ idempotencyKey }, { 'paymentDetails.webhookPayloadRef': idempotencyKey }],
    });
    if (existingOrder && existingOrder.orderStatus === 'failed') {
      // A failed attempt (e.g. out of stock) must not be replayed as a success: free its key so a retry creates a new order.
      existingOrder.idempotencyKey = undefined;
      if (existingOrder.paymentDetails) existingOrder.paymentDetails.webhookPayloadRef = undefined;
      await existingOrder.save();
    } else if (existingOrder) {
      return existingOrder;
    }
  }

  if (!items || items.length === 0) {
    const error = new Error('No items provided for checkout.');
    error.status = 400;
    throw error;
  }

  // Find or use default central warehouse
  let warehouse = await Warehouse.findOne({ isActive: true });
  if (!warehouse) {
    warehouse = await Warehouse.create({
      name: 'Central Atelier Logistics Hub',
      code: 'WH-MAIN-01',
      location: { city: 'Lahore', address: 'Industrial Design Quarter, Gulberg III' },
    });
  }

  // Re-verify current prices and stock from MongoDB directly
  let subtotal = 0;
  const verifiedOrderItems = [];
  const couponLines = [];

  for (const requestedItem of items) {
    const product = await Product.findById(requestedItem.productId);
    if (!product || !product.isPublished) {
      const error = new Error(`Product '${requestedItem.name || 'Unknown'}' is unavailable.`);
      error.status = 400;
      throw error;
    }

    if (product.stockQuantity < requestedItem.quantity) {
      const error = new Error(`Insufficient stock for piece '${product.name}'. Only ${product.stockQuantity} remain.`);
      error.status = 400;
      throw error;
    }

    const verifiedPrice = product.salePrice ?? product.regularPrice;
    const itemTotal = verifiedPrice * requestedItem.quantity;
    subtotal += itemTotal;

    verifiedOrderItems.push({
      product: product._id,
      sku: product.sku,
      name: product.name,
      image: product.images[0]?.url || '',
      size: requestedItem.size,
      color: requestedItem.color,
      price: verifiedPrice,
      quantity: requestedItem.quantity,
      totalItemPrice: itemTotal,
    });
    couponLines.push({
      productId: product._id,
      categoryId: product.category,
      price: verifiedPrice,
      quantity: requestedItem.quantity,
      onSale: product.salePrice != null && product.salePrice < product.regularPrice,
    });
  }

  // Shipping (Complimentary on orders over threshold in PKR)
  const freeShippingThreshold = Number(process.env.FREE_SHIPPING_THRESHOLD_PKR) || 5000;
  const flatShippingFee = Number(process.env.FLAT_SHIPPING_FEE_PKR) || 250;
  let shippingFee = subtotal >= freeShippingThreshold ? 0 : flatShippingFee;

  // Pre-allocate the order id so the coupon can be reserved BEFORE the order is written,
  // which means a failed reservation never leaves an orphan order behind.
  const orderId = newOrderId();

  // Server-side coupon evaluation. The client never supplies a discount amount.
  let discountAmount = 0;
  let appliedCouponCode = '';
  let redemption = null;
  if (couponCode && String(couponCode).trim()) {
    const evaluation = await evaluateCoupon({ code: couponCode, userId, lines: couponLines, shippingFee, excludeOrderId: orderId });
    if (!evaluation.valid) {
      publishCouponRejected({ userId, code: String(couponCode).trim().toUpperCase(), reason: evaluation.reason, message: evaluation.message });
      const error = new Error(evaluation.message);
      error.status = 400;
      error.code = `COUPON_${evaluation.reason}`;
      throw error;
    }
    discountAmount = evaluation.discountAmount;
    if (evaluation.freeShipping) shippingFee = 0;
    appliedCouponCode = evaluation.coupon.code;
    try {
      redemption = await reserveCoupon({
        coupon: evaluation.coupon,
        userId,
        orderId,
        discountAmount: evaluation.freeShipping ? evaluation.shippingDiscount : discountAmount,
        freeShipping: evaluation.freeShipping,
      });
    } catch (err) {
      if (err instanceof CouponError) publishCouponRejected({ userId, code: appliedCouponCode, reason: err.reason, message: err.message });
      throw err;
    }
  }

  const totalAmount = Math.max(0, subtotal - discountAmount + shippingFee);

  // Generate unique order number: WW-YYYY-XXXXX
  const randomSuffix = Math.floor(10000 + Math.random() * 90000);
  const orderNumber = `WW-${new Date().getFullYear()}-${randomSuffix}`;

  const initialStatus = paymentMethod === 'COD' ? 'confirmed' : 'pending_payment';

  const order = new Order({
    _id: orderId,
    orderNumber,
    customer: userId,
    items: verifiedOrderItems,
    shippingAddress,
    subtotal,
    discountAmount,
    couponCode: appliedCouponCode,
    shippingFee,
    taxAmount: 0,
    currency: process.env.DEFAULT_CURRENCY || 'PKR',
    totalAmount,
    idempotencyKey: idempotencyKey || undefined,
    paymentMethod,
    paymentStatus: 'pending',
    paymentDetails: {
      provider: paymentMethod.toLowerCase(),
      webhookPayloadRef: idempotencyKey,
    },
    orderStatus: initialStatus,
    deliveryNotes: deliveryNotes || '',
    statusHistory: [
      {
        status: initialStatus,
        changedBy: userId,
        role: 'customer',
        comment: `Order placed via ${paymentMethod}`,
        timestamp: new Date(),
      },
    ],
  });

  try {
    await order.save();
  } catch (saveErr) {
    if (redemption) await releaseForOrder(orderId, 'order_save_failed');
    throw saveErr;
  }

  // Atomically reserve stock for each ordered item; undo everything already taken if one fails.
  const reserved = [];
  for (const item of verifiedOrderItems) {
    try {
      await reserveStock({
        warehouseId: warehouse._id,
        productId: item.product,
        variantId: item.product, // Links to base inventory item
        sku: item.sku,
        quantity: item.quantity,
        orderId: order._id,
        actorId: userId,
      });
      reserved.push(item);
    } catch (stockErr) {
      for (const done of reserved) {
        await releaseReservedStock({
          warehouseId: warehouse._id, productId: done.product, variantId: done.product, sku: done.sku,
          quantity: done.quantity, orderId: order._id, actorId: userId, reason: 'Rolled back after failed checkout',
        });
      }
      order.orderStatus = 'failed';
      await order.save();
      if (redemption) await releaseForOrder(order._id, 'stock_reservation_failed');
      throw stockErr;
    }
  }

  // Cash on delivery is confirmed immediately, so the coupon is consumed now.
  // Online orders keep the coupon RESERVED until the payment provider confirms payment.
  if (redemption && paymentMethod === 'COD') {
    await redeemForOrder(order._id, order.totalAmount);
  }

  // Announce only after everything above has been persisted.
  await publishOrderPlaced(order);
  if (appliedCouponCode) await publishCouponApplied({ userId, orderId: order._id, code: appliedCouponCode });

  return order;
};

export const transitionOrderStatus = async ({ orderId, targetStatus, actorId, actorRole, comment = '' }) => {
  const order = await Order.findById(orderId);
  if (!order) {
    const error = new Error('Order not found.');
    error.status = 404;
    throw error;
  }

  const currentStatus = order.orderStatus;
  const allowed = ALLOWED_ORDER_TRANSITIONS[currentStatus] || [];

  if (!allowed.includes(targetStatus) && actorRole !== 'super_admin') {
    const error = new Error(
      `Invalid order status transition from '${currentStatus}' to '${targetStatus}'. Allowed: [${allowed.join(', ')}]`
    );
    error.code = 'INVALID_STATUS_TRANSITION';
    error.status = 400;
    throw error;
  }

  order.orderStatus = targetStatus;
  order.statusHistory.push({
    status: targetStatus,
    changedBy: actorId,
    role: actorRole,
    comment,
    timestamp: new Date(),
  });

  // If order cancelled, release inventory reservations
  if (targetStatus === 'cancelled') {
    const warehouse = await Warehouse.findOne({ isActive: true });
    if (warehouse) {
      for (const item of order.items) {
        await releaseReservedStock({
          warehouseId: warehouse._id,
          productId: item.product,
          variantId: item.product,
          sku: item.sku,
          quantity: item.quantity,
          orderId: order._id,
          actorId,
          reason: `Cancelled order ${order.orderNumber}`,
        });
      }
    }
  }

  // If order dispatched/delivered, commit stock permanently
  if (targetStatus === 'ready_for_dispatch') {
    const warehouse = await Warehouse.findOne({ isActive: true });
    if (warehouse) {
      for (const item of order.items) {
        await commitStockSale({
          warehouseId: warehouse._id,
          productId: item.product,
          variantId: item.product,
          sku: item.sku,
          quantity: item.quantity,
          orderId: order._id,
          actorId,
        });
      }
    }
  }

  await order.save();

  // A cancelled / failed order frees its coupon (capacity + the customer's per-customer slot).
  if (targetStatus === 'cancelled' || targetStatus === 'failed') {
    await releaseForOrder(order._id, `order_${targetStatus}`);
  }

  // Announce via the durable outbox (customer + staff notifications, email, sockets).
  const historyEntry = order.statusHistory[order.statusHistory.length - 1];
  await publishOrderStatusChanged({ order, historyEntry, actorRole, actorId });

  return order;
};
