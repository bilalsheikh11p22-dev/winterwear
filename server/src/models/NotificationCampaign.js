import mongoose from 'mongoose';

const stat = { type: Number, default: 0 };

const campaignSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    kind: { type: String, enum: ['product_announcement', 'coupon', 'custom'], required: true },
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'running', 'completed', 'paused', 'cancelled', 'failed'],
      default: 'draft',
      index: true,
    },
    scheduledAt: Date,
    products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
    coupon: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon' },
    // Optional copy overrides; otherwise generated from the real product / coupon records
    title: { type: String, trim: true, maxlength: 160, default: '' },
    message: { type: String, trim: true, maxlength: 600, default: '' },
    actionUrl: { type: String, default: '' },
    audience: {
      segment: {
        type: String,
        enum: ['all_customers', 'previous_buyers', 'new_customers', 'wishlist_of_product', 'specific_users'],
        default: 'all_customers',
      },
      userIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      newCustomerDays: { type: Number, default: 30 },
    },
    sendEmail: { type: Boolean, default: false },
    // Natural idempotency: one campaign per business key (e.g. product.published:<id>)
    eventKey: { type: String, default: undefined },
    cursor: { type: mongoose.Schema.Types.ObjectId, default: null },
    startedAt: Date,
    completedAt: Date,
    lastError: { type: String, default: '' },
    stats: {
      scanned: stat,
      created: stat,
      duplicates: stat,
      skippedPreference: stat,
      skippedFrequency: stat,
      emailQueued: stat,
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    system: { type: Boolean, default: false },
  },
  { timestamps: true }
);

campaignSchema.index({ eventKey: 1 }, { unique: true, partialFilterExpression: { eventKey: { $type: 'string' } } });
campaignSchema.index({ status: 1, scheduledAt: 1 });

export default mongoose.model('NotificationCampaign', campaignSchema);
