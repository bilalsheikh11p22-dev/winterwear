import { Router } from 'express';

import { authenticate } from '../../middleware/authenticate.js';
import { validate } from '../../middleware/validate.js';
import { authLimiter, refreshLimiter } from '../../middleware/rateLimiter.js';

import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updateProfileSchema,
  changePasswordSchema,
} from '../../validators/authValidators.js';

import {
  register,
  login,
  refresh as refreshToken,
  logout,
  getMe,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
} from '../../controllers/authController.js';

const router = Router();

// POST /api/v1/auth/register
router.post('/register', authLimiter, validate(registerSchema), register);

// POST /api/v1/auth/login
router.post('/login', authLimiter, validate(loginSchema), login);

// POST /api/v1/auth/refresh
router.post('/refresh', refreshLimiter, refreshToken);

// POST /api/v1/auth/logout
router.post('/logout', authenticate, logout);

// GET /api/v1/auth/me
router.get('/me', authenticate, getMe);

// PATCH /api/v1/auth/me  (update own name / phone)
router.patch('/me', authenticate, validate(updateProfileSchema), updateProfile);

// POST /api/v1/auth/change-password
router.post('/change-password', authenticate, authLimiter, validate(changePasswordSchema), changePassword);

// POST /api/v1/auth/forgot-password
router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), forgotPassword);

// POST /api/v1/auth/reset-password
router.post('/reset-password', authLimiter, validate(resetPasswordSchema), resetPassword);

export default router;
