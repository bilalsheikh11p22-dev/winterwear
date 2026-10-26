import { Router } from 'express';
import { authenticate, optionalAuthenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { apiLimiter, subscriptionLimiter } from '../../middleware/rateLimiter.js';
import { subscribeSchema, latestProductsSchema } from '../../validators/notificationValidators.js';
import {
  getLatestProducts, subscribeToProduct, unsubscribeFromProduct, getMyProductSubscriptions,
} from '../../controllers/productAlertController.js';
import { createProductSchema, updateProductSchema } from '../../validators/productValidators.js';
import {
  getProducts,
  getProductBySlug,
  createProduct,
  updateProduct,
  deleteProduct,
  addProductImage,
  removeProductImage,
  reorderProductImages,
  setPrimaryProductImage,
} from '../../controllers/productController.js';

const router = Router();

// GET /api/v1/products
router.get('/', apiLimiter, optionalAuthenticate, getProducts);

// New arrivals feed + product alerts. These MUST be registered before '/:slug'.
router.get('/latest', apiLimiter, validate(latestProductsSchema), getLatestProducts);
router.get('/subscriptions/mine', apiLimiter, authenticate, getMyProductSubscriptions);
router.post('/:id/subscribe', subscriptionLimiter, authenticate, validate(subscribeSchema), subscribeToProduct);
router.delete('/:id/subscribe', subscriptionLimiter, authenticate, unsubscribeFromProduct);

// GET /api/v1/products/:slug
router.get('/:slug', apiLimiter, optionalAuthenticate, getProductBySlug);

// POST /api/v1/products
router.post(
  '/',
  authenticate,
  authorize(['admin', 'super_admin', 'inventory_manager']),
  validate(createProductSchema),
  createProduct
);

// PUT /api/v1/products/:id
router.put(
  '/:id',
  authenticate,
  authorize(['admin', 'super_admin', 'inventory_manager']),
  validate(updateProductSchema),
  updateProduct
);

// DELETE /api/v1/products/:id
router.delete(
  '/:id',
  authenticate,
  authorize(['admin', 'super_admin']),
  deleteProduct
);

// Product Gallery Management Routes
// POST /api/v1/products/:id/images
router.post(
  '/:id/images',
  authenticate,
  authorize(['admin', 'super_admin', 'inventory_manager']),
  addProductImage
);

// DELETE /api/v1/products/:id/images/:publicId
router.delete(
  '/:id/images/:publicId',
  authenticate,
  authorize(['admin', 'super_admin', 'inventory_manager']),
  removeProductImage
);

// PATCH /api/v1/products/:id/images/reorder
router.patch(
  '/:id/images/reorder',
  authenticate,
  authorize(['admin', 'super_admin', 'inventory_manager']),
  reorderProductImages
);

// PATCH /api/v1/products/:id/images/:publicId/primary
router.patch(
  '/:id/images/:publicId/primary',
  authenticate,
  authorize(['admin', 'super_admin', 'inventory_manager']),
  setPrimaryProductImage
);

export default router;
