import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import Inventory from '../models/Inventory.js';
import Refund from '../models/Refund.js';
import ReturnRequest from '../models/ReturnRequest.js';
import Payment from '../models/Payment.js';
import AuditLog from '../models/AuditLog.js';
import DeliveryAssignment from '../models/DeliveryAssignment.js';
import Category from '../models/Category.js';
import { logAuditEvent, sendNotification } from '../services/auditService.js';
import { transitionOrderStatus } from '../services/orderService.js';
import { publishOrderStatusChanged, publishRiderAssigned, publishRefundStatus, publishReturnStatus } from '../services/notifications/events.js';
import {
  getProductAnalytics,
  getCustomerAnalytics,
  getInventoryDemandInsights,
  getDeliveryAnalytics,
  getCampaignAnalytics,
} from '../services/analyticsService.js';
import { generateStaffBusinessInsights } from '../services/ai/businessIntelligenceService.js';

export const getOverview = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalOrders,
      totalCustomers,
      totalProducts,
      pendingOrdersCount,
      revenueResult,
      todayOrders,
      todayRevenueResult,
      lowStockCount,
    ] = await Promise.all([
      Order.countDocuments(),
      User.countDocuments({ role: 'customer' }),
      Product.countDocuments({ isPublished: true }),
      Order.countDocuments({ orderStatus: { $in: ['confirmed', 'processing', 'packing'] } }),
      Order.aggregate([
        { $match: { paymentStatus: 'paid' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
      Order.countDocuments({ createdAt: { $gte: today } }),
      Order.aggregate([
        { $match: { createdAt: { $gte: today }, paymentStatus: 'paid' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
      Product.countDocuments({ stockQuantity: { $lt: 10 }, isPublished: true }),
    ]);

    const totalRevenue = revenueResult[0]?.total || 0;
    const todayRevenue = todayRevenueResult[0]?.total || 0;

    return res.status(200).json({
      success: true,
      message: 'Admin overview metrics retrieved',
      data: {
        totalOrders,
        totalRevenue,
        totalCustomers,
        totalProducts,
        lowStockCount,
        pendingOrdersCount,
        todayOrders,
        todayRevenue,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getSalesReport = async (req, res, next) => {
  try {
    const days = parseInt(req.query.period, 10) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const salesData = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          paymentStatus: 'paid',
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          orders: { $sum: 1 },
          revenue: { $sum: '$totalAmount' },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          date: '$_id',
          orders: 1,
          revenue: 1,
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      message: `Sales report for last ${days} days retrieved`,
      data: salesData,
    });
  } catch (error) {
    next(error);
  }
};

export const getOrdersReport = async (req, res, next) => {
  try {
    const statusCounts = await Order.aggregate([
      {
        $group: {
          _id: '$orderStatus',
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          status: '$_id',
          count: 1,
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      message: 'Orders by status retrieved',
      data: statusCounts,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Comprehensive Dashboard Analytics Endpoint
 * GET /api/v1/admin/analytics/dashboard
 * Query params: period ('7d'|'30d'|'90d'|'custom'), dateFrom, dateTo
 */
export const getDashboardAnalytics = async (req, res, next) => {
  try {
    const { period = '30d', dateFrom, dateTo } = req.query;

    let startDate;
    let endDate = dateTo ? new Date(dateTo) : new Date();

    if (dateFrom) {
      startDate = new Date(dateFrom);
    } else {
      startDate = new Date();
      if (period === '7d') startDate.setDate(startDate.getDate() - 7);
      else if (period === '90d') startDate.setDate(startDate.getDate() - 90);
      else startDate.setDate(startDate.getDate() - 30);
    }

    const dateMatch = { createdAt: { $gte: startDate, $lte: endDate } };

    // Run parallel MongoDB aggregations
    const [
      revenueStats,
      refundStats,
      orderStatusCounts,
      dailyTrend,
      categoryPerformance,
      topProductsRaw,
      lowStockProducts,
      riderStats,
      customerCount,
      newCustomersCount,
      totalCatalogProducts,
    ] = await Promise.all([
      // 1. Gross Sales, Discounts, Subtotal, Paid Counts
      Order.aggregate([
        { $match: { ...dateMatch, orderStatus: { $nin: ['failed', 'cancelled'] } } },
        {
          $group: {
            _id: null,
            totalGross: { $sum: '$subtotal' },
            totalDiscounts: { $sum: '$discountAmount' },
            totalShipping: { $sum: '$shippingFee' },
            totalTax: { $sum: '$taxAmount' },
            totalAmount: { $sum: '$totalAmount' },
            totalOrders: { $sum: 1 },
            paidOrdersCount: {
              $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, 1, 0] },
            },
            paidRevenue: {
              $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$totalAmount', 0] },
            },
            codPendingOrders: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ['$paymentMethod', 'COD'] },
                      { $eq: ['$codCollected', false] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            codPendingAmount: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ['$paymentMethod', 'COD'] },
                      { $eq: ['$codCollected', false] },
                    ],
                  },
                  '$totalAmount',
                  0,
                ],
              },
            },
            codCollectedAmount: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ['$paymentMethod', 'COD'] },
                      { $eq: ['$codCollected', true] },
                    ],
                  },
                  '$totalAmount',
                  0,
                ],
              },
            },
          },
        },
      ]),

      // 2. Refunds in period
      Refund.aggregate([
        { $match: { ...dateMatch, status: { $in: ['approved', 'processed'] } } },
        {
          $group: {
            _id: null,
            totalRefundAmount: { $sum: '$amount' },
            totalRefundCount: { $sum: 1 },
          },
        },
      ]),

      // 3. Orders by Status
      Order.aggregate([
        { $match: dateMatch },
        { $group: { _id: '$orderStatus', count: { $sum: 1 } } },
        { $project: { _id: 0, status: '$_id', count: 1 } },
      ]),

      // 4. Daily Sales & Revenue Trend
      Order.aggregate([
        { $match: { ...dateMatch, orderStatus: { $nin: ['failed', 'cancelled'] } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            orders: { $sum: 1 },
            grossSales: { $sum: '$subtotal' },
            discounts: { $sum: '$discountAmount' },
            totalAmount: { $sum: '$totalAmount' },
            paidRevenue: {
              $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$totalAmount', 0] },
            },
          },
        },
        { $sort: { _id: 1 } },
        {
          $project: {
            _id: 0,
            date: '$_id',
            orders: 1,
            grossSales: 1,
            discounts: 1,
            totalAmount: 1,
            paidRevenue: 1,
          },
        },
      ]),

      // 5. Category Performance
      Order.aggregate([
        { $match: { ...dateMatch, orderStatus: { $nin: ['failed', 'cancelled'] } } },
        { $unwind: '$items' },
        {
          $lookup: {
            from: 'products',
            localField: 'items.product',
            foreignField: '_id',
            as: 'productDoc',
          },
        },
        { $unwind: { path: '$productDoc', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: 'categories',
            localField: 'productDoc.category',
            foreignField: '_id',
            as: 'categoryDoc',
          },
        },
        { $unwind: { path: '$categoryDoc', preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: '$categoryDoc.name',
            categorySlug: { $first: '$categoryDoc.slug' },
            unitsSold: { $sum: '$items.quantity' },
            revenue: { $sum: '$items.totalItemPrice' },
          },
        },
        { $sort: { revenue: -1 } },
        {
          $project: {
            _id: 0,
            category: { $ifNull: ['$_id', 'Winter Essentials'] },
            slug: { $ifNull: ['$categorySlug', 'essentials'] },
            unitsSold: 1,
            revenue: 1,
          },
        },
      ]),

      // 6. Top Products
      Order.aggregate([
        { $match: { ...dateMatch, orderStatus: { $nin: ['failed', 'cancelled'] } } },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.product',
            name: { $first: '$items.name' },
            sku: { $first: '$items.sku' },
            image: { $first: '$items.image' },
            unitsSold: { $sum: '$items.quantity' },
            revenue: { $sum: '$items.totalItemPrice' },
          },
        },
        { $sort: { revenue: -1 } },
        { $limit: 8 },
        {
          $project: {
            _id: 0,
            productId: '$_id',
            name: 1,
            sku: 1,
            image: 1,
            unitsSold: 1,
            revenue: 1,
          },
        },
      ]),

      // 7. Low Stock Alerts (< 10 units)
      Product.find({ stockQuantity: { $lt: 10 }, isPublished: true })
        .select('name sku stockQuantity regularPrice salePrice images category')
        .populate('category', 'name')
        .sort({ stockQuantity: 1 })
        .limit(10),

      // 8. Rider Delivery Statistics
      DeliveryAssignment.aggregate([
        { $match: dateMatch },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),

      // 9. Total Customers
      User.countDocuments({ role: 'customer' }),

      // 10. New Customers in period
      User.countDocuments({ role: 'customer', ...dateMatch }),

      // 11. Total Catalog Products
      Product.countDocuments({ isPublished: true }),
    ]);

    const rev = revenueStats[0] || {
      totalGross: 0,
      totalDiscounts: 0,
      totalShipping: 0,
      totalTax: 0,
      totalAmount: 0,
      totalOrders: 0,
      paidOrdersCount: 0,
      paidRevenue: 0,
      codPendingOrders: 0,
      codPendingAmount: 0,
      codCollectedAmount: 0,
    };

    const ref = refundStats[0] || {
      totalRefundAmount: 0,
      totalRefundCount: 0,
    };

    // Calculate clear Net Revenue: Gross - Discounts - Refunds
    // Total collected/realized = paidRevenue + codCollectedAmount - totalRefundAmount
    const grossSales = rev.totalGross + rev.totalTax + rev.totalShipping;
    const netRevenue = Math.max(0, rev.totalAmount - ref.totalRefundAmount);
    const averageOrderValue = rev.totalOrders > 0 ? Math.round(rev.totalAmount / rev.totalOrders) : 0;

    // Process Rider breakdown
    const riderBreakdown = {
      totalAssignments: 0,
      delivered: 0,
      inTransit: 0,
      pending: 0,
      failed: 0,
      successRate: 0,
    };

    riderStats.forEach((r) => {
      riderBreakdown.totalAssignments += r.count;
      if (r._id === 'completed' || r._id === 'delivered') riderBreakdown.delivered += r.count;
      else if (r._id === 'in_transit' || r._id === 'out_for_delivery') riderBreakdown.inTransit += r.count;
      else if (r._id === 'pending_pickup') riderBreakdown.pending += r.count;
      else if (r._id === 'failed') riderBreakdown.failed += r.count;
    });

    if (riderBreakdown.totalAssignments > 0) {
      riderBreakdown.successRate = Math.round(
        (riderBreakdown.delivered / riderBreakdown.totalAssignments) * 100
      );
    }

    return res.status(200).json({
      success: true,
      message: 'Dashboard analytics data computed successfully',
      data: {
        timeframe: {
          period,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
        kpis: {
          grossSales,
          totalDiscounts: rev.totalDiscounts,
          totalShipping: rev.totalShipping,
          totalTax: rev.totalTax,
          netRevenue,
          totalOrders: rev.totalOrders,
          paidOrdersCount: rev.paidOrdersCount,
          totalRefunds: ref.totalRefundAmount,
          refundCount: ref.totalRefundCount,
          averageOrderValue,
          totalCustomers: customerCount,
          newCustomers: newCustomersCount,
          totalProducts: totalCatalogProducts,
          lowStockCount: lowStockProducts.length,
          codPendingAmount: rev.codPendingAmount,
          codCollectedAmount: rev.codCollectedAmount,
        },
        dailyTrend,
        orderStatusDistribution: orderStatusCounts,
        categoryPerformance,
        topProducts: topProductsRaw,
        lowStockAlerts: lowStockProducts,
        riderPerformance: riderBreakdown,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const listUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const { role, search, isStaff } = req.query;

    const query = {};
    if (role) {
      query.role = role;
    } else if (isStaff === 'true') {
      query.role = {
        $in: [
          'super_admin',
          'admin',
          'inventory_manager',
          'warehouse_staff',
          'rider',
          'fulfillment_staff',
          'customer_support',
          'finance_staff',
          'marketing_manager',
        ],
      };
    }

    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
        { phone: new RegExp(search, 'i') },
      ];
    }

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .select('-password -refreshTokens')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return res.status(200).json({
      success: true,
      message: 'Users retrieved',
      data: users,
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

export const createStaff = async (req, res, next) => {
  try {
    const { name, email, password, role, phone } = req.body;
    const actor = req.user;

    const validRoles = [
      'super_admin',
      'admin',
      'inventory_manager',
      'warehouse_staff',
      'rider',
      'fulfillment_staff',
      'customer_support',
      'finance_staff',
      'marketing_manager',
    ];

    if (!validRoles.includes(role)) {
      const error = new Error(`Invalid staff role. Allowed: ${validRoles.join(', ')}`);
      error.status = 400;
      throw error;
    }

    if (!name || !email || !password) {
      const error = new Error('Name, email, and password are required.');
      error.status = 400;
      throw error;
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      const error = new Error('A user account with this email already exists.');
      error.status = 409;
      throw error;
    }

    const newStaff = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      role,
      phone: phone || '',
      isEmailVerified: true,
      isActive: true,
    });

    await logAuditEvent({
      actorId: actor._id,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: 'STAFF_CREATED',
      targetModel: 'User',
      targetId: newStaff._id.toString(),
      details: { email: newStaff.email, role: newStaff.role, name: newStaff.name },
      ipAddress: req.ip,
    });

    const userObj = newStaff.toObject();
    delete userObj.password;

    return res.status(201).json({
      success: true,
      message: `Staff account created successfully with role ${role}.`,
      data: userObj,
    });
  } catch (error) {
    next(error);
  }
};

export const updateUserRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const actorId = req.user._id;

    if (id.toString() === actorId.toString()) {
      const error = new Error('You cannot change your own role.');
      error.status = 400;
      throw error;
    }

    const validRoles = [
      'super_admin',
      'admin',
      'inventory_manager',
      'warehouse_staff',
      'rider',
      'fulfillment_staff',
      'customer_support',
      'finance_staff',
      'marketing_manager',
      'customer',
    ];

    if (!validRoles.includes(role)) {
      const error = new Error(`Invalid role. Valid roles: ${validRoles.join(', ')}`);
      error.status = 400;
      throw error;
    }

    const user = await User.findByIdAndUpdate(id, { role }, { new: true }).select('-password -refreshTokens');
    if (!user) {
      const error = new Error('User not found');
      error.status = 404;
      throw error;
    }

    await logAuditEvent({
      actorId,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'USER_ROLE_UPDATE',
      targetModel: 'User',
      targetId: id,
      details: { newRole: role, targetEmail: user.email },
      ipAddress: req.ip,
    });

    return res.status(200).json({
      success: true,
      message: `User role updated to ${role}`,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

export const updateUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    const actorId = req.user._id;

    if (id.toString() === actorId.toString()) {
      const error = new Error('You cannot deactivate your own account.');
      error.status = 400;
      throw error;
    }

    const user = await User.findByIdAndUpdate(id, { isActive }, { new: true }).select('-password -refreshTokens');
    if (!user) {
      const error = new Error('User not found');
      error.status = 404;
      throw error;
    }

    await logAuditEvent({
      actorId,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'USER_STATUS_UPDATE',
      targetModel: 'User',
      targetId: id,
      details: { isActive, targetEmail: user.email },
      ipAddress: req.ip,
    });

    return res.status(200).json({
      success: true,
      message: `User status set to ${isActive ? 'active' : 'inactive'}`,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

export const getAdminOrders = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 15;
    const { status, paymentStatus, paymentMethod, search, dateFrom, dateTo } = req.query;

    const query = {};
    if (status && status !== 'all') query.orderStatus = status;
    if (paymentStatus && paymentStatus !== 'all') query.paymentStatus = paymentStatus;
    if (paymentMethod && paymentMethod !== 'all') query.paymentMethod = paymentMethod;

    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { orderNumber: searchRegex },
        { 'shippingAddress.phone': searchRegex },
        { 'shippingAddress.fullName': searchRegex },
        { couponCode: searchRegex },
      ];
    }

    const total = await Order.countDocuments(query);
    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('customer', 'name email phone')
      .populate('assignedRider', 'name phone email');

    return res.status(200).json({
      success: true,
      message: 'Admin orders retrieved',
      data: orders,
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

export const getAdminOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id)
      .populate('customer', 'name email phone')
      .populate('items.product', 'name slug images sku')
      .populate('assignedRider', 'name phone email');

    if (!order) {
      const error = new Error('Order not found');
      error.status = 404;
      throw error;
    }

    return res.status(200).json({
      success: true,
      message: 'Admin order detail retrieved',
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

export const updateAdminOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, comment } = req.body;

    const updatedOrder = await transitionOrderStatus({
      orderId: id,
      targetStatus: status,
      actorId: req.user._id,
      actorRole: req.user.role,
      comment: comment || `Status updated to ${status} by staff.`,
    });

    await logAuditEvent({
      actorId: req.user._id,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'ORDER_STATUS_TRANSITION',
      targetModel: 'Order',
      targetId: id,
      details: { newStatus: status, comment },
      ipAddress: req.ip,
    });

    return res.status(200).json({
      success: true,
      message: `Order transitioned to ${status}`,
      data: updatedOrder,
    });
  } catch (error) {
    next(error);
  }
};

export const assignRiderToOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { riderId, notes, priority = 'express' } = req.body;

    const order = await Order.findById(id);
    if (!order) {
      const error = new Error('Order not found');
      error.status = 404;
      throw error;
    }

    const rider = await User.findOne({
      _id: riderId,
      role: 'rider',
      approvalStatus: { $nin: ['pending', 'rejected'] },
    });
    if (!rider) {
      const error = new Error('Designated rider not found, not approved yet, or account does not hold rider role.');
      error.status = 400;
      throw error;
    }

    order.assignedRider = rider._id;
    if (notes) order.deliveryNotes = notes;
    let movedToAssigned = false;

    // Transition status to assigned_to_rider if order is ready_for_dispatch or packing
    if (['ready_for_dispatch', 'packing', 'processing'].includes(order.orderStatus)) {
      order.orderStatus = 'assigned_to_rider';
      order.statusHistory.push({
        status: 'assigned_to_rider',
        changedBy: req.user._id,
        role: req.user.role,
        comment: `Assigned to delivery courier ${rider.name}`,
        timestamp: new Date(),
      });
      movedToAssigned = true;
    }

    await order.save();

    // This path writes the status directly, so announce it here (customer: "rider assigned").
    if (movedToAssigned) {
      await publishOrderStatusChanged({
        order,
        historyEntry: order.statusHistory[order.statusHistory.length - 1],
        actorRole: req.user.role,
        actorId: req.user._id,
      });
    }

    // Create or update DeliveryAssignment
    let assignment = await DeliveryAssignment.findOne({ order: order._id });
    if (assignment) {
      assignment.rider = rider._id;
      assignment.assignedBy = req.user._id;
      assignment.status = 'pending_pickup';
      assignment.priority = priority;
      if (notes) assignment.notes = notes;
      await assignment.save();
    } else {
      assignment = await DeliveryAssignment.create({
        rider: rider._id,
        order: order._id,
        shipment: order._id, // References order/shipment record
        assignedBy: req.user._id,
        status: 'pending_pickup',
        priority,
        notes: notes || '',
      });
    }

    await publishRiderAssigned({ orderId: order._id, riderId: rider._id, assignmentId: assignment._id });

    await logAuditEvent({
      actorId: req.user._id,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'ORDER_RIDER_ASSIGNED',
      targetModel: 'Order',
      targetId: order._id.toString(),
      details: { riderId: rider._id, riderName: rider.name, priority },
      ipAddress: req.ip,
    });

    return res.status(200).json({
      success: true,
      message: `Rider ${rider.name} successfully assigned to order ${order.orderNumber}.`,
      data: {
        order,
        assignment,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getAuditLogs = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 25;
    const { action, actorRole, targetModel, search } = req.query;

    const query = {};
    if (action) query.action = action;
    if (actorRole) query.actorRole = actorRole;
    if (targetModel) query.targetModel = targetModel;
    if (search) {
      query.$or = [
        { actorEmail: new RegExp(search, 'i') },
        { targetId: new RegExp(search, 'i') },
        { action: new RegExp(search, 'i') },
      ];
    }

    const total = await AuditLog.countDocuments(query);
    const logs = await AuditLog.find(query)
      .populate('actor', 'name email role')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return res.status(200).json({
      success: true,
      message: 'Audit logs retrieved',
      data: logs,
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

export const getAdminReturns = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const { status, search } = req.query;

    const query = {};
    if (status && status !== 'all') query.status = status;
    if (search) {
      query.$or = [
        { orderNumber: new RegExp(search, 'i') },
        { customerNotes: new RegExp(search, 'i') },
      ];
    }

    const total = await ReturnRequest.countDocuments(query);
    const returns = await ReturnRequest.find(query)
      .populate('order', 'orderNumber totalAmount paymentMethod paymentStatus items')
      .populate('customer', 'name email phone')
      .populate('reviewedBy', 'name email role')
      .populate('items.product', 'name images sku')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return res.status(200).json({
      success: true,
      message: 'Return requests retrieved',
      data: returns,
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

export const reviewReturn = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, reviewNotes, issueRefund = false, refundAmount } = req.body;
    const actor = req.user;

    const returnReq = await ReturnRequest.findById(id).populate('order');
    if (!returnReq) {
      const error = new Error('Return request not found.');
      error.status = 404;
      throw error;
    }

    returnReq.status = status;
    if (reviewNotes) returnReq.reviewNotes = reviewNotes;
    returnReq.reviewedBy = actor._id;
    await returnReq.save();

    // If refund approved/issued, create Refund record
    let refundDoc = null;
    if ((issueRefund || status === 'refund_issued') && returnReq.order) {
      const amount = refundAmount || returnReq.order.totalAmount;
      refundDoc = await Refund.create({
        order: returnReq.order._id,
        payment: returnReq.order._id, // Links payment/order
        amount,
        reason: reviewNotes || `Return approved for order ${returnReq.orderNumber}`,
        status: status === 'refund_issued' ? 'processed' : 'approved',
        requestedBy: actor._id,
        approvedBy: actor._id,
        processedAt: new Date(),
      });

      // Update order status and paymentStatus
      await Order.findByIdAndUpdate(returnReq.order._id, {
        orderStatus: status === 'refund_issued' ? 'refunded' : 'refund_pending',
        paymentStatus: 'refunded',
      });
    }

    // Tell the customer what happened (refund wording is distinct from the return lifecycle).
    if (returnReq.order) {
      const key = `${returnReq._id}`;
      if (status === 'refund_issued' || issueRefund) {
        await publishRefundStatus({ orderId: returnReq.order._id, status: status === 'refund_issued' ? 'completed' : 'approved', refundKey: key });
      } else if (status === 'rejected') {
        await publishReturnStatus({ orderId: returnReq.order._id, status, key });
        await publishRefundStatus({ orderId: returnReq.order._id, status: 'rejected', refundKey: key });
      } else {
        await publishReturnStatus({ orderId: returnReq.order._id, status, key });
      }
    }

    await logAuditEvent({
      actorId: actor._id,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: 'RETURN_REQUEST_REVIEWED',
      targetModel: 'ReturnRequest',
      targetId: id,
      details: { newStatus: status, reviewNotes, refundIssued: !!refundDoc },
      ipAddress: req.ip,
    });

    return res.status(200).json({
      success: true,
      message: `Return request status updated to ${status}.`,
      data: {
        returnRequest: returnReq,
        refund: refundDoc,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getFinanceReconciliation = async (req, res, next) => {
  try {
    const [
      onlineRevenueAgg,
      codSummaryAgg,
      refundsAgg,
      recentPayments,
      recentRefunds,
    ] = await Promise.all([
      // Online settled payments
      Order.aggregate([
        {
          $match: {
            paymentMethod: { $in: ['Stripe', 'Safepay', 'Card', 'PayFast'] },
            paymentStatus: 'paid',
          },
        },
        { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
      ]),

      // COD breakdown: Collected, Pending, Reconciled
      Order.aggregate([
        { $match: { paymentMethod: 'COD' } },
        {
          $group: {
            _id: null,
            totalCODOrders: { $sum: 1 },
            collectedAmount: {
              $sum: { $cond: [{ $eq: ['$codCollected', true] }, '$totalAmount', 0] },
            },
            pendingAmount: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ['$codCollected', false] },
                      { $not: [{ $in: ['$orderStatus', ['cancelled', 'failed']] }] },
                    ],
                  },
                  '$totalAmount',
                  0,
                ],
              },
            },
            reconciledAmount: {
              $sum: { $cond: [{ $eq: ['$codReconciled', true] }, '$totalAmount', 0] },
            },
            unreconciledCollectedAmount: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ['$codCollected', true] },
                      { $eq: ['$codReconciled', false] },
                    ],
                  },
                  '$totalAmount',
                  0,
                ],
              },
            },
          },
        },
      ]),

      // Total Refunds
      Refund.aggregate([
        { $match: { status: { $in: ['approved', 'processed'] } } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),

      // Recent 10 payments/orders
      Order.find({ paymentStatus: { $in: ['paid', 'partially_refunded', 'refunded'] } })
        .select('orderNumber totalAmount paymentMethod paymentStatus paymentDetails codCollected codReconciled createdAt')
        .populate('customer', 'name email')
        .sort({ createdAt: -1 })
        .limit(10),

      // Recent 10 refunds
      Refund.find()
        .populate('order', 'orderNumber totalAmount')
        .populate('approvedBy', 'name email')
        .sort({ createdAt: -1 })
        .limit(10),
    ]);

    const online = onlineRevenueAgg[0] || { total: 0, count: 0 };
    const cod = codSummaryAgg[0] || {
      totalCODOrders: 0,
      collectedAmount: 0,
      pendingAmount: 0,
      reconciledAmount: 0,
      unreconciledCollectedAmount: 0,
    };
    const refunds = refundsAgg[0] || { total: 0, count: 0 };

    const totalSettledRevenue = online.total + cod.collectedAmount - refunds.total;

    return res.status(200).json({
      success: true,
      message: 'Financial reconciliation metrics computed',
      data: {
        summary: {
          onlineSettledRevenue: online.total,
          onlineTransactionsCount: online.count,
          codCollectedAmount: cod.collectedAmount,
          codPendingAmount: cod.pendingAmount,
          codReconciledAmount: cod.reconciledAmount,
          codUnreconciledCashOnHand: cod.unreconciledCollectedAmount,
          totalRefundsProcessed: refunds.total,
          refundsCount: refunds.count,
          netSettledRevenue: Math.max(0, totalSettledRevenue),
        },
        recentPayments,
        recentRefunds,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const reconcileCODOrders = async (req, res, next) => {
  try {
    const { orderIds } = req.body;
    const actor = req.user;

    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      const error = new Error('Please provide an array of orderIds to reconcile.');
      error.status = 400;
      throw error;
    }

    const result = await Order.updateMany(
      {
        _id: { $in: orderIds },
        paymentMethod: 'COD',
        codCollected: true,
      },
      {
        $set: { codReconciled: true },
      }
    );

    await logAuditEvent({
      actorId: actor._id,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: 'COD_RECONCILIATION_COMPLETED',
      targetModel: 'Order',
      targetId: orderIds.join(','),
      details: { countReconciled: result.modifiedCount },
      ipAddress: req.ip,
    });

    return res.status(200).json({
      success: true,
      message: `Successfully reconciled cash collection for ${result.modifiedCount} orders.`,
      data: { modifiedCount: result.modifiedCount },
    });
  } catch (error) {
    next(error);
  }
};

export const getProductAnalyticsHandler = async (req, res, next) => {
  try {
    const { dateFrom, dateTo } = req.query;
    const data = await getProductAnalytics({ dateFrom, dateTo });
    return res.status(200).json({
      success: true,
      message: 'Product performance analytics retrieved',
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const getCustomerAnalyticsHandler = async (req, res, next) => {
  try {
    const { dateFrom, dateTo } = req.query;
    const data = await getCustomerAnalytics({ dateFrom, dateTo });
    return res.status(200).json({
      success: true,
      message: 'Customer retention and LTV analytics retrieved',
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const getInventoryDemandHandler = async (req, res, next) => {
  try {
    const data = await getInventoryDemandInsights();
    return res.status(200).json({
      success: true,
      message: 'Inventory demand and stockout risk insights computed',
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const getDeliveryAnalyticsHandler = async (req, res, next) => {
  try {
    const { dateFrom, dateTo } = req.query;
    const data = await getDeliveryAnalytics({ dateFrom, dateTo });
    return res.status(200).json({
      success: true,
      message: 'Delivery run statistics retrieved',
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const getCampaignAnalyticsHandler = async (req, res, next) => {
  try {
    const data = await getCampaignAnalytics();
    return res.status(200).json({
      success: true,
      message: 'Campaign engagement and coupon attribution retrieved',
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const getBusinessInsightsHandler = async (req, res, next) => {
  try {
    const { query } = req.body;
    const staffRole = req.user.role;
    const insights = await generateStaffBusinessInsights({ query, staffRole });
    return res.status(200).json({
      success: true,
      message: 'Staff business insights generated from verified metrics',
      data: insights,
    });
  } catch (error) {
    next(error);
  }
};

// ── Rider applications ─────────────────────────────────────────────────

export const listRiders = async (req, res, next) => {
  try {
    const { status } = req.query;
    const query = { role: 'rider' };
    if (status === 'approved') query.approvalStatus = { $nin: ['pending', 'rejected'] };
    else if (status === 'pending' || status === 'rejected') query.approvalStatus = status;

    const riders = await User.find(query)
      .select('-password -refreshTokens')
      .sort({ createdAt: -1 })
      .limit(100);

    return res.status(200).json({ success: true, data: riders });
  } catch (error) {
    next(error);
  }
};

export const reviewRider = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { action, note = '' } = req.body;

    if (!['approve', 'reject'].includes(action)) {
      const error = new Error("Action must be either 'approve' or 'reject'.");
      error.status = 400;
      throw error;
    }

    const rider = await User.findOne({ _id: id, role: 'rider' });
    if (!rider) {
      const error = new Error('Rider not found.');
      error.status = 404;
      throw error;
    }

    rider.approvalStatus = action === 'approve' ? 'approved' : 'rejected';
    rider.approvalNote = String(note).slice(0, 300);
    await rider.save({ validateBeforeSave: false });

    await sendNotification({
      recipientId: rider._id,
      title: action === 'approve' ? 'Rider account approved' : 'Rider application declined',
      message:
        action === 'approve'
          ? 'Your rider account is confirmed. You can now receive and complete deliveries.'
          : `Your rider application was declined.${rider.approvalNote ? ` Reason: ${rider.approvalNote}` : ''}`,
      type: action === 'approve' ? 'rider_approved' : 'rider_rejected',
      referenceId: rider._id.toString(),
      referenceModel: 'User',
    });

    await logAuditEvent({
      actorId: req.user._id,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: action === 'approve' ? 'RIDER_APPROVED' : 'RIDER_REJECTED',
      targetModel: 'User',
      targetId: rider._id.toString(),
      details: { riderEmail: rider.email, note: rider.approvalNote },
      ipAddress: req.ip,
    });

    return res.status(200).json({
      success: true,
      message: action === 'approve' ? 'Rider approved.' : 'Rider application rejected.',
      data: {
        _id: rider._id,
        name: rider.name,
        email: rider.email,
        approvalStatus: rider.approvalStatus,
      },
    });
  } catch (error) {
    next(error);
  }
};
