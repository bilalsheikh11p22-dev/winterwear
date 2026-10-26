import cloudinary, {
  assertCloudinaryConfigured,
  generateUploadSignature,
  getTransformedUrl,
} from '../config/cloudinary.js';
import Media from '../models/Media.js';
import { isLocalAsset, deleteLocalAsset } from './localStorageService.js';
import Product from '../models/Product.js';
import Banner from '../models/Banner.js';
import Campaign from '../models/Campaign.js';
import { logAuditEvent } from './auditService.js';

/**
 * Uploads a buffer stream directly to Cloudinary and returns raw asset metadata.
 */
export const uploadBufferToCloudinary = async (buffer, {
  folder = 'winterwear/general',
  resourceType = 'auto',
  publicId,
  tags = [],
} = {}) => {
  assertCloudinaryConfigured();

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
        ...(publicId && { public_id: publicId }),
        tags,
        transformation:
          resourceType === 'image'
            ? [{ quality: 'auto', fetch_format: 'auto' }]
            : undefined,
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }
        resolve(result);
      }
    );

    uploadStream.end(buffer);
  });
};

/**
 * Creates and persists a Media record in MongoDB after upload.
 */
export const persistMediaRecord = async ({
  cloudinaryResult,
  filename,
  category = 'general',
  folder = 'winterwear',
  altText = '',
  caption = '',
  tags = [],
  uploadedBy,
  associatedProducts = [],
  associatedBanners = [],
  associatedCampaigns = [],
}) => {
  const media = await Media.create({
    filename: filename || cloudinaryResult.original_filename || 'untitled-media',
    publicId: cloudinaryResult.public_id,
    secureUrl: cloudinaryResult.secure_url,
    resourceType: cloudinaryResult.resource_type || 'image',
    format: cloudinaryResult.format || '',
    mimeType: `${cloudinaryResult.resource_type}/${cloudinaryResult.format}`,
    width: cloudinaryResult.width || 0,
    height: cloudinaryResult.height || 0,
    duration: cloudinaryResult.duration || 0,
    bytes: cloudinaryResult.bytes || 0,
    category,
    folder,
    altText,
    caption,
    tags,
    uploadedBy,
    associatedProducts,
    associatedBanners,
    associatedCampaigns,
  });

  return media;
};

/**
 * Checks whether an asset is referenced anywhere in products, banners, or campaigns.
 */
export const checkAssetReferences = async (publicId, secureUrl) => {
  const [products, banners, campaigns] = await Promise.all([
    Product.find({
      $or: [
        { 'images.public_id': publicId },
        { 'images.url': secureUrl },
        { 'videoUrl.public_id': publicId },
      ],
    }).select('_id name sku slug'),
    Banner.find({
      $or: [
        { mediaUrl: secureUrl },
        { mobileMediaUrl: secureUrl },
      ],
    }).select('_id title placement'),
    Campaign.find({
      $or: [
        { 'heroMedia.public_id': publicId },
        { 'heroMedia.url': secureUrl },
      ],
    }).select('_id title slug'),
  ]);

  return {
    inUse: products.length > 0 || banners.length > 0 || campaigns.length > 0,
    products,
    banners,
    campaigns,
  };
};

/**
 * Safely deletes a media asset if not referenced.
 */
export const safeDeleteMedia = async (mediaId, requestingUser) => {
  const media = await Media.findById(mediaId);
  if (!media) {
    const error = new Error('Media asset not found.');
    error.status = 404;
    throw error;
  }

  // Check active references
  const references = await checkAssetReferences(media.publicId, media.secureUrl);
  if (references.inUse) {
    const error = new Error(
      `Cannot delete media asset because it is currently in use across ${references.products.length} product(s), ${references.banners.length} banner(s), and ${references.campaigns.length} campaign(s).`
    );
    error.status = 409;
    error.code = 'ASSET_IN_USE';
    error.data = references;
    throw error;
  }

  // Delete from local disk (dev fallback) or Cloudinary
  try {
    if (isLocalAsset(media.publicId)) {
      await deleteLocalAsset(media.publicId, media.format);
    } else {
    assertCloudinaryConfigured();
    await cloudinary.uploader.destroy(media.publicId, {
      resource_type: media.resourceType,
    });
    }
  } catch (cloudErr) {
    console.warn(`[Cloudinary Destroy Warning] Could not delete ${media.publicId}: ${cloudErr.message}`);
  }

  // Remove from MongoDB
  await Media.findByIdAndDelete(mediaId);

  // Log audit event
  await logAuditEvent({
    userId: requestingUser._id,
    userEmail: requestingUser.email,
    role: requestingUser.role,
    action: 'MEDIA_DELETED',
    resource: 'Media',
    resourceId: mediaId,
    details: { publicId: media.publicId, filename: media.filename },
  });

  return { success: true, deletedPublicId: media.publicId };
};

/**
 * Lists media records with pagination, filtering, and text search.
 */
export const listMedia = async ({
  page = 1,
  limit = 20,
  category,
  resourceType,
  search,
  folder,
  startDate,
  endDate,
  sort = '-createdAt',
}) => {
  const query = { isArchived: false };

  if (category && category !== 'all') query.category = category;
  if (resourceType && resourceType !== 'all') query.resourceType = resourceType;
  if (folder) query.folder = new RegExp(folder, 'i');

  if (search) {
    query.$or = [
      { filename: new RegExp(search, 'i') },
      { publicId: new RegExp(search, 'i') },
      { altText: new RegExp(search, 'i') },
      { tags: { $in: [new RegExp(search, 'i')] } },
    ];
  }

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  const total = await Media.countDocuments(query);
  const items = await Media.find(query)
    .sort(sort)
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('uploadedBy', 'name email role');

  return {
    items,
    meta: {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

/**
 * Returns optimized responsive URLs for standard fashion layouts.
 */
export const getResponsivePresets = (publicId, resourceType = 'image') => {
  if (!publicId) return {};

  if (resourceType === 'video') {
    return {
      stream: getTransformedUrl(publicId, { resourceType: 'video', quality: 'auto' }),
      poster: getTransformedUrl(publicId, { resourceType: 'video', format: 'jpg', quality: 'auto' }),
    };
  }

  return {
    thumbnail: getTransformedUrl(publicId, { width: 300, height: 300, crop: 'thumb', quality: 'auto' }),
    card: getTransformedUrl(publicId, { width: 600, height: 800, crop: 'fill', quality: 'auto' }),
    galleryDetail: getTransformedUrl(publicId, { width: 1400, quality: 'auto' }),
    bannerDesktop: getTransformedUrl(publicId, { width: 1920, height: 900, crop: 'fill', quality: 'auto' }),
    bannerMobile: getTransformedUrl(publicId, { width: 800, height: 1000, crop: 'fill', quality: 'auto' }),
  };
};
