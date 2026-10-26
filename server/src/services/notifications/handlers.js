import Order from '../../models/Order.js';
import Product from '../../models/Product.js';
import User from '../../models/User.js';
import Wishlist from '../../models/Wishlist.js';
import ProductSubscription from '../../models/ProductSubscription.js';
import NotificationCampaign from '../../models/NotificationCampaign.js';
import { registerHandler } from './outbox.js';
import { createNotification, deliverNotificationEmail } from './notificationService.js';
import { STAFF_ROLES } from './catalog.js';
import { getPreferencesMap } from './preferenceService.js';
import { runCampaignBatches } from './campaignService.js';
import Notification from '../../models/Notification.js';
import Coupon from '../../models/Coupon.js';
import CouponRedemption from '../../models/CouponRedemption.js';
import { emitToRoles } from '../../socket/index.js';

const money = (n, cur = 'PKR') => `${cur} ${Number(n || 0).toLocaleString('en-PK')}`;
const num = (o) => `#${o.orderNumber}`;
const customerLink = (o) => `/my-orders/${o._id}`;
const day = () => new Date().toISOString().slice(0, 10);

const staffFor = async (roles) => User.find({ role: { $in: roles }, isActive: true }).select('role isActive');

/** Notify every active staff member in `roles`. Message content must stay free of customer PII. */
const notifyStaff = async ({ roles, type, title, message, data, actionUrl, eventKey }) => {
  const staff = await staffFor(roles);
  for (const s of staff) {
    await createNotification({ recipient: s._id, recipientDoc: s, type, title, message, data, actionUrl, eventId: `${eventKey}:${s._id}` });
  }
  emitToRoles(roles, 'staff:refresh', { reason: type });
  return staff.length;
};

const orderData = (o) => ({ orderId: String(o._id), orderNumber: o.orderNumber, status: o.orderStatus, totalAmount: o.totalAmount, currency: o.currency });

const staffOrderSummary = (o) => {
  const items = (o.items || []).reduce((s, i) => s + i.quantity, 0);
  return `Order ${num(o)} (${items} item${items === 1 ? '' : 's'}, ${money(o.totalAmount, o.currency)}) is ready for fulfillment.`;
};

// ── Orders ─────────────────────────────────────────────────────────────────────────────
registerHandler('order.placed', async ({ orderId }) => {
  const order = await Order.findById(orderId);
  if (!order) return; // the order must exist & be persisted before we announce it
  const confirmedNow = order.paymentMethod === 'COD' || order.paymentStatus === 'paid';

  await createNotification({
    recipient: order.customer,
    type: confirmedNow ? 'order_placed' : 'payment_pending',
    title: confirmedNow ? 'Order placed' : 'Order received — payment pending',
    message: confirmedNow
      ? `Your WinterWear order ${num(order)} has been placed successfully.`
      : `We've received order ${num(order)}. It will be confirmed once your payment is verified.`,
    data: orderData(order),
    actionUrl: customerLink(order),
    eventId: `order.placed:${order._id}`,
    referenceId: String(order._id),
    referenceModel: 'Order',
  });

  if (confirmedNow) {
    await notifyStaff({
      roles: STAFF_ROLES.newOrder, type: 'new_order_staff', title: 'New order to fulfil',
      message: staffOrderSummary(order), data: orderData(order), actionUrl: '/admin/orders', eventKey: `order.staff:${order._id}`,
    });
  }
});

const CUSTOMER_STATUS = {
  confirmed: ['order_confirmed', 'Order confirmed', (o) => `Your order ${num(o)} has been confirmed by WinterWear.`],
  processing: ['order_processing', 'Order being prepared', (o) => `Your order ${num(o)} is being prepared.`],
  ready_for_dispatch: ['order_packed', 'Order packed', (o) => `Your order ${num(o)} is packed and ready for dispatch.`],
  assigned_to_rider: ['delivery_rider_assigned', 'Rider assigned', (o) => `A rider has been assigned to deliver order ${num(o)}.`],
  picked_up: ['order_shipped', 'Order shipped', (o) => `Your order ${num(o)} has been shipped.`],
  out_for_delivery: ['out_for_delivery', 'Out for delivery', (o) => `Your order ${num(o)} is out for delivery.`],
  delivered: ['delivered', 'Order delivered', (o) => `Your order ${num(o)} has been delivered. Thank you for shopping with WinterWear.`],
  delivery_failed: ['delivery_failed', 'Delivery attempt unsuccessful', (o) => `We could not deliver order ${num(o)}. Our team will contact you to arrange a new attempt.`],
  cancelled: ['order_cancelled', 'Order cancelled', (o, e) => (e.actorRole === 'system'
    ? `Order ${num(o)} was cancelled because payment was not completed in time.`
    : `Order ${num(o)} has been cancelled.`)],
  return_requested: ['return_requested', 'Return requested', (o) => `We have received your return request for order ${num(o)}.`],
  returned: ['return_update', 'Return update', (o) => `Your return for order ${num(o)} has been received.`],
  returned_to_warehouse: ['return_update', 'Return update', (o) => `Order ${num(o)} is back at our warehouse.`],
  refund_pending: ['return_update', 'Refund pending', (o) => `Your refund for order ${num(o)} is being processed.`],
  refunded: ['refund_completed', 'Refund completed', (o) => `Your refund for order ${num(o)} has been completed.`],
};

registerHandler('order.status_changed', async ({ orderId, status, actorRole }, evt) => {
  const order = await Order.findById(orderId);
  if (!order) return;
  const map = CUSTOMER_STATUS[status];

  // Online-payment confirmation is announced by payment.confirmed, so skip the system "confirmed" echo.
  const redundant = status === 'confirmed' && actorRole === 'system';
  if (map && !redundant) {
    const [type, title, msg] = map;
    await createNotification({
      recipient: order.customer, type, title, message: msg(order, { actorRole }),
      data: { ...orderData(order), status }, actionUrl: customerLink(order),
      eventId: evt.eventId, referenceId: String(order._id), referenceModel: 'Order',
    });
  }

  if (status === 'delivery_failed') {
    await notifyStaff({
      roles: STAFF_ROLES.fulfillment, type: 'delivery_failed_staff', title: 'Delivery failed',
      message: `Delivery of order ${num(order)} failed and needs rescheduling.`, data: orderData(order),
      actionUrl: '/admin/orders', eventKey: `${evt.eventId}:staff`,
    });
  }
  if (status === 'return_requested') {
    await notifyStaff({
      roles: STAFF_ROLES.returns, type: 'return_needs_action', title: 'Return needs review',
      message: `A return was requested for order ${num(order)}.`, data: orderData(order),
      actionUrl: '/admin/returns', eventKey: `${evt.eventId}:staff`,
    });
  }
  if (status === 'delivered' && order.paymentMethod === 'COD') {
    await notifyStaff({
      roles: STAFF_ROLES.finance, type: 'cod_reconciliation_required', title: 'COD reconciliation required',
      message: `Order ${num(order)} was delivered cash-on-delivery (${money(order.totalAmount, order.currency)}) and awaits reconciliation.`,
      data: orderData(order), actionUrl: '/admin/finance', eventKey: `${evt.eventId}:cod`,
    });
  }
});

registerHandler('payment.confirmed', async ({ orderId }) => {
  const order = await Order.findById(orderId);
  if (!order || order.paymentStatus !== 'paid') return; // only announce what MongoDB says is paid
  await createNotification({
    recipient: order.customer, type: 'payment_confirmed', title: 'Payment confirmed',
    message: `Payment confirmed for order ${num(order)}.`, data: orderData(order), actionUrl: customerLink(order),
    eventId: `payment.confirmed:${order._id}`, referenceId: String(order._id), referenceModel: 'Order',
  });
  await notifyStaff({
    roles: STAFF_ROLES.newOrder, type: 'new_order_staff', title: 'New order to fulfil',
    message: staffOrderSummary(order), data: orderData(order), actionUrl: '/admin/orders', eventKey: `order.staff:${order._id}`,
  });
});

registerHandler('payment.failed', async ({ orderId }, evt) => {
  const order = await Order.findById(orderId);
  if (!order) return;
  await createNotification({
    recipient: order.customer, type: 'payment_failed', title: 'Payment failed',
    message: `Payment for order ${num(order)} was not successful. Please try again from your orders page.`,
    data: orderData(order), actionUrl: customerLink(order), eventId: evt.eventId, referenceId: String(order._id), referenceModel: 'Order',
  });
});

registerHandler('refund.status', async ({ orderId, status }, evt) => {
  const order = await Order.findById(orderId);
  if (!order) return;
  const copy = {
    requested: ['refund_requested', 'Refund requested', `Your refund request for order ${num(order)} has been received.`],
    approved: ['refund_approved', 'Refund approved', `Your refund for order ${num(order)} has been approved.`],
    rejected: ['refund_rejected', 'Refund declined', `Your refund request for order ${num(order)} was not approved.`],
    completed: ['refund_completed', 'Refund completed', `Your refund for order ${num(order)} has been completed.`],
  }[status];
  if (!copy) return;
  await createNotification({
    recipient: order.customer, type: copy[0], title: copy[1], message: copy[2], data: orderData(order),
    actionUrl: customerLink(order), eventId: evt.eventId, referenceId: String(order._id), referenceModel: 'Order',
  });
  if (status === 'requested' || status === 'approved') {
    await notifyStaff({
      roles: STAFF_ROLES.finance, type: 'refund_needs_action', title: 'Refund needs action',
      message: `A refund for order ${num(order)} is ${status === 'requested' ? 'awaiting review' : 'approved and awaiting payout'}.`,
      data: orderData(order), actionUrl: '/admin/finance', eventKey: `${evt.eventId}:staff`,
    });
  }
});

const RETURN_COPY = {
  under_review: 'is under review',
  approved_for_return: 'has been approved — please send the items back',
  item_received_at_warehouse: 'has arrived at our warehouse',
  inspected_passed: 'passed inspection',
  inspected_failed: 'did not pass inspection',
  rejected: 'was not approved',
};

registerHandler('return.status', async ({ orderId, status }, evt) => {
  const order = await Order.findById(orderId);
  const phrase = RETURN_COPY[status];
  if (!order || !phrase) return;
  await createNotification({
    recipient: order.customer, type: 'return_update', title: 'Return update',
    message: `Your return for order ${num(order)} ${phrase}.`, data: { ...orderData(order), status },
    actionUrl: customerLink(order), eventId: evt.eventId, referenceId: String(order._id), referenceModel: 'Order',
  });
});

registerHandler('delivery.rider_assigned', async ({ orderId, riderId, assignmentId }) => {
  const order = await Order.findById(orderId);
  const rider = await User.findById(riderId).select('role isActive');
  if (!order || !rider) return;
  await createNotification({
    recipient: rider._id, recipientDoc: rider, type: 'rider_assigned', title: 'New delivery assigned',
    message: `Order ${num(order)} to ${order.shippingAddress?.city || 'the customer'} is waiting for pickup.`,
    data: { orderId: String(order._id), orderNumber: order.orderNumber }, actionUrl: '/rider',
    eventId: `delivery.assigned:${assignmentId}`, referenceId: String(assignmentId), referenceModel: 'DeliveryAssignment',
  });
});

registerHandler('coupon.rejected', async ({ userId, code, reason, message }, evt) => {
  await createNotification({
    recipient: userId, type: 'coupon_rejected', title: `Coupon ${code} could not be applied`, message,
    data: { couponCode: code, reason }, actionUrl: '/cart', eventId: evt.eventId,
  });
});

registerHandler('coupon.applied', async ({ userId, orderId, code }, evt) => {
  const order = await Order.findById(orderId);
  if (!order) return;
  await createNotification({
    recipient: userId, type: 'coupon_applied', title: 'Coupon applied',
    message: `${code} saved you ${money(order.discountAmount, order.currency)} on order ${num(order)}.`,
    data: { ...orderData(order), couponCode: code }, actionUrl: customerLink(order), eventId: evt.eventId,
  });
});

// ── Products ───────────────────────────────────────────────────────────────────────────
registerHandler('product.published', async ({ productId }) => {
  const product = await Product.findById(productId);
  // Never announce drafts / unpublished products — re-checked at processing time, not just at enqueue time.
  if (!product || !product.isPublished) return;
  let campaign;
  try {
    campaign = await NotificationCampaign.create({
      name: `New arrival: ${product.name}`.slice(0, 120),
      kind: 'product_announcement',
      status: 'running',
      startedAt: new Date(),
      products: [product._id],
      audience: { segment: 'all_customers' },
      sendEmail: true,
      eventKey: `product.published:${product._id}`,
      system: true,
    });
  } catch (err) {
    if (err.code !== 11000) throw err; // already announced
    return;
  }
  await runCampaignBatches(campaign._id);
});

const wishlistUsers = async (productId) => (await Wishlist.find({ products: productId }).select('user').lean()).map((w) => w.user);

const productImage = (p) => (p.images || []).find((i) => i.isPrimary)?.url || p.images?.[0]?.url || '';
const effective = (p) => (p.salePrice != null && p.salePrice < p.regularPrice ? p.salePrice : p.regularPrice);

registerHandler('product.stock_changed', async ({ productId, prevQty, newQty }) => {
  const product = await Product.findById(productId);
  if (!product) return;

  // Back in stock → subscribed customers (one-shot subscriptions)
  if (prevQty <= 0 && newQty > 0 && product.isPublished) {
    const subs = await ProductSubscription.find({ product: product._id, type: 'back_in_stock' });
    const users = await User.find({ _id: { $in: subs.map((s) => s.user) }, isActive: true }).select('role isActive');
    const prefOf = await getPreferencesMap(users.map((u) => u._id));
    for (const u of users) {
      const r = await createNotification({
        recipient: u._id, recipientDoc: u, prefs: prefOf(u._id), type: 'back_in_stock',
        title: `${product.name} is back in stock`, message: `Good news — ${product.name} is available again.`,
        data: { productId: String(product._id), productSlug: product.slug, productName: product.name, price: effective(product), currency: 'PKR' },
        actionUrl: `/product/${product.slug}`, imageUrl: productImage(product),
        eventId: `backinstock:${product._id}:${u._id}:${day()}`, bypassFrequency: true,
      });
      if (r.status !== 'skipped_preference') await ProductSubscription.deleteOne({ user: u._id, product: product._id, type: 'back_in_stock' });
    }
  }

  const threshold = product.lowStockThreshold ?? 5;
  if (newQty <= 0 && prevQty > 0) {
    await notifyStaff({
      roles: STAFF_ROLES.inventory, type: 'out_of_stock_alert', title: 'Out of stock',
      message: `${product.name} (${product.sku}) is now out of stock.`, data: { productId: String(product._id), productName: product.name },
      actionUrl: '/admin/inventory', eventKey: `outofstock:${product._id}:${day()}`,
    });
  } else if (newQty > 0 && newQty <= threshold && prevQty > threshold) {
    await notifyStaff({
      roles: STAFF_ROLES.inventory, type: 'low_stock_alert', title: 'Low stock',
      message: `${product.name} (${product.sku}) is down to ${newQty} unit${newQty === 1 ? '' : 's'} (threshold ${threshold}).`,
      data: { productId: String(product._id), productName: product.name }, actionUrl: '/admin/inventory', eventKey: `lowstock:${product._id}:${day()}`,
    });
    // Disclosure to customers is deliberately vague: no exact counts.
    if (product.isPublished) {
      const ids = await wishlistUsers(product._id);
      const users = await User.find({ _id: { $in: ids }, isActive: true }).select('role isActive');
      const prefOf = await getPreferencesMap(users.map((u) => u._id));
      for (const u of users) {
        await createNotification({
          recipient: u._id, recipientDoc: u, prefs: prefOf(u._id), type: 'low_stock_wishlist',
          title: 'Almost gone', message: `${product.name} from your wishlist is selling fast.`,
          data: { productId: String(product._id), productSlug: product.slug, productName: product.name },
          actionUrl: `/product/${product.slug}`, imageUrl: productImage(product), eventId: `lowstock-wl:${product._id}:${u._id}:${day()}`,
        });
      }
    }
  }
});

registerHandler('product.price_dropped', async ({ productId, oldPrice, newPrice }) => {
  const product = await Product.findById(productId);
  if (!product || !product.isPublished) return;
  const subs = await ProductSubscription.find({ product: product._id, type: 'price_drop' }).select('user').lean();
  const ids = [...new Set([...(await wishlistUsers(product._id)), ...subs.map((s) => s.user)].map(String))];
  const users = await User.find({ _id: { $in: ids }, isActive: true }).select('role isActive');
  const prefOf = await getPreferencesMap(users.map((u) => u._id));
  for (const u of users) {
    await createNotification({
      recipient: u._id, recipientDoc: u, prefs: prefOf(u._id), type: 'price_drop',
      title: 'Price drop on your wishlist', message: `${product.name} is now ${money(newPrice)} (was ${money(oldPrice)}).`,
      data: { productId: String(product._id), productSlug: product.slug, productName: product.name, price: oldPrice, salePrice: newPrice, currency: 'PKR' },
      actionUrl: `/product/${product.slug}`, imageUrl: productImage(product), eventId: `pricedrop:${product._id}:${newPrice}:${u._id}`,
    });
  }
});

// ── Inventory (staff) ──────────────────────────────────────────────────────────────────
registerHandler('inventory.purchase_order', async ({ poId, poNumber, status }, evt) => {
  await notifyStaff({
    roles: STAFF_ROLES.inventory, type: 'purchase_order_status', title: 'Purchase order updated',
    message: `Purchase order ${poNumber || ''} is now "${String(status).replace(/_/g, ' ')}".`.replace('  ', ' '),
    data: { status }, actionUrl: '/admin/inventory', eventKey: evt.eventId,
  });
});

registerHandler('inventory.stock_received', async ({ productId, sku, quantity }, evt) => {
  await notifyStaff({
    roles: STAFF_ROLES.inventory, type: 'stock_received', title: 'Stock received',
    message: `${quantity} unit${quantity === 1 ? '' : 's'} of ${sku} received into inventory.`,
    data: { productId }, actionUrl: '/admin/inventory', eventKey: evt.eventId,
  });
});

// ── Account & security ────────────────────────────────────────────────────────────────
const ACCOUNT_COPY = {
  registered: ['account_registered', 'Welcome to WinterWear', 'Your account is ready. Explore the latest winter collection.', '/shop'],
  password_changed: ['password_changed', 'Password changed', "Your password was changed and other devices were signed out. If this wasn't you, contact support immediately.", '/profile'],
  password_reset: ['password_reset', 'Password reset complete', "Your password was reset. If this wasn't you, contact support immediately.", '/profile'],
  new_login: ['security_login', 'New sign-in detected', "We noticed a sign-in from a new network. If this wasn't you, change your password now.", '/profile'],
  profile_updated: ['account_updated', 'Account details updated', 'Your account details were updated.', '/profile'],
};

registerHandler('account.event', async ({ userId, kind }, evt) => {
  const c = ACCOUNT_COPY[kind];
  if (!c) return;
  await createNotification({ recipient: userId, type: c[0], title: c[1], message: c[2], actionUrl: c[3], eventId: evt.eventId });
});

// ── Scheduled / sweeper-driven events ──────────────────────────────────────────────────
registerHandler('order.fulfillment_delayed', async ({ orderId }, evt) => {
  const order = await Order.findById(orderId);
  // Only alert if it is STILL waiting; the sweeper's snapshot may be stale by the time we run.
  if (!order || !['confirmed', 'processing'].includes(order.orderStatus)) return;
  await notifyStaff({
    roles: STAFF_ROLES.fulfillment, type: 'order_fulfillment_delayed', title: 'Fulfillment delayed',
    message: `Order ${num(order)} has been waiting in "${order.orderStatus}" longer than the fulfillment target.`,
    data: orderData(order), actionUrl: '/admin/orders', eventKey: evt.eventId,
  });
});

registerHandler('coupon.expiring', async ({ couponId }) => {
  const coupon = await Coupon.findById(couponId);
  if (!coupon || !coupon.isActive || coupon.validUntil < new Date()) return;
  // Remind only customers who were actually told about this coupon and have not used it up.
  let after = null;
  for (;;) {
    const batch = await Notification.find({
      type: { $in: ['coupon_announced', 'coupon_exclusive'] }, 'data.couponId': String(coupon._id), ...(after ? { _id: { $gt: after } } : {}),
    }).sort({ _id: 1 }).limit(200).select('recipient').lean();
    if (!batch.length) break;
    after = batch[batch.length - 1]._id;
    const ids = batch.map((b) => b.recipient);
    const used = await CouponRedemption.aggregate([
      { $match: { coupon: coupon._id, user: { $in: ids }, active: true } },
      { $group: { _id: '$user', n: { $sum: 1 } } },
    ]);
    const usedUp = new Set(used.filter((u) => u.n >= coupon.perCustomerLimit).map((u) => String(u._id)));
    const users = await User.find({ _id: { $in: ids.filter((i) => !usedUp.has(String(i))) }, isActive: true }).select('role isActive');
    const prefOf = await getPreferencesMap(users.map((u) => u._id));
    for (const u of users) {
      await createNotification({
        recipient: u._id, recipientDoc: u, prefs: prefOf(u._id), type: 'coupon_expiring',
        title: `${coupon.code} expires soon`, message: `Your coupon ${coupon.code} expires on ${coupon.validUntil.toDateString()}. Use it before it's gone.`,
        data: { couponCode: coupon.code, couponId: String(coupon._id), expiresAt: coupon.validUntil }, actionUrl: '/shop',
        eventId: `coupon-expiry:${coupon._id}:${u._id}`,
      });
    }
  }
});

// ── Email channel ─────────────────────────────────────────────────────────────────────
registerHandler('notification.email', async ({ notificationId }) => {
  await deliverNotificationEmail({ notificationId });
});

export default true;
