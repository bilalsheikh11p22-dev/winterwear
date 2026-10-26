import { v2 as cloudinary } from 'cloudinary';
import { ENV } from './env.js';

// Initialize Cloudinary SDK
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || ENV.CLOUDINARY?.CLOUD_NAME || '',
  api_key: process.env.CLOUDINARY_API_KEY || ENV.CLOUDINARY?.API_KEY || '',
  api_secret: process.env.CLOUDINARY_API_SECRET || ENV.CLOUDINARY?.API_SECRET || '',
  secure: true,
});

/**
 * Checks whether valid Cloudinary credentials have been provided.
 */
export const isCloudinaryConfigured = () => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || ENV.CLOUDINARY?.CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY || ENV.CLOUDINARY?.API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET || ENV.CLOUDINARY?.API_SECRET;
  const isPlaceholder = (v) => /your|xxx|placeholder|example|changeme|^<.*>$/i.test(String(v || ''));
  return Boolean(
    cloudName && apiKey && apiSecret &&
    !isPlaceholder(cloudName) && !isPlaceholder(apiKey) && !isPlaceholder(apiSecret)
  );
};

/**
 * Validates Cloudinary configuration and throws an actionable error if missing.
 */
export const assertCloudinaryConfigured = () => {
  if (!isCloudinaryConfigured()) {
    const error = new Error(
      'Cloudinary is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in environment variables.'
    );
    error.status = 503;
    error.code = 'CLOUDINARY_NOT_CONFIGURED';
    throw error;
  }
};

/**
 * Generates an authenticated server-side signature for direct browser uploads.
 * Keeps API Secret safe on the server at all times.
 */
export const generateUploadSignature = ({ folder = 'winterwear/general', tags = [], timestamp = Math.round(new Date().getTime() / 1000) } = {}) => {
  assertCloudinaryConfigured();

  const apiSecret = process.env.CLOUDINARY_API_SECRET || ENV.CLOUDINARY?.API_SECRET;
  const apiKey = process.env.CLOUDINARY_API_KEY || ENV.CLOUDINARY?.API_KEY;
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || ENV.CLOUDINARY?.CLOUD_NAME;

  const paramsToSign = {
    folder,
    timestamp,
    ...(tags.length > 0 && { tags: tags.join(',') }),
  };

  const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret);

  return {
    signature,
    timestamp,
    apiKey,
    cloudName,
    folder,
  };
};

/**
 * Generates optimized delivery URL with responsive transformations
 */
export const getTransformedUrl = (publicId, {
  resourceType = 'image',
  width,
  height,
  crop = 'fill',
  quality = 'auto',
  format = 'auto',
  aspectRatio,
  cloudName = process.env.CLOUDINARY_CLOUD_NAME || ENV.CLOUDINARY?.CLOUD_NAME || 'winterwear-archive',
} = {}) => {
  if (!publicId) return '';
  return cloudinary.url(publicId, {
    cloud_name: cloudName,
    resource_type: resourceType,
    secure: true,
    transformation: [
      {
        ...(width && { width }),
        ...(height && { height }),
        ...(crop && { crop }),
        ...(aspectRatio && { aspect_ratio: aspectRatio }),
        quality,
        fetch_format: format,
      },
    ],
  });
};

export default cloudinary;
