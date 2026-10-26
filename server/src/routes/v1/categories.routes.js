import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { apiLimiter } from '../../middleware/rateLimiter.js';
import {
  listCategories,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../../controllers/categoryController.js';

const router = Router();

// GET /api/v1/categories
router.get('/', apiLimiter, listCategories);

// GET /api/v1/categories/:slug
router.get('/:slug', apiLimiter, getCategoryBySlug);

// POST /api/v1/categories
router.post(
  '/',
  authenticate,
  authorize(['admin', 'super_admin', 'marketing']),
  createCategory
);

// PUT /api/v1/categories/:id
router.put(
  '/:id',
  authenticate,
  authorize(['admin', 'super_admin', 'marketing']),
  updateCategory
);

// DELETE /api/v1/categories/:id
router.delete(
  '/:id',
  authenticate,
  authorize(['admin', 'super_admin']),
  deleteCategory
);

export default router;
