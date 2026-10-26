import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { apiLimiter } from '../../middleware/rateLimiter.js';
import { createBannerSchema, updateBannerSchema } from '../../validators/bannerValidators.js';
import {
  getPublicBanners,
  listAllBanners,
  getBannerById,
  createBanner,
  updateBanner,
  deleteBanner,
} from '../../controllers/bannerController.js';

const router = Router();

// GET /api/v1/banners (Public active banners, filtered by placement)
router.get('/', apiLimiter, getPublicBanners);

// Protected Management Endpoints
router.use(authenticate);

// GET /api/v1/banners/admin (All banners including unpublished)
router.get('/admin', authorize(['admin', 'super_admin', 'marketing', 'marketing_manager']), listAllBanners);

// GET /api/v1/banners/:id
router.get('/:id', authorize(['admin', 'super_admin', 'marketing', 'marketing_manager']), getBannerById);

// POST /api/v1/banners
router.post(
  '/',
  authorize(['admin', 'super_admin', 'marketing', 'marketing_manager']),
  validate(createBannerSchema),
  createBanner
);

// PATCH /api/v1/banners/:id
router.patch(
  '/:id',
  authorize(['admin', 'super_admin', 'marketing', 'marketing_manager']),
  validate(updateBannerSchema),
  updateBanner
);

// DELETE /api/v1/banners/:id
router.delete('/:id', authorize(['admin', 'super_admin']), deleteBanner);

export default router;
