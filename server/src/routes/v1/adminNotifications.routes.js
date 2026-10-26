import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { campaignLimiter } from '../../middleware/rateLimiter.js';
import { createCampaignSchema, campaignIdSchema, activityQuerySchema, metricsQuerySchema } from '../../validators/notificationValidators.js';
import * as c from '../../controllers/adminNotificationController.js';

const router = Router();
const ADMINS = ['admin', 'super_admin'];
const MARKETING = [...ADMINS, 'marketing_manager'];

router.use(authenticate);

// Per-customer notification data → admins only
router.get('/activity', authorize(ADMINS), validate(activityQuerySchema), c.getActivity);
router.get('/failed-deliveries', authorize(ADMINS), c.getFailedDeliveries);
router.post('/deliveries/:id/retry', authorize(ADMINS), campaignLimiter, validate(campaignIdSchema), c.retryDelivery);
router.get('/events', authorize(ADMINS), c.getEventHistory);
router.post('/events/:id/retry', authorize(ADMINS), campaignLimiter, validate(campaignIdSchema), c.retryOutboxEvent);

// Aggregates only → marketing may see them
router.get('/metrics', authorize(MARKETING), validate(metricsQuerySchema), c.getMetrics);

// Campaign manager
router.get('/campaigns', authorize(MARKETING), c.listCampaigns);
router.post('/campaigns', authorize(MARKETING), campaignLimiter, validate(createCampaignSchema), c.postCampaign);
router.get('/campaigns/:id', authorize(MARKETING), validate(campaignIdSchema), c.getCampaign);
router.get('/campaigns/:id/preview', authorize(MARKETING), validate(campaignIdSchema), c.previewCampaignHandler);
router.post('/campaigns/:id/publish', authorize(MARKETING), campaignLimiter, validate(campaignIdSchema), c.publishCampaignHandler);
router.post('/campaigns/:id/pause', authorize(MARKETING), campaignLimiter, validate(campaignIdSchema), c.pauseCampaignHandler);
router.post('/campaigns/:id/cancel', authorize(MARKETING), campaignLimiter, validate(campaignIdSchema), c.cancelCampaignHandler);

export default router;
