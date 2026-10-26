import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { uploadMiddleware } from '../../middleware/uploadValidation.js';
import {
  uploadMedia,
  getUploadSignature,
  confirmDirectUpload,
  listMedia,
  getMediaById,
  updateMediaMetadata,
  deleteMedia,
  checkMediaReferences,
} from '../../controllers/mediaController.js';

const router = Router();

// All media endpoints require authentication
router.use(authenticate);

// GET /api/v1/media (List & search media library)
router.get(
  '/',
  authorize(['super_admin', 'admin', 'marketing', 'inventory_manager']),
  listMedia
);

// GET /api/v1/media/:id (Get single asset metadata and references)
router.get(
  '/:id',
  authorize(['super_admin', 'admin', 'marketing', 'inventory_manager']),
  getMediaById
);

// GET /api/v1/media/:id/references (Check if asset is in use)
router.get(
  '/:id/references',
  authorize(['super_admin', 'admin', 'marketing', 'inventory_manager']),
  checkMediaReferences
);

// POST /api/v1/media/upload (Server-side multipart upload stream)
router.post(
  '/upload',
  authorize(['super_admin', 'admin', 'marketing', 'marketing_manager', 'inventory_manager']),
  uploadMiddleware.single('file'),
  uploadMedia
);

// POST /api/v1/media/upload-signature (Generate signed parameters for direct browser upload)
router.post(
  '/upload-signature',
  authorize(['super_admin', 'admin', 'marketing', 'inventory_manager']),
  getUploadSignature
);

// POST /api/v1/media/confirm-direct-upload (Persist metadata after direct upload)
router.post(
  '/confirm-direct-upload',
  authorize(['super_admin', 'admin', 'marketing', 'inventory_manager']),
  confirmDirectUpload
);

// PATCH /api/v1/media/:id (Edit metadata: alt text, caption, category, tags)
router.patch(
  '/:id',
  authorize(['super_admin', 'admin', 'marketing', 'inventory_manager']),
  updateMediaMetadata
);

// DELETE /api/v1/media/:id (Safe deletion with reference check)
router.delete(
  '/:id',
  authorize(['super_admin', 'admin']),
  deleteMedia
);

export default router;
