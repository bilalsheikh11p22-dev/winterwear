import mongoose from 'mongoose';

const subscriptionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    type: { type: String, enum: ['back_in_stock', 'price_drop'], default: 'back_in_stock' },
    notifiedAt: Date,
  },
  { timestamps: true }
);

subscriptionSchema.index({ user: 1, product: 1, type: 1 }, { unique: true });
subscriptionSchema.index({ product: 1, type: 1 });

export default mongoose.model('ProductSubscription', subscriptionSchema);
