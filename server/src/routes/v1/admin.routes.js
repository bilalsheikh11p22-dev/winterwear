import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import {
  getOverview,
  getSalesReport,
  getOrdersReport,
  getDashboardAnalytics,
  listUsers,
  createStaff,
  updateUserRole,
  updateUserStatus,
  getAdminOrders,
  getAdminOrderById,
  updateAdminOrderStatus,
  assignRiderToOrder,
  listRiders,
  reviewRider,
  getAuditLogs,
  getAdminReturns,
  reviewReturn,
  getFinanceReconciliation,
  reconcileCODOrders,
  getProductAnalyticsHandler,
  getCustomerAnalyticsHandler,
  getInventoryDemandHandler,
  getDeliveryAnalyticsHandler,
  getCampaignAnalyticsHandler,
  getBusinessInsightsHandler,
} from '../../controllers/adminController.js';

const router = Router();

// All admin routes require authenticated session
router.use(authenticate);

// ── Analytics ──────────────────────────────────────────────────────────
router.get(
  '/analytics/dashboard',
  authorize(['admin', 'super_admin', 'finance_staff', 'finance', 'inventory_manager', 'marketing_manager']),
  getDashboardAnalytics
);

router.get(
  '/analytics/overview',
  authorize(['admin', 'super_admin', 'finance_staff', 'finance', 'inventory_manager', 'marketing_manager']),
  getOverview
);

router.get(
  '/analytics/sales',
  authorize(['admin', 'super_admin', 'finance_staff', 'finance']),
  getSalesReport
);

router.get(
  '/analytics/orders',
  authorize(['admin', 'super_admin', 'fulfillment_staff', 'fulfillment']),
  getOrdersReport
);

router.get(
  '/analytics/products',
  authorize(['admin', 'super_admin', 'inventory_manager', 'marketing_manager']),
  getProductAnalyticsHandler
);

router.get(
  '/analytics/customers',
  authorize(['admin', 'super_admin', 'marketing_manager', 'customer_support']),
  getCustomerAnalyticsHandler
);

router.get(
  '/analytics/inventory',
  authorize(['admin', 'super_admin', 'inventory_manager', 'warehouse_staff']),
  getInventoryDemandHandler
);

router.get(
  '/analytics/deliveries',
  authorize(['admin', 'super_admin', 'fulfillment_staff', 'fulfillment']),
  getDeliveryAnalyticsHandler
);

router.get(
  '/analytics/campaigns',
  authorize(['admin', 'super_admin', 'marketing_manager']),
  getCampaignAnalyticsHandler
);

router.post(
  '/analytics/business-insights',
  authorize(['admin', 'super_admin', 'finance_staff', 'finance', 'inventory_manager', 'marketing_manager']),
  getBusinessInsightsHandler
);

// ── Order Management & Fulfillment ─────────────────────────────────────
router.get(
  '/orders',
  authorize(['admin', 'super_admin', 'fulfillment_staff', 'fulfillment', 'customer_support', 'inventory_manager']),
  getAdminOrders
);

router.get(
  '/orders/:id',
  authorize(['admin', 'super_admin', 'fulfillment_staff', 'fulfillment', 'customer_support', 'finance_staff', 'finance', 'inventory_manager']),
  getAdminOrderById
);

router.patch(
  '/orders/:id/status',
  authorize(['admin', 'super_admin', 'fulfillment_staff', 'fulfillment', 'inventory_manager']),
  updateAdminOrderStatus
);

router.patch(
  '/orders/:id/assign-rider',
  authorize(['admin', 'super_admin', 'fulfillment_staff', 'fulfillment']),
  assignRiderToOrder
);

// ── Staff & User Management ────────────────────────────────────────────
router.get(
  '/users',
  authorize(['admin', 'super_admin', 'customer_support']),
  listUsers
);

router.post(
  '/staff',
  authorize(['super_admin', 'admin']),
  createStaff
);

router.patch(
  '/users/:id/role',
  authorize(['super_admin']),
  updateUserRole
);

router.patch(
  '/users/:id/status',
  authorize(['admin', 'super_admin']),
  updateUserStatus
);

// ── Rider applications ─────────────────────────────────────────────────
router.get('/riders', authorize(['admin', 'super_admin']), listRiders);
router.patch('/riders/:id/approval', authorize(['admin', 'super_admin']), reviewRider);

// ── Audit Logs ─────────────────────────────────────────────────────────
router.get(
  '/audit-logs',
  authorize(['admin', 'super_admin']),
  getAuditLogs
);

// ── Customer Support & Returns ─────────────────────────────────────────
router.get(
  '/returns',
  authorize(['admin', 'super_admin', 'customer_support']),
  getAdminReturns
);

router.patch(
  '/returns/:id/review',
  authorize(['admin', 'super_admin', 'customer_support']),
  reviewReturn
);

// ── Finance & Reconciliation ───────────────────────────────────────────
router.get(
  '/finance/reconciliation',
  authorize(['admin', 'super_admin', 'finance_staff', 'finance']),
  getFinanceReconciliation
);

router.post(
  '/finance/reconcile-cod',
  authorize(['admin', 'super_admin', 'finance_staff', 'finance']),
  reconcileCODOrders
);

export default router;
