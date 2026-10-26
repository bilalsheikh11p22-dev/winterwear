import mongoose from 'mongoose';
import {
  chatWithAssistant,
  getPersonalizedRecommendations,
  buildOutfitSuggestion,
  compareProducts,
} from '../services/ai/shoppingAssistantService.js';
import { searchGroundedProducts } from '../services/ai/groundedSearchService.js';
import AiConversation from '../models/AiConversation.js';
import AnalyticsEvent from '../models/AnalyticsEvent.js';

export const handleChat = async (req, res, next) => {
  try {
    const { message, sessionId } = req.body;
    const effectiveSessionId = sessionId || req.headers['x-guest-id'] || `sess_${req.user?._id || 'anon'}_${Date.now()}`;
    const userId = req.user?._id || null;

    const result = await chatWithAssistant({
      sessionId: effectiveSessionId,
      userId,
      message,
    });

    return res.status(200).json({
      success: true,
      message: 'Assistant advisory generated',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const handleProductSearch = async (req, res, next) => {
  try {
    const { query, category, collectionGender, size, color, minPrice, maxPrice, inStock, limit, sort } = req.body;

    const result = await searchGroundedProducts({
      query,
      category,
      collectionGender,
      size,
      color,
      minPrice,
      maxPrice,
      inStock: inStock !== false,
      limit: limit || 8,
      sort,
    });

    return res.status(200).json({
      success: true,
      message: 'Grounded product matches retrieved',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const handleRecommendations = async (req, res, next) => {
  try {
    const userId = req.user?._id || null;
    const limit = parseInt(req.query.limit, 10) || 8;

    const recommendations = await getPersonalizedRecommendations({
      userId,
      limit,
    });

    return res.status(200).json({
      success: true,
      message: 'Recommendations generated',
      data: recommendations,
    });
  } catch (error) {
    next(error);
  }
};

export const handleOutfitSuggestions = async (req, res, next) => {
  try {
    const { occasion, budget, preferredColor, gender } = req.body;

    const outfit = await buildOutfitSuggestion({
      occasion,
      budget,
      preferredColor,
      gender,
    });

    return res.status(200).json({
      success: true,
      message: 'Curated outfit ensemble generated',
      data: outfit,
    });
  } catch (error) {
    next(error);
  }
};

export const handleProductComparison = async (req, res, next) => {
  try {
    const { productIds } = req.body;

    const comparison = await compareProducts({ productIds });

    return res.status(200).json({
      success: true,
      message: 'Side-by-side product comparison compiled',
      data: comparison,
    });
  } catch (error) {
    next(error);
  }
};

export const getConversations = async (req, res, next) => {
  try {
    const query = req.user ? { user: req.user._id, isActive: true } : { sessionId: req.headers['x-guest-id'], isActive: true };

    const conversations = await AiConversation.find(query)
      .select('title createdAt updatedAt')
      .sort({ updatedAt: -1 })
      .limit(10);

    return res.status(200).json({
      success: true,
      data: conversations,
    });
  } catch (error) {
    next(error);
  }
};

export const getConversationById = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const conversation = await AiConversation.findById(conversationId).populate('messages.matchedProducts', 'name slug regularPrice salePrice images sku');

    if (!conversation) {
      const error = new Error('Conversation not found');
      error.status = 404;
      throw error;
    }

    // Ownership check
    if (req.user && conversation.user && conversation.user.toString() !== req.user._id.toString()) {
      const error = new Error('Unauthorized conversation inquiry');
      error.status = 403;
      throw error;
    }

    return res.status(200).json({
      success: true,
      data: conversation,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteConversation = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const conversation = await AiConversation.findById(conversationId);

    if (!conversation) {
      const error = new Error('Conversation not found');
      error.status = 404;
      throw error;
    }

    if (req.user && conversation.user && conversation.user.toString() !== req.user._id.toString()) {
      const error = new Error('Unauthorized deletion request');
      error.status = 403;
      throw error;
    }

    await AiConversation.findByIdAndDelete(conversationId);

    return res.status(200).json({
      success: true,
      message: 'Conversation history cleared',
    });
  } catch (error) {
    next(error);
  }
};

export const trackAnalyticsEvent = async (req, res, next) => {
  try {
    const { eventType, campaignId, productId, couponCode, attributedRevenue, metadata } = req.body;

    if (!eventType) {
      const error = new Error('eventType is required');
      error.status = 400;
      throw error;
    }

    let eventId = 'event_' + Date.now();
    if (mongoose.connection.readyState === 1) {
      const event = await AnalyticsEvent.create({
        eventType,
        campaign: campaignId || null,
        product: productId || null,
        couponCode: couponCode || null,
        attributedRevenue: attributedRevenue || 0,
        user: req.user?._id || null,
        sessionId: req.headers['x-guest-id'] || null,
        metadata: metadata || {},
      });
      eventId = event._id;
    }

    return res.status(201).json({
      success: true,
      message: 'Analytics event recorded',
      data: { eventId },
    });
  } catch (error) {
    next(error);
  }
};
