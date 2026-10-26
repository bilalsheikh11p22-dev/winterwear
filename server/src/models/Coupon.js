import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, match: /^[A-Z0-9_-]{3,30}$/ },
    name: { type: String, trim: true, maxlength: 120, default: '' },
    description: { type: String, trim: true, maxlength: 400, default: '' },
    discountType: { type: String, enum: ['percentage', 'fixed_amount', 'free_shipping'], required: true },
    discountValue: { type: Number, required: true, min: 0 },
    minOrderAmount: { type: Number, default: 0, min: 0 },
    maxDiscountAmount: { type: Number, default: null },
    validFrom: { type: Date, required: true, default: Date.now },
    validUntil: { type: Date, required: true },

    // Admin kill-switch. Combined with the date window to derive `status`.
    isActive: { type: Boolean, default: true },

    maxUsageCount: { type: Number, default: null }, // null = unlimited
    currentUsageCount: { type: Number, default: 0 }, // redeemed
    reservedCount: { type: Number, default: 0 }, // held by in-flight checkouts
    perCustomerLimit: { type: Number, default: 1, min: 1, max: 10 },

    // Eligibility
    applicableCategories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
    eligibleProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
    excludeSaleItems: { type: Boolean, default: false },
    firstOrderOnly: { type: Boolean, default: false },
    customerSegment: {
      type: String,
      enum: ['all', 'new_customers', 'returning_customers', 'specific'],
      default: 'all',
    },
    eligibleCustomers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    // public: listed to every eligible signed-in customer. hidden: only usable if you know the code.
    visibility: { type: String, enum: ['public', 'hidden'], default: 'public' },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// invalidate() yields a proper ValidationError (→ HTTP 400) instead of a generic Error (→ 500)
couponSchema.pre('validate', function (next) {
  if (this.discountType === 'percentage' && (this.discountValue <= 0 || this.discountValue > 100)) {
    this.invalidate('discountValue', 'Percentage discount must be between 0 and 100');
  }
  if (this.discountType === 'fixed_amount' && this.discountValue <= 0) {
    this.invalidate('discountValue', 'Fixed discount must be greater than 0');
  }
  if (this.validUntil && this.validFrom && this.validUntil <= this.validFrom) {
    this.invalidate('validUntil', 'Expiry must be after the start date');
  }
  next();
});

/** active | scheduled | expired | disabled | exhausted — computed from real state, never stored. */
couponSchema.virtual('status').get(function () {
  const now = Date.now();
  if (!this.isActive) return 'disabled';
  if (this.validUntil && this.validUntil.getTime() < now) return 'expired';
  if (this.validFrom && this.validFrom.getTime() > now) return 'scheduled';
  if (this.maxUsageCount != null && this.currentUsageCount >= this.maxUsageCount) return 'exhausted';
  return 'active';
});

couponSchema.index({ isActive: 1, validFrom: 1, validUntil: 1 });
couponSchema.index({ visibility: 1, isActive: 1, validUntil: 1 });

export default mongoose.model('Coupon', couponSchema);
