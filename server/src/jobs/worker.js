import Order from '../models/Order.js';
import Coupon from '../models/Coupon.js';
import OutboxEvent from '../models/OutboxEvent.js';
import { drainOutbox, enqueueEvent } from '../services/notifications/outbox.js';
import { tickCampaigns } from '../services/notifications/campaignService.js';
import { publishOrderPlaced } from '../services/notifications/events.js';
import '../services/notifications/handlers.js'; // registers every outbox handler

/**
 * Background worker. All state lives in MongoDB (outbox rows, campaign cursors, deterministic event ids),
 * so a restart or a second instance running the same tick is harmless — nothing depends on an in-memory timer
 * remembering what it has already done. Run it inside the API process (default) or standalone: `npm run worker`.
 */
const FULFILLMENT_SLA_HOURS = () => Number(process.env.FULFILLMENT_SLA_HOURS) || 24;

/** Safety net: an order that was saved but whose "order placed" event never reached the outbox (process crash in between). */
export const reconcileMissingOrderEvents = async () => {
  const orders = await Order.find({
    createdAt: { $gte: new Date(Date.now() - 2 * 3600 * 1000), $lte: new Date(Date.now() - 60 * 1000) },
    orderStatus: { $nin: ['failed'] },
  }).select('_id').lean();
  if (!orders.length) return 0;
  const have = new Set((await OutboxEvent.find({ eventId: { $in: orders.map((o) => `order.placed:${o._id}`) } }).select('eventId').lean()).map((e) => e.eventId));
  let n = 0;
  for (const o of orders) {
    if (!have.has(`order.placed:${o._id}`)) { await publishOrderPlaced(o); n += 1; }
  }
  return n;
};

export const sweepDelayedFulfillment = async () => {
  const cutoff = new Date(Date.now() - FULFILLMENT_SLA_HOURS() * 3600 * 1000);
  const late = await Order.find({ orderStatus: { $in: ['confirmed', 'processing'] }, updatedAt: { $lte: cutoff } }).select('_id').limit(100).lean();
  for (const o of late) {
    await enqueueEvent({ name: 'order.fulfillment_delayed', eventId: `fulfillment-delay:${o._id}`, payload: { orderId: String(o._id) } });
  }
  return late.length;
};

export const sweepExpiringCoupons = async () => {
  const soon = new Date(Date.now() + 48 * 3600 * 1000);
  const coupons = await Coupon.find({ isActive: true, validUntil: { $gt: new Date(), $lte: soon } }).select('_id').lean();
  for (const c of coupons) {
    await enqueueEvent({ name: 'coupon.expiring', eventId: `coupon-expiring:${c._id}`, payload: { couponId: String(c._id) } });
  }
  return coupons.length;
};

let timer = null;
let slowTimer = null;
let ticking = false;

export const runWorkerTick = async () => {
  if (ticking) return;
  ticking = true;
  try {
    await drainOutbox();
    await tickCampaigns();
  } catch (err) {
    console.error('[Worker] tick error:', err.message);
  } finally {
    ticking = false;
  }
};

export const runSlowSweeps = async () => {
  try {
    await reconcileMissingOrderEvents();
    await sweepDelayedFulfillment();
    await sweepExpiringCoupons();
    await drainOutbox();
  } catch (err) {
    console.error('[Worker] sweep error:', err.message);
  }
};

export const startWorker = ({ intervalMs = Number(process.env.WORKER_INTERVAL_MS) || 5000 } = {}) => {
  if (timer) return;
  timer = setInterval(runWorkerTick, intervalMs);
  slowTimer = setInterval(runSlowSweeps, 10 * 60 * 1000);
  timer.unref?.();
  slowTimer.unref?.();
  runWorkerTick();
  setTimeout(runSlowSweeps, 15000).unref?.();
  console.log(`[Worker] notification worker started (poll ${intervalMs}ms)`);
};

export const stopWorker = () => {
  clearInterval(timer);
  clearInterval(slowTimer);
  timer = null;
  slowTimer = null;
};
