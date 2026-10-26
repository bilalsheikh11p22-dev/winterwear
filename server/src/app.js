import express from 'express';
import { UPLOADS_ROOT } from './services/localStorageService.js';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import cookieParser from 'cookie-parser';

import stripeWebhookRouter from './webhooks/stripeWebhook.js';
import safepayWebhookRouter from './webhooks/safepayWebhook.js';
import { setupSwagger } from './config/swagger.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

// Route Imports
import authRoutes from './routes/v1/auth.routes.js';
import productRoutes from './routes/v1/products.routes.js';
import categoryRoutes from './routes/v1/categories.routes.js';
import cartRoutes from './routes/v1/cart.routes.js';
import wishlistRoutes from './routes/v1/wishlist.routes.js';
import orderRoutes from './routes/v1/orders.routes.js';
import inventoryRoutes from './routes/v1/inventory.routes.js';
import adminRoutes from './routes/v1/admin.routes.js';
import couponRoutes from './routes/v1/coupons.routes.js';
import reviewRoutes from './routes/v1/reviews.routes.js';
import mediaRoutes from './routes/v1/media.routes.js';
import riderRoutes from './routes/v1/riders.routes.js';
import addressRoutes from './routes/v1/addresses.routes.js';
import paymentRoutes from './routes/v1/payments.routes.js';
import bannerRoutes from './routes/v1/banners.routes.js';
import campaignRoutes from './routes/v1/campaigns.routes.js';
import checkoutRoutes from './routes/v1/checkout.routes.js';
import aiRoutes from './routes/v1/ai.routes.js';
import notificationRoutes from './routes/v1/notifications.routes.js';
import adminCouponRoutes from './routes/v1/adminCoupons.routes.js';
import adminNotificationRoutes from './routes/v1/adminNotifications.routes.js';

const app = express();

// Trust reverse proxy (Render, Railway, Vercel)
app.set('trust proxy', 1);

// Mount raw body webhook routes BEFORE express.json()
app.use('/api/v1/webhooks', stripeWebhookRouter);
app.use('/api/v1/webhooks', safepayWebhookRouter);

// Standard Middlewares
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

const allowedOrigins = [
  process.env.CLIENT_URL,
  process.env.FRONTEND_URL,
  process.env.CORS_ORIGIN,
  'http://localhost:5173',
  'http://localhost:3000',
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, postman)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
        return callback(null, true);
      }
      return callback(new Error('Blocked by CORS policy'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-guest-id', 'idempotency-key'],
  })
);

app.use(cookieParser());
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Swagger API Documentation
setupSwagger(app);

// Health Check Endpoint (liveness — always returns 200 if process is alive)
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'online',
    timestamp: new Date().toISOString(),
    service: 'WinterWear Core Engine',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  });
});

// Readiness Endpoint — returns 503 until MongoDB is connected
app.get('/api/ready', (req, res) => {
  // mongoose readyState: 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
  import('mongoose').then(({ default: mongoose }) => {
    const dbReady = mongoose.connection.readyState === 1;
    if (dbReady) {
      return res.status(200).json({
        success: true,
        status: 'ready',
        db: 'connected',
        timestamp: new Date().toISOString(),
      });
    }
    return res.status(503).json({
      success: false,
      status: 'not_ready',
      db: 'disconnected',
      timestamp: new Date().toISOString(),
    });
  });
});

// Locally stored uploads (development fallback when Cloudinary is not configured)
app.use('/uploads', express.static(UPLOADS_ROOT, { maxAge: '7d', fallthrough: true }));

// Primary Versioned API Routes (v1)
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/categories', categoryRoutes);
app.use('/api/v1/cart', cartRoutes);
app.use('/api/v1/wishlist', wishlistRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/inventory', inventoryRoutes);
// Specific admin sub-routers first so they are matched before the generic admin router
app.use('/api/v1/admin/coupons', adminCouponRoutes);
app.use('/api/v1/admin/notifications', adminNotificationRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/coupons', couponRoutes);
app.use('/api/v1/reviews', reviewRoutes);
app.use('/api/v1/media', mediaRoutes);
app.use('/api/v1/riders', riderRoutes);
app.use('/api/v1/addresses', addressRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/banners', bannerRoutes);
app.use('/api/v1/campaigns', campaignRoutes);
app.use('/api/v1/checkout', checkoutRoutes);
app.use('/api/v1/ai', aiRoutes);
app.use('/api/v1/notifications', notificationRoutes);

// Compatibility aliases for /api/* without v1 prefix
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/ai', aiRoutes);

// Error Handling Middlewares
app.use(notFound);
app.use(errorHandler);

export default app;
