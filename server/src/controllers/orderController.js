import Order from '../models/Order.js';
import { createOrderFromCheckout, transitionOrderStatus } from '../services/orderService.js';
import { logAuditEvent } from '../services/auditService.js';

export const checkout = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { items, shippingAddress, paymentMethod, couponCode, deliveryNotes } = req.body;
    const idempotencyKey = req.headers['idempotency-key'] || req.body.idempotencyKey;

    const order = await createOrderFromCheckout({
      userId,
      items,
      shippingAddress,
      paymentMethod,
      couponCode,
      deliveryNotes,
      idempotencyKey,
    });

    return res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

export const getMyOrders = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const status = req.query.status;

    const query = { customer: userId };
    if (status) {
      query.orderStatus = status;
    }

    const total = await Order.countDocuments(query);
    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('items.product', 'name slug images');

    return res.status(200).json({
      success: true,
      message: 'Orders retrieved successfully',
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

export const getOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const userRole = req.user.role;

    const order = await Order.findById(id)
      .populate('items.product', 'name slug images')
      .populate('customer', 'firstName lastName email phone')
      .populate('assignedRider', 'firstName lastName phone');

    if (!order) {
      const error = new Error('Order not found');
      error.status = 404;
      throw error;
    }

    // Role check: Only customer owner or staff can view
    const isOwner = order.customer._id.toString() === userId.toString();
    const isStaff = ['admin', 'super_admin', 'fulfillment', 'inventory_manager', 'rider', 'customer_support'].includes(userRole);

    if (!isOwner && !isStaff) {
      const error = new Error('Unauthorized to view this order');
      error.status = 403;
      throw error;
    }

    return res.status(200).json({
      success: true,
      message: 'Order retrieved successfully',
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

export const updateOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, comment } = req.body;
    const actorId = req.user._id;
    const actorRole = req.user.role;

    const updatedOrder = await transitionOrderStatus({
      orderId: id,
      targetStatus: status,
      actorId,
      actorRole,
      comment,
    });

    await logAuditEvent({
      actorId,
      actorEmail: req.user.email,
      actorRole,
      action: 'ORDER_STATUS_UPDATE',
      targetModel: 'Order',
      targetId: id,
      details: { fromStatus: updatedOrder.statusHistory[updatedOrder.statusHistory.length - 2]?.status, toStatus: status, comment },
    });

    return res.status(200).json({
      success: true,
      message: `Order status successfully transitioned to ${status}`,
      data: updatedOrder,
    });
  } catch (error) {
    next(error);
  }
};

export const trackOrder = async (req, res, next) => {
  try {
    const { orderNumber } = req.params;
    const phone = req.query.phone;

    if (!orderNumber) {
      const error = new Error('Order number is required');
      error.status = 400;
      throw error;
    }

    const order = await Order.findOne({ orderNumber: orderNumber.toUpperCase() });

    if (!order) {
      const error = new Error('Order not found with the provided details');
      error.status = 404;
      throw error;
    }

    // Security check: phone match if provided or required
    if (phone && order.shippingAddress.phone !== phone) {
      const error = new Error('Verification failed. Invalid phone number for this order.');
      error.status = 403;
      throw error;
    }

    return res.status(200).json({
      success: true,
      message: 'Tracking information retrieved',
      data: {
        orderNumber: order.orderNumber,
        orderStatus: order.orderStatus,
        statusHistory: order.statusHistory,
        trackingCode: order.trackingCode,
        createdAt: order.createdAt,
        estimatedDelivery: order.estimatedDelivery || null,
        city: order.shippingAddress.city,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const cancelOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const order = await Order.findById(id);
    if (!order) {
      const error = new Error('Order not found');
      error.status = 404;
      throw error;
    }

    // Ownership check
    if (order.customer.toString() !== userId.toString() && req.user.role !== 'super_admin' && req.user.role !== 'admin') {
      const error = new Error('Forbidden: You can only cancel your own orders');
      error.status = 403;
      throw error;
    }

    const cancellableStatuses = ['pending_payment', 'confirmed', 'processing'];
    if (!cancellableStatuses.includes(order.orderStatus)) {
      const error = new Error(`Order cannot be cancelled in '${order.orderStatus}' status.`);
      error.status = 400;
      throw error;
    }

    const updatedOrder = await transitionOrderStatus({
      orderId: order._id,
      targetStatus: 'cancelled',
      actorId: userId,
      actorRole: 'customer',
      comment: req.body.reason || 'Cancelled by customer',
    });

    return res.status(200).json({
      success: true,
      message: 'Order cancelled successfully',
      data: updatedOrder,
    });
  } catch (error) {
    next(error);
  }
};

export const requestReturn = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const order = await Order.findById(id);
    if (!order) {
      const error = new Error('Order not found');
      error.status = 404;
      throw error;
    }

    if (order.customer.toString() !== userId.toString() && req.user.role !== 'super_admin' && req.user.role !== 'admin') {
      const error = new Error('Forbidden: You can only request returns for your own orders');
      error.status = 403;
      throw error;
    }

    if (order.orderStatus !== 'delivered') {
      const error = new Error("Returns can only be requested for orders with 'delivered' status.");
      error.status = 400;
      throw error;
    }

    const updatedOrder = await transitionOrderStatus({
      orderId: order._id,
      targetStatus: 'return_requested',
      actorId: userId,
      actorRole: 'customer',
      comment: req.body.reason || 'Customer requested return of items',
    });

    return res.status(200).json({
      success: true,
      message: 'Return request submitted successfully',
      data: updatedOrder,
    });
  } catch (error) {
    next(error);
  }
};
