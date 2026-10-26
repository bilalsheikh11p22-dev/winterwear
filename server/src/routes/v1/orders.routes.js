import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { checkoutLimiter, apiLimiter } from '../../middleware/rateLimiter.js';
import {
  checkoutSchema,
  orderStatusTransitionSchema,
} from '../../validators/orderValidators.js';
import {
  checkout,
  getMyOrders,
  getOrderById,
  updateOrderStatus,
  trackOrder,
  cancelOrder,
  requestReturn,
} from '../../controllers/orderController.js';

const router = Router();

// Public Order Tracking: GET /api/v1/orders/:orderNumber/track
router.get('/:orderNumber/track', apiLimiter, trackOrder);

// All subsequent routes require authentication
router.use(authenticate);

// POST /api/v1/orders (Checkout)
router.post('/', checkoutLimiter, validate(checkoutSchema), checkout);

// GET /api/v1/orders (My Orders)
router.get('/', apiLimiter, getMyOrders);

// GET /api/v1/orders/:id (Order Details)
router.get('/:id', apiLimiter, getOrderById);

// POST /api/v1/orders/:id/cancel (Cancel order)
router.post('/:id/cancel', apiLimiter, cancelOrder);

// POST /api/v1/orders/:id/return-request (Return request)
router.post('/:id/return-request', apiLimiter, requestReturn);

// PATCH /api/v1/orders/:id/status (Transition Status)
router.patch(
  '/:id/status',
  authorize(['admin', 'super_admin', 'fulfillment', 'inventory_manager']),
  validate(orderStatusTransitionSchema),
  updateOrderStatus
);

export default router;
