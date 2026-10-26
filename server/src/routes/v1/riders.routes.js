import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import {
  getMyDeliveries,
  pickupDelivery,
  dropDelivery,
  failDelivery,
  updateDeliveryStatus,
  submitProofOfDelivery,
  getRiderSummary,
  updateMyLocation,
} from '../../controllers/riderController.js';

const router = Router();

// Riders who have not been confirmed by an admin yet cannot touch deliveries
const requireApprovedRider = (req, res, next) => {
  const status = req.user.approvalStatus || 'approved';
  if (req.user.role === 'rider' && status !== 'approved') {
    return res.status(403).json({
      success: false,
      message:
        status === 'pending'
          ? 'Your rider account is waiting for admin confirmation.'
          : 'Your rider application was not approved.',
      code: 'RIDER_NOT_APPROVED',
      approvalStatus: status,
    });
  }
  next();
};

router.use(authenticate, authorize(['rider', 'admin', 'super_admin']), requireApprovedRider);

// GET /api/v1/riders/deliveries?scope=active|history
router.get('/deliveries', getMyDeliveries);

// GET /api/v1/riders/deliveries/summary
router.get('/deliveries/summary', getRiderSummary);

// POST /api/v1/riders/deliveries/:assignmentId/pickup   (parcel collected from warehouse)
router.post('/deliveries/:assignmentId/pickup', pickupDelivery);

// POST /api/v1/riders/deliveries/:assignmentId/drop     (parcel handed to customer)
router.post('/deliveries/:assignmentId/drop', dropDelivery);

// POST /api/v1/riders/deliveries/:assignmentId/fail
router.post('/deliveries/:assignmentId/fail', failDelivery);

// PATCH /api/v1/riders/deliveries/:assignmentId/status  (legacy)
router.patch('/deliveries/:assignmentId/status', updateDeliveryStatus);

// POST /api/v1/riders/deliveries/:assignmentId/proof    (legacy)
router.post('/deliveries/:assignmentId/proof', submitProofOfDelivery);

// PATCH /api/v1/riders/location
router.patch('/location', updateMyLocation);

export default router;
