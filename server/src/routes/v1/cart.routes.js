import { Router } from 'express';
import { authenticate, optionalAuthenticate as optionalAuth } from '../../middleware/authenticate.js';
import { validate } from '../../middleware/validate.js';
import { apiLimiter } from '../../middleware/rateLimiter.js';
import { addItemSchema, updateItemSchema } from '../../validators/cartValidators.js';
import {
  getMyCart,
  addItem,
  updateItem,
  removeItem,
  clearCart,
  mergeCart,
} from '../../controllers/cartController.js';

const router = Router();

router.use(apiLimiter);

// GET /api/v1/cart
router.get('/', optionalAuth, getMyCart);

// POST /api/v1/cart/items
router.post('/items', optionalAuth, validate(addItemSchema), addItem);

// PATCH /api/v1/cart/items/:itemId
router.patch('/items/:itemId', optionalAuth, validate(updateItemSchema), updateItem);

// DELETE /api/v1/cart/items/:itemId
router.delete('/items/:itemId', optionalAuth, removeItem);

// DELETE /api/v1/cart
router.delete('/', optionalAuth, clearCart);

// POST /api/v1/cart/merge
router.post('/merge', authenticate, mergeCart);

export default router;
