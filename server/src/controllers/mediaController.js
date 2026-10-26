import {
  uploadBufferToCloudinary,
  persistMediaRecord,
  listMedia as listMediaService,
  safeDeleteMedia,
  checkAssetReferences,
  getResponsivePresets,
} from '../services/mediaService.js';
import { generateUploadSignature, isCloudinaryConfigured } from '../config/cloudinary.js';
import { saveBufferLocally } from '../services/localStorageService.js';
import { ENV } from '../config/env.js';
import { validateFileConstraints } from '../middleware/uploadValidation.js';
import Media from '../models/Media.js';

export const uploadMedia = async (req, res, next) => {
  try {
    const file = req.file;
    validateFileConstraints(file);

    const { category = 'general', folder = 'winterwear', altText = '', caption = '', tags = '' } = req.body;
    const tagArray = tags ? tags.split(',').map((t) => t.trim()) : [];
    const resourceType = file.mimetype.startsWith('video/') ? 'video' : 'image';

    // Development fallback: store on local disk when Cloudinary is not configured
    const useLocalStorage = !isCloudinaryConfigured() && ENV.NODE_ENV !== 'production';

    const cloudinaryResult = useLocalStorage
      ? await saveBufferLocally(file, {
          category,
          origin: `${req.protocol}://${req.get('host')}`,
        })
      : await uploadBufferToCloudinary(file.buffer, {
          folder: `winterwear/${category}`,
          resourceType,
          tags: tagArray,
        });

    const mediaRecord = await persistMediaRecord({
      cloudinaryResult,
      filename: file.originalname,
      category,
      folder: `winterwear/${category}`,
      altText,
      caption,
      tags: tagArray,
      uploadedBy: req.user?._id,
    });

    const presets = useLocalStorage
      ? {}
      : getResponsivePresets(mediaRecord.publicId, mediaRecord.resourceType);

    return res.status(201).json({
      success: true,
      message: useLocalStorage
        ? 'Media saved to local storage (Cloudinary not configured).'
        : 'Media uploaded and indexed successfully.',
      data: {
        ...mediaRecord.toObject(),
        presets,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getUploadSignature = async (req, res, next) => {
  try {
    const { folder = 'winterwear/general', tags = '' } = req.body;
    const tagList = tags ? tags.split(',').map((t) => t.trim()) : [];

    const signatureData = generateUploadSignature({
      folder,
      tags: tagList,
    });

    return res.status(200).json({
      success: true,
      message: 'Upload signature generated successfully.',
      data: signatureData,
    });
  } catch (error) {
    next(error);
  }
};

export const confirmDirectUpload = async (req, res, next) => {
  try {
    const {
      publicId,
      secureUrl,
      filename,
      resourceType = 'image',
      format,
      bytes,
      width,
      height,
      duration,
      category = 'general',
      folder = 'winterwear',
      altText = '',
      caption = '',
      tags = [],
    } = req.body;

    if (!publicId || !secureUrl) {
      const error = new Error('publicId and secureUrl are required to confirm upload.');
      error.status = 400;
      throw error;
    }

    const existing = await Media.findOne({ publicId });
    if (existing) {
      return res.status(200).json({
        success: true,
        message: 'Media asset already indexed.',
        data: existing,
      });
    }

    const media = await persistMediaRecord({
      cloudinaryResult: {
        public_id: publicId,
        secure_url: secureUrl,
        resource_type: resourceType,
        format,
        bytes,
        width,
        height,
        duration,
      },
      filename,
      category,
      folder,
      altText,
      caption,
      tags,
      uploadedBy: req.user?._id,
    });

    return res.status(201).json({
      success: true,
      message: 'Direct upload verified and recorded.',
      data: media,
    });
  } catch (error) {
    next(error);
  }
};

export const listMedia = async (req, res, next) => {
  try {
    const result = await listMediaService(req.query);
    return res.status(200).json({
      success: true,
      message: 'Media library retrieved.',
      data: result.items,
      meta: result.meta,
    });
  } catch (error) {
    next(error);
  }
};

export const getMediaById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const media = await Media.findById(id).populate('uploadedBy', 'name email role');

    if (!media) {
      const error = new Error('Media asset not found.');
      error.status = 404;
      throw error;
    }

    const references = await checkAssetReferences(media.publicId, media.secureUrl);
    const presets = getResponsivePresets(media.publicId, media.resourceType);

    return res.status(200).json({
      success: true,
      data: {
        ...media.toObject(),
        references,
        presets,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateMediaMetadata = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { altText, caption, category, tags } = req.body;

    const media = await Media.findByIdAndUpdate(
      id,
      {
        ...(altText !== undefined && { altText }),
        ...(caption !== undefined && { caption }),
        ...(category !== undefined && { category }),
        ...(tags !== undefined && { tags }),
      },
      { new: true, runValidators: true }
    );

    if (!media) {
      const error = new Error('Media asset not found.');
      error.status = 404;
      throw error;
    }

    return res.status(200).json({
      success: true,
      message: 'Media metadata updated.',
      data: media,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteMedia = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await safeDeleteMedia(id, req.user);

    return res.status(200).json({
      success: true,
      message: 'Media asset deleted permanently.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const checkMediaReferences = async (req, res, next) => {
  try {
    const { id } = req.params;
    const media = await Media.findById(id);

    if (!media) {
      const error = new Error('Media asset not found.');
      error.status = 404;
      throw error;
    }

    const references = await checkAssetReferences(media.publicId, media.secureUrl);

    return res.status(200).json({
      success: true,
      data: references,
    });
  } catch (error) {
    next(error);
  }
};
