import mongoose from 'mongoose';

// Tracks a coupon's lifecycle against one order: reserved (checkout) → redeemed (paid/COD-confirmed)
// or released (failed/cancelled/expired). Previewing a coupon NEVER creates a redemption.
const redemptionSchema = new mongoose.Schema(
  {
    coupon: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon', required: true, index: true },
    couponCode: { type: String, required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    // Per-customer limit slot (1..perCustomerLimit). The unique partial index below makes the
    // limit atomic: two parallel checkouts cannot both claim the same slot.
    slot: { type: Number, required: true },
    active: { type: Boolean, default: true },
    status: { type: String, enum: ['reserved', 'redeemed', 'released'], default: 'reserved' },
    discountAmount: { type: Number, required: true, min: 0 },
    orderTotal: { type: Number, default: 0 },
    freeShipping: { type: Boolean, default: false },
    reservedAt: { type: Date, default: Date.now },
    redeemedAt: Date,
    releasedAt: Date,
    releaseReason: { type: String, default: '' },
  },
  { timestamps: true }
);

redemptionSchema.index({ order: 1 }, { unique: true });
redemptionSchema.index(
  { coupon: 1, user: 1, slot: 1 },
  { unique: true, partialFilterExpression: { active: true } }
);
redemptionSchema.index({ user: 1, coupon: 1, status: 1 });
redemptionSchema.index({ coupon: 1, status: 1, redeemedAt: -1 });

export default mongoose.model('CouponRedemption', redemptionSchema);
