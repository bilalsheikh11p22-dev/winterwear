import mongoose from 'mongoose';

// Durable event record. Business code writes here; the worker (jobs/outboxWorker.js) processes it
// with retries, bounded exponential backoff and a dead-letter state.
const outboxEventSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true, unique: true },
    name: { type: String, required: true, index: true },
    payload: { type: mongoose.Schema.Types.Mixed, default: {} },
    status: { type: String, enum: ['pending', 'processing', 'done', 'failed', 'dead'], default: 'pending' },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 6 },
    nextAttemptAt: { type: Date, default: Date.now },
    lockedAt: Date,
    lastError: { type: String, default: '' },
    processedAt: Date,
    // Completed events are purged after 30 days; dead ones are kept for inspection.
    purgeAt: Date,
  },
  { timestamps: true }
);

outboxEventSchema.index({ status: 1, nextAttemptAt: 1 });
outboxEventSchema.index({ purgeAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('OutboxEvent', outboxEventSchema);
