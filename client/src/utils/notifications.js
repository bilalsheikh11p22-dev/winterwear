import {
  Package, Truck, Sparkles, Ticket, ShieldCheck, Boxes, ClipboardList, Bell,
} from 'lucide-react';

/** Only same-origin absolute paths are ever navigated to (no scheme, no //host, no backslashes). */
export const safeInternalPath = (value) =>
  typeof value === 'string' && /^\/(?!\/)[^\s\\]*$/.test(value) && value.length <= 300 ? value : null;

// Links for legacy rows that were stored before actionUrl existed
const LEGACY_LINKS = {
  rider_assigned: '/rider', rider_approved: '/rider', rider_rejected: '/rider',
  rider_application: '/admin/staff', low_stock_alert: '/admin/inventory',
};

export const resolveActionUrl = (n) => safeInternalPath(n?.actionUrl) || LEGACY_LINKS[n?.type] || null;

/** Only https images from the API are rendered. */
export const safeImageUrl = (url) => (typeof url === 'string' && /^https:\/\//i.test(url) ? url : null);

export const CATEGORY_META = {
  orders: { label: 'Orders', Icon: Package },
  delivery: { label: 'Delivery', Icon: Truck },
  products: { label: 'Products', Icon: Sparkles },
  discounts: { label: 'Discounts', Icon: Ticket },
  account: { label: 'Account', Icon: ShieldCheck },
  inventory: { label: 'Inventory', Icon: Boxes },
  staff: { label: 'Operations', Icon: ClipboardList },
};
export const categoryIcon = (c) => CATEGORY_META[c]?.Icon || Bell;

export const FILTER_TABS = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'orders', label: 'Orders' },
  { key: 'products', label: 'Products' },
  { key: 'discounts', label: 'Discounts' },
  { key: 'delivery', label: 'Delivery' },
  { key: 'account', label: 'Account' },
];

const rtf = typeof Intl !== 'undefined' ? new Intl.RelativeTimeFormat('en', { numeric: 'auto' }) : null;
const UNITS = [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]];

/** "2 minutes ago", "yesterday", "just now" */
export const relativeTime = (date, now = Date.now()) => {
  const secs = Math.round((now - new Date(date).getTime()) / 1000);
  if (Number.isNaN(secs)) return '';
  if (secs < 45) return 'just now';
  for (const [unit, size] of UNITS) {
    if (secs >= size) return rtf ? rtf.format(-Math.floor(secs / size), unit) : `${Math.floor(secs / size)} ${unit}s ago`;
  }
  return 'just now';
};

export const formatPKR = (n) => `PKR ${Number(n || 0).toLocaleString('en-PK')}`;
export const formatDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export const apiMessage = (err, fallback = 'Something went wrong. Please try again.') =>
  err?.response?.data?.message || (err?.request && !err?.response ? 'Network error. Check your connection and retry.' : fallback);
