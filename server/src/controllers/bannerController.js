import Banner from '../models/Banner.js';

// URL validator ensuring CTA link is either relative (/shop, /category/jackets) or https
const isValidCtaLink = (url) => {
  if (!url) return false;
  if (url.startsWith('/')) return true; // Relative internal path
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
};

export const getPublicBanners = async (req, res, next) => {
  try {
    const { placement } = req.query;
    const now = new Date();

    const query = {
      isActive: true,
      $and: [
        { $or: [{ startDate: null }, { startDate: { $lte: now } }] },
        { $or: [{ endDate: null }, { endDate: { $gte: now } }] },
      ],
    };

    if (placement) {
      query.placement = placement;
    }

    const banners = await Banner.find(query)
      .sort({ displayOrder: 1, createdAt: -1 })
      .populate('targetCategory', 'name slug');

    return res.status(200).json({
      success: true,
      message: 'Active banners retrieved',
      data: banners,
    });
  } catch (error) {
    next(error);
  }
};

export const listAllBanners = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const { placement, isActive } = req.query;

    const query = {};
    if (placement) query.placement = placement;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const total = await Banner.countDocuments(query);
    const banners = await Banner.find(query)
      .sort({ displayOrder: 1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('targetCategory', 'name slug');

    return res.status(200).json({
      success: true,
      message: 'All banners retrieved',
      data: banners,
      meta: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getBannerById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const banner = await Banner.findById(id).populate('targetCategory', 'name slug');

    if (!banner) {
      const error = new Error('Banner not found');
      error.status = 404;
      throw error;
    }

    return res.status(200).json({
      success: true,
      data: banner,
    });
  } catch (error) {
    next(error);
  }
};

export const createBanner = async (req, res, next) => {
  try {
    const { ctaLink } = req.body;
    if (ctaLink && !isValidCtaLink(ctaLink)) {
      const error = new Error('Invalid CTA destination URL. Must be an internal path (e.g. /shop) or valid HTTPS URL.');
      error.status = 400;
      throw error;
    }

    // The admin form only collects a headline; use it as the internal title too
    if (!req.body.title) req.body.title = req.body.headline || 'Untitled banner';

    const banner = await Banner.create(req.body);

    return res.status(201).json({
      success: true,
      message: 'Banner created successfully',
      data: banner,
    });
  } catch (error) {
    next(error);
  }
};

export const updateBanner = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { ctaLink } = req.body;

    if (ctaLink && !isValidCtaLink(ctaLink)) {
      const error = new Error('Invalid CTA destination URL. Must be an internal path or valid HTTPS URL.');
      error.status = 400;
      throw error;
    }

    const banner = await Banner.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });

    if (!banner) {
      const error = new Error('Banner not found');
      error.status = 404;
      throw error;
    }

    return res.status(200).json({
      success: true,
      message: 'Banner updated successfully',
      data: banner,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteBanner = async (req, res, next) => {
  try {
    const { id } = req.params;
    const banner = await Banner.findByIdAndDelete(id);

    if (!banner) {
      const error = new Error('Banner not found');
      error.status = 404;
      throw error;
    }

    return res.status(200).json({
      success: true,
      message: 'Banner deleted successfully',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};
