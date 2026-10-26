import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { apiLimiter } from '../../middleware/rateLimiter.js';
import { getWishlist, addItem, removeItem } from '../../controllers/wishlistController.js';

const router = Router();

router.use(authenticate, apiLimiter);

// GET /api/v1/wishlist
router.get('/', getWishlist);

// POST /api/v1/wishlist/items
router.post('/items', addItem);

// DELETE /api/v1/wishlist/items/:productId
router.delete('/items/:productId', removeItem);

export default router;
