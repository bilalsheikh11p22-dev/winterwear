import { Router } from 'express';
import { authenticate, optionalAuthenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { apiLimiter } from '../../middleware/rateLimiter.js';
import {
  createCouponSchema, updateCouponSchema, couponIdSchema, validateCouponSchema,
} from '../../validators/couponValidators.js';
import {
  listCoupons, createCoupon, updateCoupon, deleteCoupon, validateCoupon, getAvailableCoupons,
} from '../../controllers/couponController.js';

const router = Router();
const MARKETING = ['admin', 'super_admin', 'marketing_manager'];

// Cart-based preview. Optional auth lets per-customer rules be checked for signed-in users.
router.post('/validate', apiLimiter, optionalAuthenticate, validate(validateCouponSchema), validateCoupon);

router.use(authenticate);

// Coupons the signed-in customer may use right now
router.get('/available', apiLimiter, getAvailableCoupons);

// Legacy staff endpoints (kept for existing clients)
router.get('/', authorize(MARKETING), listCoupons);
router.post('/', authorize(MARKETING), validate(createCouponSchema), createCoupon);
router.put('/:id', authorize(MARKETING), validate(updateCouponSchema), updateCoupon);
router.delete('/:id', authorize('admin', 'super_admin'), validate(couponIdSchema), deleteCoupon);

export default router;
