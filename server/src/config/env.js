import dotenv from 'dotenv';
dotenv.config();

const INSECURE_JWT_DEFAULTS = [
  'winterwear_access_secret_super_secure_key_2026',
  'winterwear_refresh_secret_super_secure_key_2026',
];

const requiredEnvVars = [];

// In production, ensure key secrets are explicitly set
if (process.env.NODE_ENV === 'production') {
  requiredEnvVars.push(
    'MONGODB_URI',
    'JWT_ACCESS_SECRET',
    'JWT_REFRESH_SECRET',
    'CORS_ORIGIN',
    'CLIENT_URL'
  );
}

const missing = requiredEnvVars.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`[FATAL] Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

// Prevent hardcoded insecure JWT defaults from being used in production
if (process.env.NODE_ENV === 'production') {
  if (
    INSECURE_JWT_DEFAULTS.includes(process.env.JWT_ACCESS_SECRET) ||
    INSECURE_JWT_DEFAULTS.includes(process.env.JWT_REFRESH_SECRET)
  ) {
    console.error(
      '[FATAL] Production environment is using insecure default JWT secrets. ' +
        'Set unique, high-entropy values for JWT_ACCESS_SECRET and JWT_REFRESH_SECRET.'
    );
    process.exit(1);
  }
}

export const ENV = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  MONGODB_URI: process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/winterwear',
  
  JWT: {
    ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || 'winterwear_access_secret_super_secure_key_2026',
    REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'winterwear_refresh_secret_super_secure_key_2026',
    ACCESS_TTL: process.env.ACCESS_TOKEN_TTL || '15m',
    REFRESH_TTL: process.env.REFRESH_TOKEN_TTL || '7d',
  },

  CLOUDINARY: {
    CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || '',
    API_KEY: process.env.CLOUDINARY_API_KEY || '',
    API_SECRET: process.env.CLOUDINARY_API_SECRET || '',
    IS_CONFIGURED: !!(
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    ),
  },

  PAYMENTS: {
    PROVIDER: process.env.PAYMENT_PROVIDER || 'stripe', // 'stripe' | 'safepay' | 'payfast'
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || '',
    SAFEPAY_API_KEY: process.env.SAFEPAY_API_KEY || '',
    SAFEPAY_WEBHOOK_SECRET: process.env.SAFEPAY_WEBHOOK_SECRET || '',
    ENABLE_COD: process.env.ENABLE_CASH_ON_DELIVERY !== 'false',
    PAYMENT_SUCCESS_URL: process.env.PAYMENT_SUCCESS_URL || 'http://localhost:5173/checkout/success',
    PAYMENT_CANCEL_URL: process.env.PAYMENT_CANCEL_URL || 'http://localhost:5173/checkout/cancelled',
    DEFAULT_CURRENCY: process.env.DEFAULT_CURRENCY || 'PKR',
    FREE_SHIPPING_THRESHOLD_PKR: Number(process.env.FREE_SHIPPING_THRESHOLD_PKR) || 5000,
    FLAT_SHIPPING_FEE_PKR: Number(process.env.FLAT_SHIPPING_FEE_PKR) || 250,
    RESERVATION_EXPIRY_MINUTES: Number(process.env.RESERVATION_EXPIRY_MINUTES) || 30,
  },

  SMTP: {
    HOST: process.env.SMTP_HOST || '',
    PORT: Number(process.env.SMTP_PORT) || 587,
    USER: process.env.SMTP_USER || '',
    PASSWORD: process.env.SMTP_PASSWORD || '',
    EMAIL_FROM: process.env.EMAIL_FROM || 'WinterWear Atelier <concierge@winterwear.fashion>',
    IS_CONFIGURED: !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD),
  },
};

export default ENV;
