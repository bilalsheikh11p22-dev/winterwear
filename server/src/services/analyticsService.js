import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import ReturnRequest from '../models/ReturnRequest.js';
import DeliveryAssignment from '../models/DeliveryAssignment.js';
import AnalyticsEvent from '../models/AnalyticsEvent.js';
import Coupon from '../models/Coupon.js';

export const getProductAnalytics = async ({ dateFrom, dateTo } = {}) => {
  const match = { orderStatus: { $nin: ['failed', 'cancelled'] } };
  if (dateFrom || dateTo) {
    match.createdAt = {};
    if (dateFrom) match.createdAt.$gte = new Date(dateFrom);
    if (dateTo) match.createdAt.$lte = new Date(dateTo);
  }

  const [productSales, returnsByProduct] = await Promise.all([
    Order.aggregate([
      { $match: match },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          name: { $first: '$items.name' },
          sku: { $first: '$items.sku' },
          totalUnitsSold: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.totalItemPrice' },
          orderCount: { $sum: 1 },
        },
      },
      { $sort: { totalUnitsSold: -1 } },
      { $limit: 20 },
    ]),

    ReturnRequest.aggregate([
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          returnCount: { $sum: '$items.quantity' },
        },
      },
    ]),
  ]);

  const returnMap = new Map();
  returnsByProduct.forEach((r) => returnMap.set(r._id?.toString(), r.returnCount));

  const performance = productSales.map((p) => {
    const returns = returnMap.get(p._id?.toString()) || 0;
    const returnRate = p.totalUnitsSold > 0 ? ((returns / p.totalUnitsSold) * 100).toFixed(1) : 0;
    return {
      productId: p._id,
      name: p.name,
      sku: p.sku,
      unitsSold: p.totalUnitsSold,
      revenue: p.totalRevenue,
      returns,
      returnRatePercent: Number(returnRate),
    };
  });

  return {
    topSellingProducts: performance,
    totalProductsAnalyzed: performance.length,
  };
};

export const getCustomerAnalytics = async ({ dateFrom, dateTo } = {}) => {
  const match = { paymentStatus: 'paid' };
  if (dateFrom || dateTo) {
    match.createdAt = {};
    if (dateFrom) match.createdAt.$gte = new Date(dateFrom);
    if (dateTo) match.createdAt.$lte = new Date(dateTo);
  }

  const [orderCustomerStats, totalCustomers] = await Promise.all([
    Order.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$customer',
          orderCount: { $sum: 1 },
          spentTotal: { $sum: '$totalAmount' },
        },
      },
    ]),
    User.countDocuments({ role: 'customer' }),
  ]);

  const activeCustomers = orderCustomerStats.length;
  const repeatCustomers = orderCustomerStats.filter((c) => c.orderCount > 1).length;
  const repeatPurchaseRate = activeCustomers > 0 ? Math.round((repeatCustomers / activeCustomers) * 100) : 0;
  const totalSpentAll = orderCustomerStats.reduce((sum, c) => sum + c.spentTotal, 0);
  const averageCustomerLifetimeValue = activeCustomers > 0 ? Math.round(totalSpentAll / activeCustomers) : 0;

  return {
    totalRegisteredCustomers: totalCustomers,
    activePurchasingCustomers: activeCustomers,
    repeatCustomers,
    repeatPurchaseRatePercent: repeatPurchaseRate,
    averageCustomerLifetimeValue,
  };
};

export const getInventoryDemandInsights = async () => {
  // Use last 30 days orders to compute daily velocity
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [salesVelocity, allProducts] = await Promise.all([
    Order.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo }, orderStatus: { $nin: ['failed', 'cancelled'] } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          unitsSold30d: { $sum: '$items.quantity' },
        },
      },
    ]),
    Product.find({ isPublished: true }).select('name sku stockQuantity regularPrice category lowStockThreshold').populate('category', 'name').lean(),
  ]);

  const velocityMap = new Map();
  salesVelocity.forEach((v) => velocityMap.set(v._id?.toString(), v.unitsSold30d));

  const insights = allProducts.map((p) => {
    const units30d = velocityMap.get(p._id?.toString()) || 0;
    const dailyVelocity = units30d / 30; // units sold per day
    const currentStock = p.stockQuantity || 0;

    let daysOfStockRemaining = 999;
    if (dailyVelocity > 0) {
      daysOfStockRemaining = Math.round(currentStock / dailyVelocity);
    } else if (currentStock === 0) {
      daysOfStockRemaining = 0;
    }

    const needsReorder = daysOfStockRemaining <= 14 || currentStock < (p.lowStockThreshold || 5);
    const suggestedReorderQty = needsReorder ? Math.max(15, Math.ceil(dailyVelocity * 30)) : 0;

    return {
      productId: p._id,
      name: p.name,
      sku: p.sku,
      category: p.category?.name || 'Garment',
      currentStock,
      unitsSold30d: units30d,
      dailyVelocity: Number(dailyVelocity.toFixed(2)),
      daysOfStockRemaining,
      needsReorder,
      suggestedReorderQty,
      reorderConfidence: units30d >= 5 ? 'high' : units30d > 0 ? 'moderate' : 'insufficient_history',
    };
  });

  // Sort by urgency: stock remaining ascending
  insights.sort((a, b) => a.daysOfStockRemaining - b.daysOfStockRemaining);

  return {
    forecastMethod: '30-Day Moving Average & Inventory Velocity Ratio',
    dataConfidenceNote: 'Statistical calculation derived from confirmed non-cancelled customer dispatches.',
    criticalReordersCount: insights.filter((i) => i.needsReorder).length,
    insights: insights.slice(0, 25),
  };
};

export const getDeliveryAnalytics = async ({ dateFrom, dateTo } = {}) => {
  const match = {};
  if (dateFrom || dateTo) {
    match.createdAt = {};
    if (dateFrom) match.createdAt.$gte = new Date(dateFrom);
    if (dateTo) match.createdAt.$lte = new Date(dateTo);
  }

  const [assignmentStats, codDiscrepancy] = await Promise.all([
    DeliveryAssignment.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]),
    Order.aggregate([
      {
        $match: {
          paymentMethod: 'COD',
          orderStatus: 'delivered',
          codCollected: false,
        },
      },
      {
        $group: {
          _id: null,
          uncollectedDeliveredOrders: { $sum: 1 },
          uncollectedAmount: { $sum: '$totalAmount' },
        },
      },
    ]),
  ]);

  let totalRuns = 0;
  let delivered = 0;
  let failed = 0;

  assignmentStats.forEach((s) => {
    totalRuns += s.count;
    if (s._id === 'completed' || s._id === 'delivered') delivered += s.count;
    if (s._id === 'failed') failed += s.count;
  });

  return {
    totalDeliveryRuns: totalRuns,
    successfulDeliveries: delivered,
    failedDeliveries: failed,
    deliverySuccessRate: totalRuns > 0 ? Math.round((delivered / totalRuns) * 100) : 0,
    codDiscrepancy: {
      uncollectedDeliveredOrders: codDiscrepancy[0]?.uncollectedDeliveredOrders || 0,
      uncollectedAmount: codDiscrepancy[0]?.uncollectedAmount || 0,
    },
  };
};

export const getCampaignAnalytics = async () => {
  const [eventStats, couponUsage] = await Promise.all([
    AnalyticsEvent.aggregate([
      {
        $group: {
          _id: '$eventType',
          count: { $sum: 1 },
          attributedRevenue: { $sum: '$attributedRevenue' },
        },
      },
    ]),
    Order.aggregate([
      { $match: { couponCode: { $ne: '' } } },
      {
        $group: {
          _id: '$couponCode',
          usageCount: { $sum: 1 },
          totalDiscount: { $sum: '$discountAmount' },
          attributedSales: { $sum: '$totalAmount' },
        },
      },
      { $sort: { usageCount: -1 } },
      { $limit: 10 },
    ]),
  ]);

  const eventMap = {};
  eventStats.forEach((e) => {
    eventMap[e._id] = { count: e.count, revenue: e.attributedRevenue };
  });

  const impressions = eventMap['campaign_impression']?.count || 0;
  const clicks = eventMap['campaign_click']?.count || 0;
  const conversions = eventMap['purchase_conversion']?.count || 0;
  const ctr = impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : 0;

  return {
    attributionModel: 'Direct Coupon Matching & Session Touchpoints',
    impressions,
    clicks,
    clickThroughRatePercent: Number(ctr),
    conversions,
    topCoupons: couponUsage,
  };
};
