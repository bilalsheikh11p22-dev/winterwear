import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { apiLimiter } from '../../middleware/rateLimiter.js';
import { createReviewSchema } from '../../validators/reviewValidators.js';
import {
  getProductReviews,
  createReview,
  moderateReview,
  deleteReview,
} from '../../controllers/reviewController.js';

const router = Router();

// GET /api/v1/reviews/product/:productId (Public)
router.get('/product/:productId', apiLimiter, getProductReviews);

// Protected routes
router.use(authenticate);

// POST /api/v1/reviews (Create Review)
router.post('/', apiLimiter, validate(createReviewSchema), createReview);

// PATCH /api/v1/reviews/:id/moderate
router.patch('/:id/moderate', authorize(['admin', 'super_admin', 'customer_support']), moderateReview);

// DELETE /api/v1/reviews/:id
router.delete('/:id', authorize(['admin', 'super_admin']), deleteReview);

export default router;
