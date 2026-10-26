import express from 'express';
import Stripe from 'stripe';
import crypto from 'crypto';
import { verifyPaymentWebhook } from '../services/paymentService.js';

const router = express.Router();

/**
 * Stripe Webhook Handler
 * Must use raw body — DO NOT apply express.json() to this route.
 * Mount this router BEFORE the global json() middleware in app.js.
 */
router.post(
  '/stripe',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error('[Stripe Webhook] STRIPE_WEBHOOK_SECRET is not configured.');
      return res.status(500).json({ error: 'Webhook secret not configured.' });
    }

    let event;
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
      console.error(`[Stripe Webhook] Signature verification failed: ${err.message}`);
      return res.status(400).json({ error: `Webhook signature invalid: ${err.message}` });
    }

    const { id: eventId, type: eventType, data } = event;

    // Handle both direct PaymentIntents and hosted Checkout Sessions
    const HANDLED_EVENTS = [
      'checkout.session.completed',
      'payment_intent.succeeded',
      'payment_intent.payment_failed',
      'charge.refunded',
    ];

    if (!HANDLED_EVENTS.includes(eventType)) {
      return res.status(200).json({ received: true, handled: false });
    }

    try {
      const eventObject = data.object;
      let orderNumber = eventObject.metadata?.orderNumber;
      let isSucceeded = false;
      let transactionId = eventObject.id;

      if (eventType === 'checkout.session.completed') {
        orderNumber = eventObject.metadata?.orderNumber || eventObject.client_reference_id;
        isSucceeded = eventObject.payment_status === 'paid';
        transactionId = eventObject.payment_intent || eventObject.id;
      } else if (eventType === 'payment_intent.succeeded') {
        isSucceeded = true;
      } else if (eventType === 'payment_intent.payment_failed') {
        isSucceeded = false;
      } else if (eventType === 'charge.refunded') {
        isSucceeded = false;
      }

      if (!orderNumber) {
        console.warn(`[Stripe Webhook] Event ${eventId} (${eventType}) missing orderNumber in metadata.`);
        return res.status(200).json({ received: true, handled: false, reason: 'No orderNumber in metadata' });
      }

      const status = isSucceeded ? 'succeeded' : 'failed';
      const payloadHash = crypto.createHash('sha256').update(req.body).digest('hex');

      await verifyPaymentWebhook({
        provider: 'stripe',
        eventId,
        eventType,
        transactionId,
        orderNumber,
        status,
        payloadHash,
      });

      console.log(`[Stripe Webhook] Processed event ${eventType} for order ${orderNumber} — status: ${status}`);
      return res.status(200).json({ received: true, handled: true });
    } catch (err) {
      console.error(`[Stripe Webhook] Processing error: ${err.message}`);
      return res.status(200).json({ received: true, error: err.message });
    }
  }
);

export default router;
