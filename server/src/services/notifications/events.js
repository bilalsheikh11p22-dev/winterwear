import { enqueueEvent } from './outbox.js';

/**
 * Domain-event publishers. Business code calls these AFTER its own database write has succeeded.
 * Each helper derives a deterministic eventId so retries / duplicate webhooks collapse to one event.
 * They never throw into the caller: a notification problem must not fail checkout or a payment webhook.
 */
const safe = async (fn) => {
  try {
    return await fn();
  } catch (err) {
    console.error('[Events] publish failed:', err.message);
    return null;
  }
};

const pub = (name, eventId, payload) => safe(() => enqueueEvent({ name, eventId, payload }));

export const publishOrderPlaced = (order) => pub('order.placed', `order.placed:${order._id}`, { orderId: String(order._id) });

export const publishOrderStatusChanged = ({ order, historyEntry, actorRole, actorId }) =>
  pub('order.status_changed', `order.status:${order._id}:${historyEntry._id}`, {
    orderId: String(order._id),
    status: historyEntry.status,
    actorRole: actorRole || '',
    actorId: actorId ? String(actorId) : '',
  });

export const publishPaymentConfirmed = (order) =>
  pub('payment.confirmed', `payment.confirmed:${order._id}`, { orderId: String(order._id) });

export const publishPaymentFailed = (order, webhookEventId) =>
  pub('payment.failed', `payment.failed:${order._id}:${webhookEventId}`, { orderId: String(order._id) });

export const publishRefundStatus = ({ orderId, status, refundKey }) =>
  pub('refund.status', `refund.${status}:${orderId}:${refundKey}`, { orderId: String(orderId), status });

export const publishReturnStatus = ({ orderId, status, key }) =>
  pub('return.status', `return.${status}:${orderId}:${key}`, { orderId: String(orderId), status });

export const publishCouponRejected = ({ userId, code, reason, message }) =>
  pub('coupon.rejected', `coupon.rejected:${userId}:${code}:${Math.floor(Date.now() / 300000)}`, {
    userId: String(userId), code, reason, message,
  });

export const publishCouponApplied = ({ userId, orderId, code }) =>
  pub('coupon.applied', `coupon.applied:${orderId}`, { userId: String(userId), orderId: String(orderId), code });

export const publishProductPublished = (product) =>
  pub('product.published', `product.published:${product._id}`, { productId: String(product._id) });

export const publishStockChanged = ({ productId, prevQty, newQty }) =>
  pub('product.stock_changed', `stock:${productId}:${prevQty}:${newQty}:${Math.floor(Date.now() / 60000)}`, {
    productId: String(productId), prevQty, newQty,
  });

export const publishPriceDropped = ({ productId, oldPrice, newPrice }) =>
  pub('product.price_dropped', `price:${productId}:${oldPrice}:${newPrice}`, { productId: String(productId), oldPrice, newPrice });

export const publishRiderAssigned = ({ orderId, riderId, assignmentId }) =>
  pub('delivery.rider_assigned', `delivery.assigned:${assignmentId}`, {
    orderId: String(orderId), riderId: String(riderId), assignmentId: String(assignmentId),
  });

export const publishAccountEvent = ({ userId, kind, key }) =>
  pub('account.event', `account:${kind}:${userId}:${key}`, { userId: String(userId), kind });

export const publishPurchaseOrderStatus = ({ poId, poNumber, status }) =>
  pub('inventory.purchase_order', `po:${poId}:${status}`, { poId: String(poId), poNumber, status });

export const publishStockReceived = ({ productId, sku, quantity, key }) =>
  pub('inventory.stock_received', `stock-received:${key}`, { productId: String(productId), sku, quantity });
