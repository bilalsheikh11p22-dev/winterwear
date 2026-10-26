import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { apiLimiter } from '../../middleware/rateLimiter.js';
import {
  getMyAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefault,
} from '../../controllers/addressController.js';

const router = Router();

router.use(authenticate, apiLimiter);

// GET /api/v1/addresses
router.get('/', getMyAddresses);

// POST /api/v1/addresses
router.post('/', addAddress);

// PUT /api/v1/addresses/:id
router.put('/:id', updateAddress);

// DELETE /api/v1/addresses/:id
router.delete('/:id', deleteAddress);

// PATCH /api/v1/addresses/:id/default
router.patch('/:id/default', setDefault);

export default router;
