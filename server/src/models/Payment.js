import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },
    orderNumber: {
      type: String,
      required: true,
      index: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'PKR',
      uppercase: true,
    },
    provider: {
      type: String,
      enum: ['stripe', 'safepay', 'payfast', 'cod'],
      required: true,
    },
    transactionId: {
      type: String,
      default: '',
      index: true,
    },
    idempotencyKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'requires_action', 'succeeded', 'failed', 'refunded', 'partially_refunded'],
      default: 'pending',
      index: true,
    },
    metadata: {
      type: Map,
      of: String,
      default: {},
    },
    webhookEvents: [
      {
        eventId: String,
        eventType: String,
        receivedAt: { type: Date, default: Date.now },
        payloadHash: String,
      },
    ],
    verifiedAt: Date,
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('Payment', paymentSchema);
