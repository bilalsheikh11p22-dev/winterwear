import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { apiLimiter } from '../../middleware/rateLimiter.js';
import { createCampaignSchema, updateCampaignSchema } from '../../validators/campaignValidators.js';
import {
  getPublicCampaigns,
  getCampaignBySlug,
  listAllCampaigns,
  createCampaign,
  updateCampaign,
  deleteCampaign,
} from '../../controllers/campaignController.js';

const router = Router();

// GET /api/v1/campaigns (Public active campaigns, optionally filtered by section)
router.get('/', apiLimiter, getPublicCampaigns);

// GET /api/v1/campaigns/:slug (Public single campaign by slug)
router.get('/:slug', apiLimiter, getCampaignBySlug);

// Protected Management Endpoints
router.use(authenticate);

// GET /api/v1/campaigns/admin/all
router.get('/admin/all', authorize(['admin', 'super_admin', 'marketing', 'marketing_manager']), listAllCampaigns);

// POST /api/v1/campaigns
router.post(
  '/',
  authorize(['admin', 'super_admin', 'marketing', 'marketing_manager']),
  validate(createCampaignSchema),
  createCampaign
);

// PATCH /api/v1/campaigns/:id
router.patch(
  '/:id',
  authorize(['admin', 'super_admin', 'marketing', 'marketing_manager']),
  validate(updateCampaignSchema),
  updateCampaign
);

// DELETE /api/v1/campaigns/:id
router.delete('/:id', authorize(['admin', 'super_admin']), deleteCampaign);

export default router;
