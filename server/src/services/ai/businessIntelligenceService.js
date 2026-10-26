import {
  getProductAnalytics,
  getCustomerAnalytics,
  getInventoryDemandInsights,
  getDeliveryAnalytics,
  getCampaignAnalytics,
} from '../analyticsService.js';
import Order from '../../models/Order.js';
import Refund from '../../models/Refund.js';
import aiProvider from './aiProvider.js';

/**
 * Staff-Only WinterWear Business Insights Assistant
 * Computes deterministic metrics first, then requests conversational explanation from AI
 */
export const generateStaffBusinessInsights = async ({ query = '', staffRole = 'admin' }) => {
  const lower = query.toLowerCase();

  // 1. Gather verified metrics relevant to inquiry
  const [productData, customerData, inventoryData, deliveryData, campaignData] = await Promise.all([
    getProductAnalytics(),
    getCustomerAnalytics(),
    getInventoryDemandInsights(),
    getDeliveryAnalytics(),
    getCampaignAnalytics(),
  ]);

  // Aggregate high-level totals
  const revenueSummary = await Order.aggregate([
    { $match: { paymentStatus: 'paid' } },
    { $group: { _id: null, totalPaidSales: { $sum: '$totalAmount' }, paidOrders: { $sum: 1 } } },
  ]);

  const refundSummary = await Refund.aggregate([
    { $match: { status: { $in: ['approved', 'processed'] } } },
    { $group: { _id: null, totalRefunds: { $sum: '$amount' } } },
  ]);

  const verifiedMetrics = {
    totalPaidRevenuePKR: revenueSummary[0]?.totalPaidSales || 0,
    paidOrdersCount: revenueSummary[0]?.paidOrders || 0,
    totalRefundsPKR: refundSummary[0]?.totalRefunds || 0,
    netRevenuePKR: Math.max(0, (revenueSummary[0]?.totalPaidSales || 0) - (refundSummary[0]?.totalRefunds || 0)),
    repeatPurchaseRate: `${customerData.repeatPurchaseRatePercent}%`,
    criticalReordersCount: inventoryData.criticalReordersCount,
    deliverySuccessRate: `${deliveryData.deliverySuccessRate}%`,
    topCampaignCouponsCount: campaignData.topCoupons.length,
  };

  // Build context summary for AI
  const promptContext = {
    verifiedMetrics,
    topSellingProducts: productData.topSellingProducts.slice(0, 5),
    lowStockReorderRisks: inventoryData.insights.filter((i) => i.needsReorder).slice(0, 5),
  };

  // 2. Generate completion explaining the verified facts
  const aiCompletion = await aiProvider.generateCompletion({
    messages: [
      {
        role: 'system',
        content: `You are the WinterWear Senior Operations & Business Intelligence Advisor.
You only analyze verified, deterministic e-commerce metrics provided in the context.
Strict Guidelines:
1. Clearly state the verified numbers from context.
2. Differentiate verified facts from hypotheses.
3. Suggest practical inventory, marketing, and fulfillment actions for staff.
4. Never invent financial figures or assume data that is not provided.
5. All currency is in PKR.`,
      },
      {
        role: 'user',
        content: query || 'Provide an operational health assessment of WinterWear sales, inventory velocity, and fulfillment efficiency.',
      },
    ],
    context: promptContext,
  });

  return {
    query: query || 'Overall Operational Health Check',
    verifiedMetrics,
    topReorderRisks: promptContext.lowStockReorderRisks,
    insightsExplanation: aiCompletion.content,
    provider: aiCompletion.provider,
    model: aiCompletion.model,
    generatedAt: new Date().toISOString(),
  };
};
