import Campaign from '../models/Campaign.js';

export const getPublicCampaigns = async (req, res, next) => {
  try {
    const { section } = req.query;
    const now = new Date();

    const query = {
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
    };

    if (section) {
      query.targetSection = section;
    }

    const campaigns = await Campaign.find(query)
      .sort({ createdAt: -1 })
      .populate('associatedProducts', 'name slug images regularPrice salePrice stockQuantity isPublished')
      .populate('associatedCollection', 'title slug');

    return res.status(200).json({
      success: true,
      message: 'Active campaigns retrieved',
      data: campaigns,
    });
  } catch (error) {
    next(error);
  }
};

export const getCampaignBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const campaign = await Campaign.findOne({ slug, isActive: true })
      .populate('associatedProducts', 'name slug images regularPrice salePrice stockQuantity isPublished')
      .populate('associatedCollection', 'title slug');

    if (!campaign) {
      const error = new Error('Campaign not found');
      error.status = 404;
      throw error;
    }

    return res.status(200).json({
      success: true,
      data: campaign,
    });
  } catch (error) {
    next(error);
  }
};

export const listAllCampaigns = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;

    const total = await Campaign.countDocuments();
    const campaigns = await Campaign.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('associatedCollection', 'title slug');

    return res.status(200).json({
      success: true,
      data: campaigns,
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

export const createCampaign = async (req, res, next) => {
  try {
    const campaign = await Campaign.create(req.body);
    return res.status(201).json({
      success: true,
      message: 'Campaign created successfully',
      data: campaign,
    });
  } catch (error) {
    next(error);
  }
};

export const updateCampaign = async (req, res, next) => {
  try {
    const { id } = req.params;
    const campaign = await Campaign.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });

    if (!campaign) {
      const error = new Error('Campaign not found');
      error.status = 404;
      throw error;
    }

    return res.status(200).json({
      success: true,
      message: 'Campaign updated successfully',
      data: campaign,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteCampaign = async (req, res, next) => {
  try {
    const { id } = req.params;
    const campaign = await Campaign.findByIdAndDelete(id);

    if (!campaign) {
      const error = new Error('Campaign not found');
      error.status = 404;
      throw error;
    }

    return res.status(200).json({
      success: true,
      message: 'Campaign deleted successfully',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};
