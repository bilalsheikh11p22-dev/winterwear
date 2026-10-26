import DeliveryAssignment from '../models/DeliveryAssignment.js';
import Order from '../models/Order.js';
import User from '../models/User.js';
import Warehouse from '../models/Warehouse.js';
import { transitionOrderStatus } from '../services/orderService.js';
import { logAuditEvent } from '../services/auditService.js';
import { geocode, addressQueries, formatShippingAddress } from '../services/geocodeService.js';

const ACTIVE_STATUSES = ['pending_pickup', 'picked_up', 'in_transit'];
const HISTORY_STATUSES = ['completed', 'failed'];

const httpError = (message, status = 400, code) => {
  const error = new Error(message);
  error.status = status;
  if (code) error.code = code;
  return error;
};

const findOwnAssignment = async (assignmentId, riderId) => {
  const assignment = await DeliveryAssignment.findOne({ _id: assignmentId, rider: riderId });
  if (!assignment) throw httpError('Assignment not found or not assigned to you.', 404);
  return assignment;
};

// ── Map data ────────────────────────────────────────────────────────────

let pickupCache = { id: null, value: null, at: 0 };

/** Pickup point = the active warehouse (geocoded once and cached). */
const resolvePickup = async () => {
  const warehouse = await Warehouse.findOne({ isActive: true }).lean();
  if (!warehouse) return null;

  const address = [warehouse.location?.address, warehouse.location?.city, 'Pakistan']
    .filter(Boolean)
    .join(', ');
  const base = {
    name: warehouse.name,
    address,
    phone: warehouse.location?.phone || '',
    contactPerson: warehouse.location?.contactPerson || '',
  };

  const fresh = pickupCache.id === String(warehouse._id) && Date.now() - pickupCache.at < 30 * 60 * 1000;
  if (fresh && pickupCache.value?.lat != null) return { ...base, ...pickupCache.value };

  const point = await geocode([address, `${warehouse.location?.city || ''}, Pakistan`]);
  pickupCache = { id: String(warehouse._id), value: point, at: Date.now() };
  return { ...base, ...(point || {}) };
};

/** Geocodes up to `limit` drop-off addresses that have no coordinates yet and stores them on the order. */
const ensureDropLocations = async (orders, limit = 3) => {
  let done = 0;
  for (const order of orders) {
    if (done >= limit) break;
    if (order.deliveryLocation?.lat != null) continue;

    const point = await geocode(addressQueries(order.shippingAddress));
    done += 1;
    if (point) {
      order.deliveryLocation = point;
      await Order.updateOne({ _id: order._id }, { $set: { deliveryLocation: point } });
    }
  }
};

const presentAssignment = (assignment, pickup) => {
  const order = assignment.order;
  const addr = order?.shippingAddress || {};
  const isCod = order?.paymentMethod === 'COD' && order?.paymentStatus !== 'paid';

  return {
    _id: assignment._id,
    status: assignment.status,
    priority: assignment.priority,
    notes: assignment.notes || '',
    createdAt: assignment.createdAt,
    pickedUpAt: assignment.pickedUpAt || null,
    completedAt: assignment.completedAt || null,
    pickup,
    order: order
      ? {
          _id: order._id,
          orderNumber: order.orderNumber,
          orderStatus: order.orderStatus,
          paymentMethod: order.paymentMethod,
          paymentStatus: order.paymentStatus,
          totalAmount: order.totalAmount,
          codAmount: isCod ? order.totalAmount : 0,
          deliveryNotes: order.deliveryNotes || '',
          items: (order.items || []).map((item) => ({
            name: item.name,
            quantity: item.quantity,
            size: item.size,
            color: item.color?.name || '',
            image: item.image || '',
          })),
        }
      : null,
    drop: {
      name: addr.fullName || '',
      phone: addr.phone || '',
      address: formatShippingAddress(addr),
      lat: order?.deliveryLocation?.lat ?? null,
      lng: order?.deliveryLocation?.lng ?? null,
    },
  };
};

// ── Deliveries ──────────────────────────────────────────────────────────

export const getMyDeliveries = async (req, res, next) => {
  try {
    const { scope = 'active' } = req.query;
    const statuses = scope === 'history' ? HISTORY_STATUSES : ACTIVE_STATUSES;

    const assignments = await DeliveryAssignment.find({ rider: req.user._id, status: { $in: statuses } })
      .populate({
        path: 'order',
        select:
          'orderNumber items shippingAddress totalAmount paymentMethod paymentStatus orderStatus deliveryNotes deliveryLocation',
      })
      .sort({ createdAt: -1 })
      .limit(scope === 'history' ? 30 : 50);

    const orders = assignments.map((a) => a.order).filter(Boolean);
    const [pickup] = await Promise.all([resolvePickup(), ensureDropLocations(orders)]);

    return res.status(200).json({
      success: true,
      message: 'Rider assignments retrieved',
      data: assignments.map((a) => presentAssignment(a, pickup)),
    });
  } catch (error) {
    next(error);
  }
};

/** Rider collected the parcel from the warehouse -> order goes out for delivery. */
export const pickupDelivery = async (req, res, next) => {
  try {
    const riderId = req.user._id;
    const assignment = await findOwnAssignment(req.params.assignmentId, riderId);

    if (assignment.status !== 'pending_pickup') {
      throw httpError('This delivery has already been picked up.', 409);
    }

    const order = await Order.findById(assignment.order);
    if (!order) throw httpError('Order not found.', 404);

    if (order.orderStatus !== 'assigned_to_rider') {
      throw httpError(
        `This order is not ready for pickup yet (status: ${order.orderStatus.replace(/_/g, ' ')}). Please ask the warehouse to mark it ready for dispatch.`,
        409,
        'ORDER_NOT_READY'
      );
    }

    await transitionOrderStatus({
      orderId: order._id,
      targetStatus: 'picked_up',
      actorId: riderId,
      actorRole: 'rider',
      comment: 'Parcel collected by rider.',
    });
    await transitionOrderStatus({
      orderId: order._id,
      targetStatus: 'out_for_delivery',
      actorId: riderId,
      actorRole: 'rider',
      comment: 'Rider is on the way to the customer.',
    });

    assignment.status = 'in_transit';
    assignment.pickedUpAt = new Date();
    await assignment.save();

    return res.status(200).json({
      success: true,
      message: 'Pickup confirmed. Order is out for delivery.',
      data: { _id: assignment._id, status: assignment.status, pickedUpAt: assignment.pickedUpAt },
    });
  } catch (error) {
    next(error);
  }
};

const completeDelivery = async ({ assignment, riderId, body = {} }) => {
  const { otp, photoUrl, recipientSignature, recipientName, notes } = body;

  const order = await Order.findById(assignment.order);
  if (!order) throw httpError('Order not found.', 404);

  if (assignment.status !== 'in_transit') {
    throw httpError('Pick up the parcel first, then mark it as delivered.', 409, 'NOT_PICKED_UP');
  }

  order.proofOfDelivery = {
    otp: otp || '',
    photoUrl: photoUrl || '',
    recipientSignature: recipientSignature || recipientName || '',
    deliveredAt: new Date(),
  };

  // Cash on delivery: the rider collected the money at the door
  if (order.paymentMethod === 'COD') {
    order.codCollected = true;
    order.paymentStatus = 'paid';
  }
  await order.save();

  await transitionOrderStatus({
    orderId: order._id,
    targetStatus: 'delivered',
    actorId: riderId,
    actorRole: 'rider',
    comment: `Order delivered.${notes ? ` ${notes}` : ''}${order.paymentMethod === 'COD' ? ' Cash on delivery collected.' : ''}`,
  });

  assignment.status = 'completed';
  assignment.completedAt = new Date();
  if (notes) assignment.riderNotes = notes;
  await assignment.save();

  return { orderId: order._id, orderNumber: order.orderNumber, deliveredAt: order.proofOfDelivery.deliveredAt };
};

/** Rider handed the parcel to the customer. */
export const dropDelivery = async (req, res, next) => {
  try {
    const assignment = await findOwnAssignment(req.params.assignmentId, req.user._id);
    const data = await completeDelivery({ assignment, riderId: req.user._id, body: req.body });

    return res.status(200).json({
      success: true,
      message: 'Delivery completed. Order marked as delivered.',
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const failDelivery = async (req, res, next) => {
  try {
    const riderId = req.user._id;
    const { reason = '' } = req.body;
    const assignment = await findOwnAssignment(req.params.assignmentId, riderId);

    if (assignment.status !== 'in_transit') {
      throw httpError('Only deliveries that are on the way can be marked as failed.', 409);
    }

    await transitionOrderStatus({
      orderId: assignment.order,
      targetStatus: 'delivery_failed',
      actorId: riderId,
      actorRole: 'rider',
      comment: `Delivery failed. ${reason}`.trim(),
    });

    assignment.status = 'failed';
    assignment.failureReason = String(reason).slice(0, 300);
    assignment.completedAt = new Date();
    await assignment.save();

    return res.status(200).json({ success: true, message: 'Delivery marked as failed.', data: assignment });
  } catch (error) {
    next(error);
  }
};

/** Backwards-compatible endpoint: maps the old status names onto the new actions. */
export const updateDeliveryStatus = async (req, res, next) => {
  const { status } = req.body;
  if (status === 'picked_up' || status === 'out_for_delivery') return pickupDelivery(req, res, next);
  if (status === 'delivered') return dropDelivery(req, res, next);
  if (status === 'delivery_failed') return failDelivery(req, res, next);
  return next(httpError(`Unsupported delivery status '${status}'.`, 400));
};

export const submitProofOfDelivery = async (req, res, next) => {
  try {
    const assignment = await findOwnAssignment(req.params.assignmentId, req.user._id);
    const data = await completeDelivery({ assignment, riderId: req.user._id, body: req.body });

    return res.status(200).json({
      success: true,
      message: 'Proof of delivery submitted successfully. Order marked delivered.',
      data,
    });
  } catch (error) {
    next(error);
  }
};

// ── Live location ───────────────────────────────────────────────────────

export const updateMyLocation = async (req, res, next) => {
  try {
    const lat = Number(req.body.lat);
    const lng = Number(req.body.lng);

    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      throw httpError('A valid latitude and longitude are required.', 400);
    }

    await User.updateOne(
      { _id: req.user._id },
      { $set: { 'riderProfile.currentLocation': { lat, lng, updatedAt: new Date() } } }
    );

    return res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};

// ── Summary ─────────────────────────────────────────────────────────────

export const getRiderSummary = async (req, res, next) => {
  try {
    const riderId = req.user._id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalToday, deliveredToday, pendingNow, codResult] = await Promise.all([
      DeliveryAssignment.countDocuments({ rider: riderId, createdAt: { $gte: today } }),
      DeliveryAssignment.countDocuments({ rider: riderId, status: 'completed', completedAt: { $gte: today } }),
      DeliveryAssignment.countDocuments({ rider: riderId, status: { $in: ACTIVE_STATUSES } }),
      Order.aggregate([
        {
          $match: {
            assignedRider: riderId,
            codCollected: true,
            'proofOfDelivery.deliveredAt': { $gte: today },
          },
        },
        { $group: { _id: null, totalCod: { $sum: '$totalAmount' } } },
      ]),
    ]);

    return res.status(200).json({
      success: true,
      message: 'Rider summary retrieved',
      data: {
        totalToday,
        deliveredToday,
        pendingToday: pendingNow,
        codCollectedToday: codResult[0]?.totalCod || 0,
      },
    });
  } catch (error) {
    next(error);
  }
};
