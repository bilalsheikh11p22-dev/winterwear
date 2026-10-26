import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { campaignLimiter } from '../../middleware/rateLimiter.js';
import { createCouponSchema, updateCouponSchema, couponStatusSchema, couponIdSchema } from '../../validators/couponValidators.js';
import {
  listCoupons, getCoupon, createCoupon, updateCoupon, setCouponStatus, getCouponAnalytics,
} from '../../controllers/couponController.js';

const router = Router();
router.use(authenticate, authorize('admin', 'super_admin', 'marketing_manager'));

router.get('/', listCoupons);
router.post('/', campaignLimiter, validate(createCouponSchema), createCoupon);
router.get('/:id', validate(couponIdSchema), getCoupon);
router.patch('/:id', campaignLimiter, validate(updateCouponSchema), updateCoupon);
router.patch('/:id/status', campaignLimiter, validate(couponStatusSchema), setCouponStatus);
router.get('/:id/analytics', validate(couponIdSchema), getCouponAnalytics);

export default router;
