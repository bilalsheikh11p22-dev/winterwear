import { Router } from 'express';
import {
  handleChat,
  handleProductSearch,
  handleRecommendations,
  handleOutfitSuggestions,
  handleProductComparison,
  getConversations,
  getConversationById,
  deleteConversation,
  trackAnalyticsEvent,
} from '../../controllers/aiController.js';
import { apiLimiter } from '../../middleware/rateLimiter.js';
import { authenticate } from '../../middleware/authenticate.js';

const router = Router();

import jwt from 'jsonwebtoken';
import User from '../../models/User.js';
import { ENV } from '../../config/env.js';

// Optional user attachment middleware for guest vs logged-in shoppers
const optionalAuth = async (req, res, next) => {
  let token = null;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.accessToken) {
    token = req.cookies.accessToken;
  }

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, ENV.JWT.ACCESS_SECRET);
    const user = await User.findById(decoded.id);
    if (user && user.isActive) {
      req.user = user;
    }
  } catch {
    // Guest or expired token - continue safely
  }
  next();
};

// ── Public / Guest Accessible Assistant Endpoints ─────────────────────
// Rate limited to prevent scraping or denial-of-service
router.post('/chat', apiLimiter, optionalAuth, handleChat);
router.post('/product-search', apiLimiter, handleProductSearch);
router.post('/recommendations', optionalAuth, handleRecommendations);
router.post('/outfit-suggestions', apiLimiter, handleOutfitSuggestions);
router.post('/product-comparison', apiLimiter, handleProductComparison);
router.post('/track-event', optionalAuth, trackAnalyticsEvent);

// ── Conversation History Endpoints ─────────────────────────────────────
router.get('/conversations', optionalAuth, getConversations);
router.get('/conversations/:conversationId', optionalAuth, getConversationById);
router.delete('/conversations/:conversationId', optionalAuth, deleteConversation);

export default router;
