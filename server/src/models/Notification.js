import mongoose from 'mongoose';
import { NOTIFICATION_TYPE_KEYS, getTypeMeta, isSafeInternalPath } from '../services/notifications/catalog.js';

// Only these metadata keys may be stored, and only as short primitives. This keeps
// notifications from ever carrying addresses, phone numbers, tokens or payment data.
const ALLOWED_DATA_KEYS = [
  'orderId', 'orderNumber', 'productId', 'productSlug', 'productName', 'couponCode', 'couponId',
  'campaignId', 'status', 'discountLabel', 'expiresAt', 'price', 'salePrice', 'currency',
  'categoryName', 'totalAmount', 'itemCount', 'collectionSlug', 'reason',
];

export const sanitizeData = (data) => {
  const out = {};
  if (!data || typeof data !== 'object') return out;
  for (const key of ALLOWED_DATA_KEYS) {
    const v = data[key];
    if (v === undefined || v === null) continue;
    if (typeof v === 'number' || typeof v === 'boolean') out[key] = v;
    else if (v instanceof Date) out[key] = v.toISOString();
    else if (typeof v === 'string') out[key] = v.slice(0, 200);
    else if (typeof v?.toString === 'function' && mongoose.isValidObjectId(v)) out[key] = v.toString();
  }
  return out;
};

const notificationSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    recipientRole: { type: String, default: '' },
    type: { type: String, enum: NOTIFICATION_TYPE_KEYS, required: true },
    category: { type: String, default: '' },
    isMarketing: { type: Boolean, default: false },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    message: { type: String, required: true, trim: true, maxlength: 600 },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
    actionUrl: { type: String, default: '' },
    imageUrl: { type: String, default: '' },
    priority: { type: String, enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' },

    // Legacy reference fields (kept so existing call sites and documents keep working)
    referenceId: String,
    referenceModel: String,

    isRead: { type: Boolean, default: false },
    readAt: Date,
    clickedAt: Date,
    dismissedAt: Date,

    eventId: { type: String, default: undefined },
    campaign: { type: mongoose.Schema.Types.ObjectId, ref: 'NotificationCampaign', default: undefined },

    channels: { type: [String], default: ['in_app'] },
    deliveryStatus: {
      inApp: { type: String, enum: ['pending', 'sent', 'failed', 'skipped'], default: 'sent' },
      email: {
        type: String,
        enum: ['not_requested', 'pending', 'sent', 'failed', 'skipped'],
        default: 'not_requested',
      },
      emailReason: { type: String, default: '' },
    },
    expiresAt: Date,
  },
  { timestamps: true }
);

notificationSchema.pre('validate', function (next) {
  const meta = getTypeMeta(this.type);
  if (meta) {
    if (!this.category) this.category = meta.category;
    if (this.isNew) this.isMarketing = !meta.transactional;
    if (this.isNew && this.priority === 'normal') this.priority = meta.priority;
    if (this.isNew && !this.expiresAt && meta.retentionDays) {
      this.expiresAt = new Date(Date.now() + meta.retentionDays * 86400000);
    }
  }
  if (this.isModified('data')) this.data = sanitizeData(this.data);
  if (this.actionUrl && !isSafeInternalPath(this.actionUrl)) {
    return next(new Error('actionUrl must be a safe internal path'));
  }
  if (this.imageUrl && !/^https:\/\/[^\s]+$/i.test(this.imageUrl) && !/^\/uploads\/[^\s]+$/.test(this.imageUrl)) {
    this.imageUrl = '';
  }
  return next();
});

notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, category: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isMarketing: 1, createdAt: -1 });
// Deduplication: one notification per (recipient, eventId)
notificationSchema.index(
  { recipient: 1, eventId: 1 },
  { unique: true, partialFilterExpression: { eventId: { $type: 'string' } } }
);
notificationSchema.index({ type: 1, createdAt: -1 });
notificationSchema.index({ campaign: 1 }, { sparse: true });
// TTL only applies to documents that carry expiresAt (marketing/ephemeral types).
// Order, delivery, account and security history never get an expiresAt.
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('Notification', notificationSchema);
