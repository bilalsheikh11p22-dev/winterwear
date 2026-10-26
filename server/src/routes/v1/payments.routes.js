import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { apiLimiter } from '../../middleware/rateLimiter.js';
import { initiatePayment, getPaymentStatus, initiateRefund } from '../../services/paymentService.js';
import Payment from '../../models/Payment.js';

const router = Router();

router.use(authenticate, apiLimiter);

// POST /api/v1/payments/create-session
router.post('/create-session', async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { orderId, provider, idempotencyKey } = req.body;

    const result = await initiatePayment({
      orderId,
      userId,
      provider: provider || 'stripe',
      idempotencyKey: idempotencyKey || req.headers['idempotency-key'] || `${orderId}-${Date.now()}`,
    });

    return res.status(200).json({
      success: true,
      message: 'Payment session created',
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/payments/initiate (alias for compatibility)
router.post('/initiate', async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { orderId, provider, idempotencyKey } = req.body;

    const result = await initiatePayment({
      orderId,
      userId,
      provider: provider || 'stripe',
      idempotencyKey: idempotencyKey || req.headers['idempotency-key'] || `${orderId}-${Date.now()}`,
    });

    return res.status(200).json({
      success: true,
      message: 'Payment initialized',
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/payments/:paymentId/status
router.get('/:paymentId/status', async (req, res, next) => {
  try {
    const { paymentId } = req.params;
    const payment = await getPaymentStatus(paymentId, req.user);

    return res.status(200).json({
      success: true,
      message: 'Payment status retrieved',
      data: payment,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/payments/:paymentId/refund
router.post(
  '/:paymentId/refund',
  authorize(['admin', 'super_admin', 'finance']),
  async (req, res, next) => {
    try {
      const { paymentId } = req.params;
      const { amount, reason } = req.body;

      const result = await initiateRefund({
        paymentId,
        amount,
        reason,
        actorId: req.user._id,
        actorRole: req.user.role,
      });

      return res.status(200).json({
        success: true,
        message: 'Refund processed successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/payments/order/:orderNumber
router.get('/order/:orderNumber', async (req, res, next) => {
  try {
    const { orderNumber } = req.params;
    const payment = await Payment.findOne({ orderNumber }).sort({ createdAt: -1 });

    if (!payment) {
      const error = new Error('No payment records found for this order');
      error.status = 404;
      throw error;
    }

    return res.status(200).json({
      success: true,
      message: 'Payment status retrieved',
      data: payment,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
