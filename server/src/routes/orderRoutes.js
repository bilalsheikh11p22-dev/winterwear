import express from 'express';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// GET /api/orders/track/:orderNumber - Public or customer order tracking
router.get('/track/:orderNumber', async (req, res, next) => {
  try {
    const order = await Order.findOne({ orderNumber: req.params.orderNumber.toUpperCase() })
      .select('orderNumber orderStatus statusHistory trackingCode assignedRider shippingAddress createdAt')
      .populate('assignedRider', 'name phone');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order number not found' });
    }

    res.json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
});

// GET /api/orders/my-orders - Customer order history
router.get('/my-orders', protect, async (req, res, next) => {
  try {
    const orders = await Order.find({ customer: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, data: orders });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/orders/:id/status - Update order lifecycle status (Admin, Fulfillment, Rider)
router.patch('/:id/status', protect, authorize('admin', 'superadmin', 'inventory_manager', 'rider', 'fulfillment'), async (req, res, next) => {
  try {
    const { status, comment } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    order.orderStatus = status;
    order.statusHistory.push({
      status,
      changedBy: req.user._id,
      role: req.user.role,
      comment: comment || '',
      timestamp: new Date(),
    });

    await order.save();
    res.json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
});

export default router;
