// Replaces the always-on background worker (not possible on serverless).
// Vercel Cron calls this path; it is protected by CRON_SECRET.
import { connectDatabase } from '../src/config/database.js';
import { runWorkerTick, runSlowSweeps } from '../src/jobs/worker.js';
import Order from '../src/models/Order.js';
import { transitionOrderStatus } from '../src/services/orderService.js';

export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.authorization !== `Bearer ${secret}`) {
    res.statusCode = 401;
    return res.end('Unauthorized');
  }
  try {
    await connectDatabase();
    await runWorkerTick();
    await runSlowSweeps();

    const minutes = parseInt(process.env.RESERVATION_EXPIRY_MINUTES, 10) || 30;
    const expired = await Order.find({ orderStatus: 'pending_payment', createdAt: { $lt: new Date(Date.now() - minutes * 60000) } });
    for (const order of expired) {
      try {
        await transitionOrderStatus({ orderId: order._id, targetStatus: 'cancelled', actorId: null, actorRole: 'system', comment: `Reservation expired automatically after ${minutes} minutes without payment confirmation.` });
      } catch (e) { console.error('[cron] expiry failed', order.orderNumber, e.message); }
    }
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: true, expiredOrders: expired.length }));
  } catch (err) {
    res.statusCode = 500;
    res.end(JSON.stringify({ ok: false, message: err.message }));
  }
}
