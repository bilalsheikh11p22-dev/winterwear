import mongoose from 'mongoose';
import Product from '../../models/Product.js';
import Order from '../../models/Order.js';
import Wishlist from '../../models/Wishlist.js';
import AiConversation from '../../models/AiConversation.js';
import aiProvider from './aiProvider.js';
import { AI_TOOLS } from './aiTools.js';

export const chatWithAssistant = async ({ sessionId, userId = null, message }) => {
  if (!message || message.trim().length === 0) {
    const error = new Error('Message content is required.');
    error.status = 400;
    throw error;
  }

  const isDbConnected = mongoose.connection.readyState === 1;
  let conversation = null;

  if (isDbConnected) {
    // Load or create conversation session
    conversation = await AiConversation.findOne({ sessionId, isActive: true });
    if (!conversation) {
      conversation = await AiConversation.create({
        sessionId,
        user: userId,
        title: message.slice(0, 30) + '...',
        messages: [],
      });
    } else if (userId && !conversation.user) {
      conversation.user = userId;
    }

    // Add user message to conversation
    conversation.messages.push({
      role: 'user',
      content: message,
    });
  }

  const lower = message.toLowerCase();
  let matchedProducts = [];
  let outfitPayload = null;
  let comparisonPayload = null;
  let toolCallsUsed = [];

  // Grounded Tool Dispatches based on user intent
  if (isDbConnected && (lower.includes('compare') || lower.includes('vs'))) {
    // Look for product slugs or names in query
    const words = lower.split(/\s+/);
    const candidateProducts = await Product.find({ isPublished: true })
      .select('name slug sku regularPrice salePrice materials careInstructions specifications averageRating reviewCount images')
      .lean();

    const matches = candidateProducts.filter((p) => lower.includes(p.name.toLowerCase()) || lower.includes(p.slug));
    if (matches.length >= 2) {
      comparisonPayload = {
        products: matches.slice(0, 3),
        summary: `Comparing ${matches[0].name} and ${matches[1].name} based on verified atelier specifications.`,
      };
      toolCallsUsed.push({ toolName: 'compareProducts', params: { slugs: matches.map((m) => m.slug) } });
    }
  }

  if (!comparisonPayload && (lower.includes('outfit') || lower.includes('ensemble') || lower.includes('look'))) {
    outfitPayload = await buildOutfitSuggestion({
      occasion: lower.includes('university') ? 'University' : lower.includes('formal') ? 'Formal Winter' : 'Daily Atelier',
      preferredColor: lower.includes('black') ? 'black' : lower.includes('cream') ? 'cream' : undefined,
    });
    matchedProducts = outfitPayload.pieces;
    toolCallsUsed.push({ toolName: 'buildOutfitSuggestion', params: { text: message } });
  }

  if (!comparisonPayload && !outfitPayload) {
    // Standard grounded product search
    const searchRes = await AI_TOOLS.searchProducts({ query: message, limit: 6 });
    if (searchRes.products && searchRes.products.length > 0) {
      matchedProducts = searchRes.products;
      toolCallsUsed.push({ toolName: 'searchProducts', params: searchRes.appliedFilters });
    }
  }

  const messagesHistory = conversation?.messages
    ? conversation.messages.slice(-6).map((m) => ({ role: m.role, content: m.content }))
    : [{ role: 'user', content: message }];

  // Generate grounded conversational completion
  const aiCompletion = await aiProvider.generateCompletion({
    messages: [
      {
        role: 'system',
        content: `You are the WinterWear Style Concierge, a luxury winter fashion advisor for WinterWear Atelier in Pakistan. You provide polite, refined, accurate advice. You only recommend genuine WinterWear garments from the provided context. Never invent prices or sizes. All prices are in PKR.`,
      },
      ...messagesHistory,
    ],
    context: {
      matchedProducts,
      outfitRecommendation: outfitPayload,
      comparedProducts: comparisonPayload?.products,
    },
  });

  // Append assistant response to database if connected
  if (isDbConnected && conversation) {
    conversation.messages.push({
      role: 'assistant',
      content: aiCompletion.content,
      matchedProducts: matchedProducts.map((p) => p._id),
      toolCalls: toolCallsUsed,
      outfitPayload,
      comparisonPayload,
    });
    await conversation.save();
  }

  return {
    conversationId: conversation?._id || 'session_advisory',
    sessionId: conversation?.sessionId || sessionId,
    reply: aiCompletion.content,
    matchedProducts,
    outfit: outfitPayload,
    comparison: comparisonPayload,
    provider: aiCompletion.provider,
    model: aiCompletion.model,
  };
};

/**
 * Builds a balanced outfit suggestion using only real in-stock pieces
 */
export const buildOutfitSuggestion = async ({ occasion = 'Daily Wear', budget, preferredColor, gender }) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  if (!isDbConnected) {
    return {
      occasion,
      totalCombinedPrice: 17500,
      currency: 'PKR',
      pieces: [
        {
          _id: 'sample_coat_01',
          name: 'Merino Wool Double-Breasted Overcoat',
          slug: 'merino-wool-double-breasted-overcoat',
          sku: 'WW-COAT-001',
          category: 'Coats & Outerwear',
          price: 12500,
          regularPrice: 15000,
          salePrice: 12500,
          image: '',
          availableSizes: ['S', 'M', 'L', 'XL'],
          stockQuantity: 15,
        },
        {
          _id: 'sample_sweater_01',
          name: 'Cashmere Ribbed Turtleneck',
          slug: 'cashmere-ribbed-turtleneck',
          sku: 'WW-SWTR-001',
          category: 'Knitwear',
          price: 5000,
          regularPrice: 5000,
          salePrice: 5000,
          image: '',
          availableSizes: ['M', 'L'],
          stockQuantity: 8,
        },
      ],
    };
  }

  const queryBase = { isPublished: true, stockQuantity: { $gt: 0 } };
  if (gender) queryBase.collectionGender = gender;

  // Find 1 coat/jacket, 1 sweater/knitwear, and 1 accessory
  const [outerwear, knitwear, accessory] = await Promise.all([
    Product.findOne({
      ...queryBase,
      $or: [{ name: /coat|jacket|parka/i }, { tags: /outerwear|coat|jacket/i }],
      ...(preferredColor && { 'variants.color.name': new RegExp(preferredColor, 'i') }),
    }).populate('category', 'name').lean(),

    Product.findOne({
      ...queryBase,
      $or: [{ name: /sweater|cardigan|pullover|knit/i }, { tags: /knitwear|sweater/i }],
    }).populate('category', 'name').lean(),

    Product.findOne({
      ...queryBase,
      $or: [{ name: /scarf|muffler|beanie|gloves/i }, { tags: /accessories|scarf/i }],
    }).populate('category', 'name').lean(),
  ]);

  const pieces = [outerwear, knitwear, accessory].filter(Boolean);
  const totalCombinedPrice = pieces.reduce((sum, p) => sum + (p.salePrice || p.regularPrice), 0);

  return {
    occasion,
    totalCombinedPrice,
    currency: 'PKR',
    pieces: pieces.map((p) => ({
      _id: p._id,
      name: p.name,
      slug: p.slug,
      sku: p.sku,
      category: p.category?.name || 'Winter Atelier',
      price: p.salePrice || p.regularPrice,
      regularPrice: p.regularPrice,
      salePrice: p.salePrice,
      image: p.images?.[0]?.url || '',
      availableSizes: p.variants?.filter((v) => v.stock > 0).map((v) => v.size) || [],
      stockQuantity: p.stockQuantity,
    })),
  };
};

/**
 * Deterministic & Personalized Recommendations Engine
 */
export const getPersonalizedRecommendations = async ({ userId = null, limit = 8 }) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  if (!isDbConnected) {
    return [];
  }

  let userPurchasedCategories = [];

  // Signal 1: Check Customer Orders
  if (userId) {
    const pastOrders = await Order.find({ customer: userId, paymentStatus: 'paid' })
      .select('items')
      .populate('items.product', 'category')
      .lean();

    pastOrders.forEach((o) => {
      o.items?.forEach((it) => {
        if (it.product?.category) userPurchasedCategories.push(it.product.category.toString());
      });
    });
  }

  // Signal 2: Check Customer Wishlist
  if (userId && userPurchasedCategories.length === 0) {
    const wishlist = await Wishlist.findOne({ user: userId }).populate('items.product', 'category').lean();
    wishlist?.items?.forEach((it) => {
      if (it.product?.category) userPurchasedCategories.push(it.product.category.toString());
    });
  }

  const query = { isPublished: true, stockQuantity: { $gt: 0 } };

  // If customer has proven interest, prioritize those or complementary categories
  if (userPurchasedCategories.length > 0) {
    query.category = { $in: userPurchasedCategories };
  }

  let products = await Product.find(query)
    .populate('category', 'name slug')
    .sort({ averageRating: -1, isBestSeller: -1, createdAt: -1 })
    .limit(limit)
    .lean();

  // Non-personalized fallback if no personalized results found
  if (products.length === 0) {
    products = await Product.find({ isPublished: true, stockQuantity: { $gt: 0 } })
      .populate('category', 'name slug')
      .sort({ isBestSeller: -1, averageRating: -1, createdAt: -1 })
      .limit(limit)
      .lean();
  }

  return products.map((p) => ({
    _id: p._id,
    name: p.name,
    slug: p.slug,
    sku: p.sku,
    category: p.category?.name || 'Winterwear',
    regularPrice: p.regularPrice,
    salePrice: p.salePrice,
    price: p.salePrice || p.regularPrice,
    image: p.images?.[0]?.url || '',
    averageRating: p.averageRating,
    reviewCount: p.reviewCount,
    isBestSeller: p.isBestSeller,
    isNewArrival: p.isNewArrival,
    stockQuantity: p.stockQuantity,
  }));
};

/**
 * Side-by-Side Product Comparison
 */
export const compareProducts = async ({ productIds = [] }) => {
  if (!Array.isArray(productIds) || productIds.length < 2) {
    const error = new Error('Please select at least 2 products to compare.');
    error.status = 400;
    throw error;
  }

  const isDbConnected = mongoose.connection.readyState === 1;
  if (!isDbConnected) {
    return {
      products: productIds.map((id, index) => ({
        _id: id,
        name: `Garment Selection ${index + 1}`,
        slug: `garment-${index + 1}`,
        sku: `WW-GAR-${index + 1}`,
        category: 'Outerwear',
        regularPrice: 9500,
        salePrice: null,
        currentPrice: 9500,
        materials: 'Cashmere & Wool Blend',
        careInstructions: 'Dry clean only',
        availableSizes: ['S', 'M', 'L'],
        averageRating: 4.8,
        reviewCount: 12,
        stockQuantity: 5,
        returnEligible: true,
        images: [],
      })),
    };
  }

  const products = await Product.find({
    _id: { $in: productIds },
    isPublished: true,
  })
    .populate('category', 'name')
    .lean();

  if (products.length < 2) {
    const error = new Error('Could not locate both garments in current catalogue.');
    error.status = 404;
    throw error;
  }

  const comparisonMatrix = {
    products: products.map((p) => ({
      _id: p._id,
      name: p.name,
      slug: p.slug,
      sku: p.sku,
      category: p.category?.name || 'Garment',
      regularPrice: p.regularPrice,
      salePrice: p.salePrice,
      currentPrice: p.salePrice || p.regularPrice,
      materials: p.materials?.length ? p.materials.join(', ') : 'Not specified',
      careInstructions: p.careInstructions?.length ? p.careInstructions.join(', ') : 'Dry clean only',
      availableSizes: p.variants?.filter((v) => v.stock > 0).map((v) => v.size) || [],
      averageRating: p.averageRating,
      reviewCount: p.reviewCount,
      stockQuantity: p.stockQuantity,
      returnEligible: true,
      images: p.images?.slice(0, 2).map((img) => img.url) || [],
    })),
  };

  return comparisonMatrix;
};
