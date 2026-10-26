import { ENV } from './env.js';

/**
 * Payment Provider Configuration and Service Boundary
 */
export const PAYMENT_CONFIG = {
  provider: ENV.PAYMENTS.PROVIDER,
  supportedMethods: ['card', 'cod'],
  isStripeConfigured: !!(ENV.PAYMENTS.STRIPE_SECRET_KEY && ENV.PAYMENTS.STRIPE_WEBHOOK_SECRET),
  isSafepayConfigured: !!(ENV.PAYMENTS.SAFEPAY_API_KEY && ENV.PAYMENTS.SAFEPAY_WEBHOOK_SECRET),
  isCodEnabled: ENV.PAYMENTS.ENABLE_COD,

  // Status mapping to standard payment state machine
  validStatuses: ['pending', 'requires_action', 'succeeded', 'failed', 'refunded', 'partially_refunded'],

  // Strict transition map
  allowedTransitions: {
    pending: ['requires_action', 'succeeded', 'failed'],
    requires_action: ['succeeded', 'failed'],
    succeeded: ['refunded', 'partially_refunded'],
    failed: [],
    refunded: [],
    partially_refunded: ['refunded'],
  },
};

export const canTransitionPayment = (currentStatus, targetStatus) => {
  const allowed = PAYMENT_CONFIG.allowedTransitions[currentStatus] || [];
  return allowed.includes(targetStatus);
};
