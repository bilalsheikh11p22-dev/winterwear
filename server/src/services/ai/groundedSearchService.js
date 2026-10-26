import mongoose from 'mongoose';
import Product from '../../models/Product.js';
import Category from '../../models/Category.js';

/**
 * Natural Language Query Parser for WinterWear Catalogue
 * Extracts budget, size, colors, categories, and style intents deterministically
 */
export const parseNaturalLanguageQuery = (text = '') => {
  const lower = text.toLowerCase();
  const filters = {
    keywords: [],
    minPrice: undefined,
    maxPrice: undefined,
    size: undefined,
    color: undefined,
    collectionGender: undefined,
    categorySlug: undefined,
  };

  // 1. Budget & Price parsing
  // Matches "under 15000", "under pkr 20,000", "below 10000", "less than 25000", "between 10000 and 30000"
  const underMatch = lower.match(/(?:under|below|less than|max)\s*(?:pkr|rs\.?)?\s*([\d,]+)/i);
  if (underMatch) {
    const parsed = parseInt(underMatch[1].replace(/,/g, ''), 10);
    if (!isNaN(parsed) && parsed > 0) filters.maxPrice = parsed;
  }

  const betweenMatch = lower.match(/(?:between)\s*(?:pkr|rs\.?)?\s*([\d,]+)\s*(?:and|to)\s*([\d,]+)/i);
  if (betweenMatch) {
    const min = parseInt(betweenMatch[1].replace(/,/g, ''), 10);
    const max = parseInt(betweenMatch[2].replace(/,/g, ''), 10);
    if (!isNaN(min)) filters.minPrice = min;
    if (!isNaN(max)) filters.maxPrice = max;
  }

  // 2. Size parsing
  const sizeMatch = lower.match(/\b(?:size|in)\s*(xs|xxl|xl|s|m|l)\b/i) || lower.match(/\b(xs|xxl|xl|s|m|l)\s*size\b/i);
  if (sizeMatch) {
    filters.size = sizeMatch[1].toUpperCase();
  }

  // 3. Color parsing
  const colorList = ['charcoal', 'black', 'snow white', 'white', 'cream', 'burgundy', 'ice blue', 'blue', 'silver grey', 'grey', 'gray', 'navy', 'camel', 'beige', 'olive'];
  for (const c of colorList) {
    if (new RegExp(`\\b${c}\\b`, 'i').test(lower)) {
      filters.color = c;
      break;
    }
  }

  // 4. Gender / Target Audience parsing
  if (/\b(?:men|mens|man|gentleman)\b/i.test(lower)) {
    filters.collectionGender = "Men's Collection";
  } else if (/\b(?:women|womens|woman|ladies|lady)\b/i.test(lower)) {
    filters.collectionGender = "Women's Collection";
  }

  // 5. Category keywords
  if (/\b(?:jacket|jackets|parka|puffer|bomber)\b/i.test(lower)) {
    filters.categorySlug = 'jackets';
    filters.keywords.push('jacket');
  } else if (/\b(?:coat|coats|overcoat|trench)\b/i.test(lower)) {
    filters.categorySlug = 'coats';
    filters.keywords.push('coat');
  } else if (/\b(?:sweater|sweaters|knitwear|cardigan|pullover)\b/i.test(lower)) {
    filters.categorySlug = 'sweaters';
    filters.keywords.push('sweater');
  } else if (/\b(?:scarf|scarves|muffler|beanie|gloves)\b/i.test(lower)) {
    filters.categorySlug = 'accessories';
    filters.keywords.push('accessories');
  }

  // General remaining keywords (strip common stopwords)
  const stopWords = new Set(['find', 'me', 'a', 'an', 'the', 'for', 'with', 'in', 'show', 'suggest', 'recommend', 'winter', 'wear', 'pieces', 'best', 'good', 'some', 'looking']);
  const cleanTokens = lower
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w));

  filters.keywords = [...new Set([...filters.keywords, ...cleanTokens])];

  return filters;
};

/**
 * Executes grounded search against verified MongoDB Product collections
 */
export const searchGroundedProducts = async ({
  query = '',
  category,
  collectionGender,
  size,
  color,
  minPrice,
  maxPrice,
  inStock = true,
  limit = 8,
  sort = 'relevance',
}) => {
  const mongoQuery = { isPublished: true };

  // Parse natural language if query provided
  const parsed = query ? parseNaturalLanguageQuery(query) : {};

  // Merge direct parameters with parsed parameters
  const effectiveMaxPrice = maxPrice !== undefined ? maxPrice : parsed.maxPrice;
  const effectiveMinPrice = minPrice !== undefined ? minPrice : parsed.minPrice;
  const effectiveSize = size || parsed.size;
  const effectiveColor = color || parsed.color;
  const effectiveGender = collectionGender || parsed.collectionGender;
  const effectiveCategory = category || parsed.categorySlug;

  // Price filtering
  if (effectiveMinPrice !== undefined || effectiveMaxPrice !== undefined) {
    mongoQuery.regularPrice = {};
    if (effectiveMinPrice !== undefined) mongoQuery.regularPrice.$gte = Number(effectiveMinPrice);
    if (effectiveMaxPrice !== undefined) mongoQuery.regularPrice.$lte = Number(effectiveMaxPrice);
  }

  // Category filtering
  if (effectiveCategory) {
    let catDoc = null;
    if (effectiveCategory.match(/^[0-9a-fA-F]{24}$/)) {
      catDoc = await Category.findById(effectiveCategory);
    } else {
      catDoc = await Category.findOne({
        $or: [{ slug: effectiveCategory }, { name: new RegExp(effectiveCategory, 'i') }],
      });
    }
    if (catDoc) mongoQuery.category = catDoc._id;
  }

  // Gender collection
  if (effectiveGender) {
    mongoQuery.collectionGender = effectiveGender;
  }

  // In-stock guarantee
  if (inStock) {
    mongoQuery.stockQuantity = { $gt: 0 };
  }

  // Variant matching (size / color)
  if (effectiveSize || effectiveColor) {
    mongoQuery.variants = { $elemMatch: {} };
    if (effectiveSize) {
      mongoQuery.variants.$elemMatch.size = effectiveSize;
    }
    if (effectiveColor) {
      mongoQuery.variants.$elemMatch['color.name'] = new RegExp(effectiveColor, 'i');
    }
  }

  // Text search on name, description, tags
  if (parsed.keywords && parsed.keywords.length > 0) {
    const regexTerms = parsed.keywords.map((k) => new RegExp(k, 'i'));
    mongoQuery.$or = [
      { name: { $in: regexTerms } },
      { tags: { $in: regexTerms } },
      { shortDescription: { $in: regexTerms } },
    ];
  }

  // Sorting
  let sortOption = { isFeatured: -1, isBestSeller: -1, averageRating: -1, createdAt: -1 };
  if (sort === 'price_asc') sortOption = { regularPrice: 1 };
  else if (sort === 'price_desc') sortOption = { regularPrice: -1 };
  else if (sort === 'rating') sortOption = { averageRating: -1 };

  let products = [];
  if (mongoose.connection.readyState === 1) {
    products = await Product.find(mongoQuery)
      .populate('category', 'name slug')
      .sort(sortOption)
      .limit(limit)
      .lean();
  }

  return {
    appliedFilters: {
      minPrice: effectiveMinPrice,
      maxPrice: effectiveMaxPrice,
      size: effectiveSize,
      color: effectiveColor,
      category: effectiveCategory,
      collectionGender: effectiveGender,
    },
    count: products.length,
    products,
  };
};
