import multer from 'multer';

// Storage configuration (in-memory buffer for direct streaming to Cloudinary)
const storage = multer.memoryStorage();

// Allowed MIME types
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const ALLOWED_MIME_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES];

// File filter validator
const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    const error = new Error(
      `Unsupported file type '${file.mimetype}'. Allowed formats: JPEG, PNG, WebP, AVIF for images; MP4, WebM, MOV for videos.`
    );
    error.status = 400;
    error.code = 'INVALID_FILE_TYPE';
    cb(error, false);
  }
};

// Multer upload middleware with 50MB max limit
export const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max
    files: 10, // Max 10 files per batch
  },
  fileFilter,
});

/**
 * Validates individual file constraints according to resource type
 */
export const validateFileConstraints = (file) => {
  if (!file) {
    const error = new Error('No media file was uploaded.');
    error.status = 400;
    error.code = 'FILE_MISSING';
    throw error;
  }

  const isVideo = file.mimetype.startsWith('video/');
  const maxImageSize = 10 * 1024 * 1024; // 10MB
  const maxVideoSize = 50 * 1024 * 1024; // 50MB

  if (!isVideo && file.size > maxImageSize) {
    const error = new Error(`Image exceeds the maximum allowed size of 10MB (${(file.size / (1024 * 1024)).toFixed(2)}MB).`);
    error.status = 400;
    error.code = 'IMAGE_TOO_LARGE';
    throw error;
  }

  if (isVideo && file.size > maxVideoSize) {
    const error = new Error(`Video exceeds the maximum allowed size of 50MB (${(file.size / (1024 * 1024)).toFixed(2)}MB).`);
    error.status = 400;
    error.code = 'VIDEO_TOO_LARGE';
    throw error;
  }
};

export default uploadMiddleware;
