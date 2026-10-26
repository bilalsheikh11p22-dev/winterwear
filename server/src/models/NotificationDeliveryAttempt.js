import mongoose from 'mongoose';

const attemptSchema = new mongoose.Schema(
  {
    notification: { type: mongoose.Schema.Types.ObjectId, ref: 'Notification', required: true, index: true },
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    channel: { type: String, enum: ['email'], default: 'email' },
    provider: { type: String, default: '' },
    status: { type: String, enum: ['sent', 'failed', 'skipped'], required: true },
    attempt: { type: Number, default: 1 },
    providerMessageId: { type: String, default: '' },
    toMasked: { type: String, default: '' },
    error: { type: String, default: '' },
    // Provider webhook-supplied lifecycle (only populated if the provider reports it)
    providerEvents: [{ event: String, at: Date }],
    expireAt: { type: Date, default: () => new Date(Date.now() + 180 * 86400000) },
  },
  { timestamps: true }
);

attemptSchema.index({ status: 1, createdAt: -1 });
attemptSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('NotificationDeliveryAttempt', attemptSchema);
