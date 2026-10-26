import rateLimit from 'express-rate-limit';

// Rate limiter for authentication endpoints (login, register, reset password)
const isProd = process.env.NODE_ENV === 'production';

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProd ? 20 : 1000, // relaxed in development
  skipSuccessfulRequests: true, // only failed attempts count toward the limit
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts from this IP address. Please try again after 15 minutes.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
});

// Session refresh limiter (separate so refresh traffic can never lock out login)
export const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 100 : 2000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many session refresh attempts. Please sign in again shortly.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
});

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120, // Limit each IP to 120 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please slow down your browsing pace.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
});

// Checkout submission rate limiter
export const checkoutLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // Limit checkout orders to 10 per 5 mins
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many checkout attempts. Please wait a moment before trying again.',
    code: 'CHECKOUT_RATE_LIMIT_EXCEEDED',
  },
});

const limiterSkip = () => process.env.RATE_LIMIT_DISABLED === 'true';

// Product alert subscribe/unsubscribe (customer-facing, cheap but easy to spam)
export const subscriptionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: limiterSkip,
  message: { success: false, message: 'Too many subscription changes. Please wait a moment.', code: 'RATE_LIMIT_EXCEEDED' },
});

// Staff operations that create/launch campaigns or change coupons
export const campaignLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: limiterSkip,
  message: { success: false, message: 'Too many campaign operations. Please slow down.', code: 'RATE_LIMIT_EXCEEDED' },
});
