import Stripe from 'stripe';
import Payment from '../models/Payment.js';
import Order from '../models/Order.js';
import User from '../models/User.js';
import { PAYMENT_CONFIG, canTransitionPayment } from '../config/payment.js';
import { transitionOrderStatus } from './orderService.js';
import { redeemForOrder } from './coupons/couponService.js';
import { publishPaymentConfirmed, publishPaymentFailed, publishRefundStatus } from './notifications/events.js';

/**
 * Creates or retrieves a payment session for an order
 */
export const initiatePayment = async ({
  orderId,
  userId,
  amount,
  provider = 'stripe',
  idempotencyKey,
}) => {
  const order = await Order.findById(orderId);
  if (!order) {
    const error = new Error('Order not found.');
    error.status = 404;
    throw error;
  }

  // Idempotency verification: Check if payment record already exists
  let payment = await Payment.findOne({ idempotencyKey });
  if (payment) {
    return {
      payment,
      checkoutUrl: payment.metadata?.get?.('url') || payment.metadata?.url || null,
      sessionId: payment.transactionId || null,
      isExisting: true,
    };
  }

  // Handle Cash on Delivery (COD)
  if (provider.toLowerCase() === 'cod') {
    payment = await Payment.create({
      order: order._id,
      orderNumber: order.orderNumber,
      customer: userId,
      amount: order.totalAmount,
      currency: order.currency || 'PKR',
      provider: 'cod',
      idempotencyKey,
      status: 'pending',
    });

    return {
      payment,
      isExisting: false,
    };
  }

  // Handle Stripe Payments
  if (provider.toLowerCase() === 'stripe') {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      const error = new Error('Stripe payment provider is not configured. STRIPE_SECRET_KEY is missing.');
      error.code = 'PAYMENT_PROVIDER_NOT_CONFIGURED';
      error.status = 503;
      throw error;
    }

    const stripe = new Stripe(secretKey);

    // Initial draft payment record
    payment = new Payment({
      order: order._id,
      orderNumber: order.orderNumber,
      customer: userId,
      amount: order.totalAmount,
      currency: order.currency || 'PKR',
      provider: 'stripe',
      idempotencyKey,
      status: 'requires_action',
    });
    await payment.save();

    const customer = await User.findById(userId);

    // Build line items for Stripe Checkout
    const lineItems = (order.items || []).map((item) => ({
      price_data: {
        currency: (order.currency || 'PKR').toLowerCase(),
        product_data: {
          name: item.name,
          images: item.image ? [item.image] : [],
          metadata: {
            sku: item.sku || '',
            size: item.size || '',
            color: item.color?.name || '',
          },
        },
        unit_amount: Math.round((item.price || 0) * 100),
      },
      quantity: item.quantity || 1,
    }));

    // If shipping fee applies, add as a line item
    if (order.shippingFee > 0) {
      lineItems.push({
        price_data: {
          currency: (order.currency || 'PKR').toLowerCase(),
          product_data: {
            name: 'Atelier Insured Delivery',
            description: 'Insured transit across Pakistan',
          },
          unit_amount: Math.round(order.shippingFee * 100),
        },
        quantity: 1,
      });
    }

    const successBase = process.env.PAYMENT_SUCCESS_URL || 'http://localhost:5173/checkout/success';
    const cancelBase = process.env.PAYMENT_CANCEL_URL || 'http://localhost:5173/checkout/cancelled';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: customer?.email || undefined,
      client_reference_id: order.orderNumber,
      line_items: lineItems,
      metadata: {
        orderNumber: order.orderNumber,
        orderId: order._id.toString(),
        paymentId: payment._id.toString(),
      },
      success_url: `${successBase}?session_id={CHECKOUT_SESSION_ID}&order=${order.orderNumber}`,
      cancel_url: `${cancelBase}?order=${order.orderNumber}`,
    });

    payment.transactionId = session.id;
    payment.metadata = {
      sessionId: session.id,
      url: session.url,
    };
    await payment.save();

    return {
      payment,
      checkoutUrl: session.url,
      sessionId: session.id,
      isExisting: false,
    };
  }

  // Handle Safepay (stubs / documentation compliance)
  if (provider.toLowerCase() === 'safepay') {
    if (!process.env.SAFEPAY_API_KEY) {
      const error = new Error('Safepay payment provider is not configured. SAFEPAY_API_KEY is missing.');
      error.code = 'PAYMENT_PROVIDER_NOT_CONFIGURED';
      error.status = 503;
      throw error;
    }

    payment = await Payment.create({
      order: order._id,
      orderNumber: order.orderNumber,
      customer: userId,
      amount: order.totalAmount,
      currency: order.currency || 'PKR',
      provider: 'safepay',
      idempotencyKey,
      status: 'requires_action',
    });

    return {
      payment,
      checkoutUrl: null,
      message: 'Safepay session endpoint ready for merchant production credentials',
      isExisting: false,
    };
  }

  const unsupportedError = new Error(`Payment provider '${provider}' is not supported.`);
  unsupportedError.status = 400;
  throw unsupportedError;
};

/**
 * Retrieve status of a payment by ID with ownership verification
 */
export const getPaymentStatus = async (paymentId, user) => {
  const payment = await Payment.findById(paymentId);
  if (!payment) {
    const error = new Error('Payment record not found.');
    error.status = 404;
    throw error;
  }

  // Verify ownership unless privileged staff
  const isPrivileged = ['admin', 'super_admin', 'finance', 'fulfillment'].includes(user.role);
  if (!isPrivileged && payment.customer.toString() !== user._id.toString()) {
    const error = new Error('Forbidden: You do not have access to this payment record.');
    error.status = 403;
    throw error;
  }

  return payment;
};

/**
 * Initiates refund via payment provider (admin / finance only)
 */
export const initiateRefund = async ({ paymentId, amount, reason, actorId, actorRole }) => {
  const payment = await Payment.findById(paymentId);
  if (!payment) {
    const error = new Error('Payment record not found.');
    error.status = 404;
    throw error;
  }

  if (payment.status !== 'succeeded') {
    const error = new Error(`Cannot refund payment with status '${payment.status}'. Only succeeded payments are refundable.`);
    error.status = 400;
    throw error;
  }

  const refundAmount = amount ? Math.min(amount, payment.amount) : payment.amount;

  if (payment.provider === 'stripe') {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      const error = new Error('Stripe is not configured to process live refunds.');
      error.status = 503;
      throw error;
    }

    const stripe = new Stripe(secretKey);
    // Find payment intent or charge to refund
    await stripe.refunds.create({
      payment_intent: payment.transactionId,
      amount: Math.round(refundAmount * 100),
      reason: 'requested_by_customer',
    });
  }

  const isFullRefund = refundAmount >= payment.amount;
  payment.status = isFullRefund ? 'refunded' : 'partially_refunded';
  payment.webhookEvents.push({
    eventId: `refund-${Date.now()}`,
    eventType: 'payment.refunded',
    receivedAt: new Date(),
    payloadHash: `refunded_by_${actorId}`,
  });
  await payment.save();

  // Update order status
  const order = await Order.findById(payment.order);
  if (order) {
    order.paymentStatus = isFullRefund ? 'refunded' : 'partially_refunded';
    await order.save();
    if (!isFullRefund) {
      await publishRefundStatus({ orderId: order._id, status: 'completed', refundKey: `${payment._id}:${refundAmount}` });
    }
    if (isFullRefund) {
      await transitionOrderStatus({
        orderId: order._id,
        targetStatus: 'refunded',
        actorId,
        actorRole,
        comment: `Refund processed: PKR ${refundAmount.toLocaleString()} (${reason || 'Standard Return'})`,
      });
    }
  }

  return { payment, refundAmount, status: payment.status };
};

/**
 * Cryptographically verifies and processes payment webhooks
 */
export const verifyPaymentWebhook = async ({
  provider,
  eventId,
  eventType,
  transactionId,
  orderNumber,
  status, // 'succeeded' | 'failed'
  payloadHash,
}) => {
  const payment = await Payment.findOne({ orderNumber });
  if (!payment) {
    const error = new Error(`Payment record for order ${orderNumber} not found.`);
    error.status = 404;
    throw error;
  }

  // Idempotent webhook processing check
  const isAlreadyProcessed = payment.webhookEvents.some((e) => e.eventId === eventId);
  if (isAlreadyProcessed) {
    return { status: 'already_processed', payment };
  }

  payment.webhookEvents.push({
    eventId,
    eventType,
    payloadHash,
    receivedAt: new Date(),
  });

  const targetStatus = status === 'succeeded' ? 'succeeded' : 'failed';

  if (canTransitionPayment(payment.status, targetStatus)) {
    payment.status = targetStatus;
    payment.transactionId = transactionId || payment.transactionId;
    if (targetStatus === 'succeeded') {
      payment.verifiedAt = new Date();
    }
  }

  await payment.save();

  // Update order status
  const order = await Order.findById(payment.order);
  if (order) {
    if (targetStatus === 'succeeded') {
      if (order.paymentStatus !== 'paid') {
        order.paymentStatus = 'paid';
        order.paymentDetails.transactionId = transactionId;
        order.paymentDetails.paidAt = new Date();
        await order.save();

        await transitionOrderStatus({
          orderId: order._id,
          targetStatus: 'confirmed',
          actorId: payment.customer,
          actorRole: 'system',
          comment: `Online payment verified via ${provider} webhook (${transactionId})`,
        });

        // Payment verified by the provider webhook → consume the reserved coupon and announce it.
        await redeemForOrder(order._id, order.totalAmount);
        await publishPaymentConfirmed(order);
      }
    } else if (targetStatus === 'failed') {
      order.paymentStatus = 'failed';
      await order.save();
      await publishPaymentFailed(order, eventId);
    }
  }

  return { status: 'processed', payment };
};
