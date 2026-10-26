import OutboxEvent from '../../models/OutboxEvent.js';

/**
 * Durable event outbox.
 *   enqueueEvent()  — idempotent insert keyed by eventId (retries / duplicate webhooks collapse to one row)
 *   drainOutbox()   — claims due events atomically and runs registered handlers
 *
 * Handlers MUST be idempotent (our notification creation is, via the unique (recipient,eventId) index),
 * because an event can be delivered more than once after a crash between "handler ran" and "marked done".
 */
const handlers = new Map();
let drainTimer = null;
let draining = false;

export const registerHandler = (name, fn) => handlers.set(name, fn);
export const hasHandler = (name) => handlers.has(name);

const backoffMs = (attempts) => {
  const base = Math.min(30000 * 2 ** (attempts - 1), 60 * 60 * 1000); // 30s → 1h cap
  return base + Math.floor(Math.random() * 1000);
};

export const enqueueEvent = async ({ name, eventId, payload = {}, delayMs = 0 }) => {
  if (!name || !eventId) throw new Error('enqueueEvent requires name and eventId');
  try {
    const doc = await OutboxEvent.create({
      name,
      eventId,
      payload,
      nextAttemptAt: new Date(Date.now() + delayMs),
    });
    scheduleDrain();
    return { event: doc, created: true };
  } catch (err) {
    if (err.code === 11000) return { event: await OutboxEvent.findOne({ eventId }), created: false };
    throw err;
  }
};

const claimNext = () => {
  const now = new Date();
  const staleLock = new Date(Date.now() - 5 * 60 * 1000);
  return OutboxEvent.findOneAndUpdate(
    {
      $or: [
        { status: { $in: ['pending', 'failed'] }, nextAttemptAt: { $lte: now } },
        { status: 'processing', lockedAt: { $lt: staleLock } }, // crashed worker
      ],
    },
    { $set: { status: 'processing', lockedAt: now }, $inc: { attempts: 1 } },
    { sort: { nextAttemptAt: 1 }, new: true }
  );
};

const runOne = async (evt) => {
  const handler = handlers.get(evt.name);
  try {
    if (!handler) throw new Error(`No handler registered for event "${evt.name}"`);
    await handler(evt.payload, evt);
    await OutboxEvent.updateOne(
      { _id: evt._id },
      { $set: { status: 'done', processedAt: new Date(), purgeAt: new Date(Date.now() + 30 * 86400000), lastError: '' } }
    );
    return 'done';
  } catch (err) {
    const dead = evt.attempts >= evt.maxAttempts;
    await OutboxEvent.updateOne(
      { _id: evt._id },
      {
        $set: {
          status: dead ? 'dead' : 'failed',
          lastError: String(err.message || err).slice(0, 500),
          nextAttemptAt: new Date(Date.now() + backoffMs(evt.attempts)),
        },
      }
    );
    console.error(`[Outbox] ${evt.name} (${evt.eventId}) attempt ${evt.attempts} failed: ${err.message}`);
    return dead ? 'dead' : 'failed';
  }
};

/** Process everything currently due. Returns counters (used by tests and the worker). */
export const drainOutbox = async ({ limit = 200 } = {}) => {
  if (draining) return { skipped: true };
  draining = true;
  const result = { done: 0, failed: 0, dead: 0 };
  try {
    for (let i = 0; i < limit; i += 1) {
      const evt = await claimNext();
      if (!evt) break;
      result[await runOne(evt)] += 1;
    }
  } finally {
    draining = false;
  }
  return result;
};

/** Low-latency path: process shortly after enqueue. The polling worker is the safety net. */
export const scheduleDrain = () => {
  if (process.env.OUTBOX_INLINE === 'false' || drainTimer) return;
  drainTimer = setTimeout(() => {
    drainTimer = null;
    drainOutbox().catch((e) => console.error('[Outbox] inline drain error:', e.message));
  }, 25);
  drainTimer.unref?.();
};

/** Re-queue a dead/failed event by hand (admin tooling). */
export const retryEvent = async (id) =>
  OutboxEvent.findOneAndUpdate(
    { _id: id, status: { $in: ['failed', 'dead'] } },
    { $set: { status: 'pending', nextAttemptAt: new Date(), attempts: 0, lastError: '' } },
    { new: true }
  );
