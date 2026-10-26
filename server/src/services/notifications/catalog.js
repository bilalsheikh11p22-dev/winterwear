/**
 * Notification catalog — single source of truth for every notification type.
 *
 * category    : UI filter bucket (orders | delivery | products | discounts | account | inventory | staff)
 * audience    : 'customer' | 'staff' (informational; routing happens in the event handlers)
 * priority    : low | normal | high | urgent
 * transactional: true  => never subject to marketing opt-in / frequency caps
 * pref        : preference key that can switch an OPTIONAL type off (see NotificationPreference)
 * retentionDays: null => kept permanently (order / security history). Number => expiresAt TTL.
 * email       : true => an email is queued (subject to preference + provider configuration)
 */
const T = (category, audience, o = {}) => ({
  category,
  audience,
  priority: 'normal',
  transactional: true,
  pref: null,
  retentionDays: null,
  email: false,
  ...o,
});

export const NOTIFICATION_TYPES = {
  // ── Orders ───────────────────────────────────────────────────────────
  order_placed: T('orders', 'customer', { email: true, pref: 'orderUpdates' }),
  payment_pending: T('orders', 'customer', { pref: 'orderUpdates' }),
  payment_confirmed: T('orders', 'customer', { email: true, pref: 'orderUpdates' }),
  payment_failed: T('orders', 'customer', { email: true, priority: 'high', pref: 'orderUpdates' }),
  order_confirmed: T('orders', 'customer', { pref: 'orderUpdates' }),
  order_processing: T('orders', 'customer', { pref: 'orderUpdates' }),
  order_packed: T('orders', 'customer', { pref: 'orderUpdates' }),
  order_cancelled: T('orders', 'customer', { email: true, priority: 'high', pref: 'orderUpdates' }),
  refund_requested: T('orders', 'customer', { pref: 'orderUpdates' }),
  refund_approved: T('orders', 'customer', { pref: 'orderUpdates' }),
  refund_rejected: T('orders', 'customer', { priority: 'high', pref: 'orderUpdates' }),
  refund_completed: T('orders', 'customer', { email: true, pref: 'orderUpdates' }),
  refund_processed: T('orders', 'customer', { pref: 'orderUpdates' }), // legacy
  return_requested: T('orders', 'customer', { pref: 'orderUpdates' }),
  return_update: T('orders', 'customer', { pref: 'orderUpdates' }),

  // ── Delivery ─────────────────────────────────────────────────────────
  order_shipped: T('delivery', 'customer', { email: true, pref: 'orderUpdates' }),
  delivery_rider_assigned: T('delivery', 'customer', { pref: 'orderUpdates' }),
  out_for_delivery: T('delivery', 'customer', { email: true, priority: 'high', pref: 'orderUpdates' }),
  delivered: T('delivery', 'customer', { email: true, pref: 'orderUpdates' }),
  delivery_failed: T('delivery', 'customer', { email: true, priority: 'high', pref: 'orderUpdates' }),

  // ── Products (optional / marketing) ──────────────────────────────────
  product_published: T('products', 'customer', { transactional: false, pref: 'newArrivals', retentionDays: 60, email: true }),
  collection_launched: T('products', 'customer', { transactional: false, pref: 'newArrivals', retentionDays: 60, email: true }),
  back_in_stock: T('products', 'customer', { transactional: false, pref: 'backInStock', retentionDays: 30, email: true, priority: 'high' }),
  price_drop: T('products', 'customer', { transactional: false, pref: 'priceDrop', retentionDays: 30, email: true }),
  low_stock_wishlist: T('products', 'customer', { transactional: false, pref: 'priceDrop', retentionDays: 14 }),
  review_status: T('products', 'customer', { retentionDays: 90 }),

  // ── Discounts & campaigns (optional / marketing) ─────────────────────
  coupon_announced: T('discounts', 'customer', { transactional: false, pref: 'discounts', retentionDays: 90, email: true }),
  coupon_exclusive: T('discounts', 'customer', { transactional: false, pref: 'discounts', retentionDays: 90, email: true, priority: 'high' }),
  campaign_launched: T('discounts', 'customer', { transactional: false, pref: 'discounts', retentionDays: 60, email: true }),
  sale_ending: T('discounts', 'customer', { transactional: false, pref: 'discounts', retentionDays: 14, email: true }),
  coupon_expiring: T('discounts', 'customer', { transactional: false, pref: 'discounts', retentionDays: 14, email: true }),
  coupon_applied: T('discounts', 'customer', { retentionDays: 30, priority: 'low' }),
  coupon_rejected: T('discounts', 'customer', { retentionDays: 7, priority: 'low' }),
  reward_earned: T('discounts', 'customer', { retentionDays: 90 }),

  // ── Account & security (always on) ───────────────────────────────────
  account_registered: T('account', 'customer', { email: true }),
  email_verification_reminder: T('account', 'customer', { email: true }),
  password_changed: T('account', 'customer', { email: true, priority: 'high' }),
  security_login: T('account', 'customer', { email: true, priority: 'high' }),
  account_updated: T('account', 'customer', { priority: 'low' }),
  password_reset: T('account', 'customer', { email: true, priority: 'high' }),
  security_event: T('account', 'customer', { priority: 'high' }), // legacy

  // ── Inventory & staff ────────────────────────────────────────────────
  low_stock_alert: T('inventory', 'staff', { priority: 'high' }),
  out_of_stock_alert: T('inventory', 'staff', { priority: 'urgent' }),
  purchase_order_status: T('inventory', 'staff'),
  stock_received: T('inventory', 'staff', { priority: 'low' }),
  stock_transferred: T('inventory', 'staff', { priority: 'low' }),
  new_order_staff: T('staff', 'staff', { priority: 'high' }),
  order_fulfillment_delayed: T('staff', 'staff', { priority: 'urgent' }),
  rider_assigned: T('delivery', 'staff', { priority: 'high' }), // legacy name: the RIDER receives it
  delivery_failed_staff: T('staff', 'staff', { priority: 'high' }),
  cod_reconciliation_required: T('staff', 'staff'),
  return_needs_action: T('staff', 'staff', { priority: 'high' }),
  refund_needs_action: T('staff', 'staff', { priority: 'high' }),
  payment_reconciliation: T('staff', 'staff'),
  rider_application: T('staff', 'staff'),
  rider_approved: T('staff', 'staff'),
  rider_rejected: T('staff', 'staff'),
};

export const NOTIFICATION_TYPE_KEYS = Object.keys(NOTIFICATION_TYPES);

export const CATEGORIES = ['orders', 'delivery', 'products', 'discounts', 'account', 'inventory', 'staff'];

/** Filter tabs offered by the UI → Mongo condition on the Notification collection. */
export const FILTERS = {
  all: {},
  unread: { isRead: false },
  orders: { category: 'orders' },
  products: { category: 'products' },
  discounts: { category: 'discounts' },
  delivery: { category: 'delivery' },
  account: { category: 'account' },
  inventory: { category: 'inventory' },
  staff: { category: 'staff' },
};

export const getTypeMeta = (type) => NOTIFICATION_TYPES[type] || null;

/** Only same-origin absolute paths are allowed as action URLs (no scheme, no //host, no backslashes). */
export const isSafeInternalPath = (value) =>
  typeof value === 'string' &&
  value.length <= 300 &&
  /^\/(?!\/)[^\s\\]*$/.test(value) &&
  !/[\u0000-\u001f]/.test(value);

/** Roles that receive staff notifications for a given operational concern. */
export const STAFF_ROLES = {
  newOrder: ['admin', 'super_admin', 'fulfillment_staff'],
  fulfillment: ['admin', 'super_admin', 'fulfillment_staff'],
  inventory: ['admin', 'super_admin', 'inventory_manager', 'warehouse_staff'],
  finance: ['admin', 'super_admin', 'finance_staff'],
  support: ['admin', 'super_admin', 'customer_support'],
  returns: ['admin', 'super_admin', 'customer_support'],
  admins: ['admin', 'super_admin'],
};
