import express from 'express';
import crypto from 'crypto';
import { verifyPaymentWebhook } from '../services/paymentService.js';

const router = express.Router();

/**
 * Safepay Webhook Handler (Pakistan Domestic Payment Provider)
 * Reference: https://getsafepay.com/docs/api/webhooks
 * Verifies HMAC-SHA256 signature using SAFEPAY_WEBHOOK_SECRET
 */
router.post(
  '/safepay',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const signature = req.headers['x-sfpy-signature'];
    const secret = process.env.SAFEPAY_WEBHOOK_SECRET;

    if (!secret) {
      console.warn('[Safepay Webhook] SAFEPAY_WEBHOOK_SECRET is not configured.');
      return res.status(500).json({ error: 'Safepay webhook secret not configured.' });
    }

    if (!signature) {
      return res.status(400).json({ error: 'Missing Safepay signature header (x-sfpy-signature).' });
    }

    const calculatedSig = crypto
      .createHmac('sha256', secret)
      .update(req.body)
      .digest('hex');

    if (signature !== calculatedSig) {
      console.error('[Safepay Webhook] Invalid HMAC signature.');
      return res.status(400).json({ error: 'Invalid webhook signature.' });
    }

    try {
      const payload = JSON.parse(req.body.toString('utf8'));
      const { data, event_type, id: eventId } = payload;

      // Safepay event processing
      const orderNumber = data?.metadata?.order_number || data?.order_id;
      if (!orderNumber) {
        return res.status(200).json({ received: true, handled: false, reason: 'Missing order_number' });
      }

      const isSucceeded = event_type === 'payment.completed' || data?.status === 'PAID';
      const status = isSucceeded ? 'succeeded' : 'failed';
      const payloadHash = crypto.createHash('sha256').update(req.body).digest('hex');

      await verifyPaymentWebhook({
        provider: 'safepay',
        eventId: eventId || `sfpy-${Date.now()}`,
        eventType: event_type || 'payment.status',
        transactionId: data?.token || data?.tracker?.token || 'safepay-token',
        orderNumber,
        status,
        payloadHash,
      });

      return res.status(200).json({ received: true, handled: true });
    } catch (err) {
      console.error(`[Safepay Webhook] Processing error: ${err.message}`);
      return res.status(200).json({ received: true, error: err.message });
    }
  }
);

export default router;
