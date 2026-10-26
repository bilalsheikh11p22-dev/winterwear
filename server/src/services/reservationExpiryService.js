import Order from '../models/Order.js';
import { transitionOrderStatus } from './orderService.js';

let intervalHandle = null;

export const startReservationExpiryJob = () => {
  if (intervalHandle) return;

  const EXPIRY_MINUTES = parseInt(process.env.RESERVATION_EXPIRY_MINUTES, 10) || 30;

  const runCleanup = async () => {
    try {
      const cutoff = new Date(Date.now() - EXPIRY_MINUTES * 60 * 1000);
      const expiredOrders = await Order.find({
        orderStatus: 'pending_payment',
        createdAt: { $lt: cutoff },
      });

      for (const order of expiredOrders) {
        try {
          await transitionOrderStatus({
            orderId: order._id,
            targetStatus: 'cancelled',
            actorId: null,
            actorRole: 'system',
            comment: `Reservation expired automatically after ${EXPIRY_MINUTES} minutes without payment confirmation.`,
          });
          console.log(`[ReservationExpiry] Cancelled expired order ${order.orderNumber} & released inventory`);
        } catch (err) {
          console.error(`[ReservationExpiry] Error cancelling ${order.orderNumber}:`, err.message);
        }
      }
    } catch (err) {
      console.error('[ReservationExpiry] Cleanup cycle error:', err.message);
    }
  };

  // Run initial pass after delay, then every 10 minutes
  setTimeout(runCleanup, 5000);
  intervalHandle = setInterval(runCleanup, 10 * 60 * 1000);

  console.log(`[ReservationExpiry] Expiry monitor started (TTL: ${EXPIRY_MINUTES}m)`);
};

export const stopReservationExpiryJob = () => {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
};
