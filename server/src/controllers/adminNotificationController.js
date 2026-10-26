import mongoose from 'mongoose';
import Notification from '../models/Notification.js';
import NotificationDeliveryAttempt from '../models/NotificationDeliveryAttempt.js';
import NotificationCampaign from '../models/NotificationCampaign.js';
import OutboxEvent from '../models/OutboxEvent.js';
import CouponRedemption from '../models/CouponRedemption.js';
import { logAuditEvent } from '../services/auditService.js';
import { retryEmailDelivery, toClient } from '../services/notifications/notificationService.js';
import { retryEvent } from '../services/notifications/outbox.js';
import { emailStatus } from '../services/notifications/emailProvider.js';
import {
  createCampaign, publishCampaign, pauseCampaign, cancelCampaign, previewCampaign, runCampaignBatches,
} from '../services/notifications/campaignService.js';

const audit = (req, action, targetModel, targetId, details = {}) =>
  logAuditEvent({ actorId: req.user._id, actorEmail: req.user.email, actorRole: req.user.role, action, targetModel, targetId, details, ipAddress: req.ip });

const httpError = (m, s = 400) => Object.assign(new Error(m), { status: s });

// ── Activity (admins only — contains per-customer data) ─────────────────────────────────
export const getActivity = async (req, res, next) => {
  try {
    const { page, limit, type, recipient, emailStatus: es, from, to } = req.query;
    const q = {};
    if (type) q.type = type;
    if (recipient) q.recipient = recipient;
    if (es) q['deliveryStatus.email'] = es;
    if (from || to) q.createdAt = { ...(from ? { $gte: new Date(from) } : {}), ...(to ? { $lte: new Date(to) } : {}) };
    const [rows, total] = await Promise.all([
      Notification.find(q).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate('recipient', 'name role').lean(),
      Notification.countDocuments(q),
    ]);
    res.json({
      success: true,
      data: {
        items: rows.map((n) => ({
          ...toClient(n),
          recipient: n.recipient ? { _id: String(n.recipient._id), name: n.recipient.name, role: n.recipient.role } : null,
          emailStatus: n.deliveryStatus?.email, emailReason: n.deliveryStatus?.emailReason,
        })),
      },
      meta: { total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) },
    });
  } catch (err) {
    next(err);
  }
};

export const getFailedDeliveries = async (req, res, next) => {
  try {
    const attempts = await NotificationDeliveryAttempt.find({ status: 'failed' })
      .sort({ createdAt: -1 }).limit(100).populate('notification', 'type title deliveryStatus createdAt').lean();
    // Only the most recent attempt per notification matters, and only if it is still unresolved
    const seen = new Set();
    const items = [];
    for (const a of attempts) {
      const nid = String(a.notification?._id || a.notification);
      if (seen.has(nid) || a.notification?.deliveryStatus?.email === 'sent') continue;
      seen.add(nid);
      items.push({ _id: String(a._id), notificationId: nid, type: a.notification?.type, title: a.notification?.title, provider: a.provider, error: a.error, attempt: a.attempt, to: a.toMasked, at: a.createdAt });
    }
    res.json({ success: true, data: { items } });
  } catch (err) {
    next(err);
  }
};

export const retryDelivery = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) throw httpError('Notification not found.', 404);
    const n = await retryEmailDelivery(req.params.id);
    if (!n) throw httpError('Nothing to retry for this notification.', 409);
    await audit(req, 'NOTIFICATION_DELIVERY_RETRIED', 'Notification', n._id);
    res.json({ success: true, message: 'Delivery re-queued.' });
  } catch (err) {
    next(err);
  }
};

export const getEventHistory = async (req, res, next) => {
  try {
    const q = req.query.status ? { status: req.query.status } : {};
    const items = await OutboxEvent.find(q).sort({ createdAt: -1 }).limit(100).select('-payload').lean();
    res.json({ success: true, data: { items } });
  } catch (err) {
    next(err);
  }
};

export const retryOutboxEvent = async (req, res, next) => {
  try {
    const evt = await retryEvent(req.params.id);
    if (!evt) throw httpError('Only failed or dead events can be retried.', 409);
    await audit(req, 'OUTBOX_EVENT_RETRIED', 'OutboxEvent', evt._id, { name: evt.name });
    res.json({ success: true, message: 'Event re-queued.' });
  } catch (err) {
    next(err);
  }
};

// ── Metrics — database-backed only. Opens/clicks-in-email/bounces are NOT fabricated. ───────
export const getMetrics = async (req, res, next) => {
  try {
    const since = new Date(Date.now() - req.query.days * 86400000);
    const match = { createdAt: { $gte: since } };
    const [totals, byType, emailBy, failedAttempts, redemptions, outbox, campaigns] = await Promise.all([
      Notification.aggregate([
        { $match: match },
        { $group: { _id: null, created: { $sum: 1 }, read: { $sum: { $cond: ['$isRead', 1, 0] } }, clicked: { $sum: { $cond: [{ $ifNull: ['$clickedAt', false] }, 1, 0] } } } },
      ]),
      Notification.aggregate([{ $match: match }, { $group: { _id: '$type', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
      Notification.aggregate([{ $match: match }, { $group: { _id: '$deliveryStatus.email', count: { $sum: 1 } } }]),
      NotificationDeliveryAttempt.countDocuments({ status: 'failed', createdAt: { $gte: since } }),
      CouponRedemption.aggregate([
        { $match: { status: 'redeemed', redeemedAt: { $gte: since } } },
        { $group: { _id: null, count: { $sum: 1 }, sales: { $sum: '$orderTotal' }, discount: { $sum: '$discountAmount' } } },
      ]),
      OutboxEvent.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      NotificationCampaign.aggregate([{ $match: match }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    ]);
    const t = totals[0] || { created: 0, read: 0, clicked: 0 };
    const emailMap = Object.fromEntries(emailBy.map((e) => [e._id, e.count]));
    const orderTypes = new Set(['order_placed', 'payment_pending', 'payment_confirmed', 'payment_failed', 'order_confirmed', 'order_processing', 'order_packed', 'order_shipped', 'delivery_rider_assigned', 'out_for_delivery', 'delivered', 'delivery_failed', 'order_cancelled', 'refund_requested', 'refund_approved', 'refund_rejected', 'refund_completed', 'return_requested', 'return_update']);
    const r = redemptions[0] || { count: 0, sales: 0, discount: 0 };
    res.json({
      success: true,
      data: {
        windowDays: req.query.days,
        notificationsCreated: t.created,
        inAppReadRate: t.created ? Number((t.read / t.created).toFixed(4)) : 0,
        // Clicks on the in-app action (we record these). Email opens/clicks are not tracked.
        inAppClicks: t.clicked,
        inAppClickThroughRate: t.created ? Number((t.clicked / t.created).toFixed(4)) : 0,
        email: {
          provider: emailStatus(),
          sent: emailMap.sent || 0,
          pending: emailMap.pending || 0,
          failed: emailMap.failed || 0,
          skipped: emailMap.skipped || 0,
          delivered: null, bounced: null, opened: null, clicked: null,
          note: 'Delivered/bounced/opened/clicked are not reported: no provider webhook events are connected.',
        },
        failedDeliveryAttempts: failedAttempts,
        orderNotificationsByType: byType.filter((b) => orderTypes.has(b._id)).map((b) => ({ type: b._id, count: b.count })),
        notificationsByType: byType.map((b) => ({ type: b._id, count: b.count })),
        coupons: { redemptions: r.count, attributedSales: r.sales, discountGiven: r.discount },
        outbox: Object.fromEntries(outbox.map((o) => [o._id, o.count])),
        campaignsByStatus: Object.fromEntries(campaigns.map((c) => [c._id, c.count])),
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── Campaigns ───────────────────────────────────────────────────────────────────────────
export const listCampaigns = async (req, res, next) => {
  try {
    const items = await NotificationCampaign.find().sort({ createdAt: -1 }).limit(100)
      .populate('coupon', 'code').populate('products', 'name slug').lean();
    res.json({ success: true, data: { items } });
  } catch (err) {
    next(err);
  }
};

export const getCampaign = async (req, res, next) => {
  try {
    const c = await NotificationCampaign.findById(req.params.id).populate('coupon', 'code').populate('products', 'name slug');
    if (!c) throw httpError('Campaign not found.', 404);
    // Real, database-backed delivery results
    const [stats] = await Notification.aggregate([
      { $match: { campaign: c._id } },
      { $group: { _id: null, created: { $sum: 1 }, read: { $sum: { $cond: ['$isRead', 1, 0] } }, clicked: { $sum: { $cond: [{ $ifNull: ['$clickedAt', false] }, 1, 0] } }, emailSent: { $sum: { $cond: [{ $eq: ['$deliveryStatus.email', 'sent'] }, 1, 0] } }, emailFailed: { $sum: { $cond: [{ $eq: ['$deliveryStatus.email', 'failed'] }, 1, 0] } } } },
    ]);
    res.json({ success: true, data: { campaign: c, results: stats || { created: 0, read: 0, clicked: 0, emailSent: 0, emailFailed: 0 } } });
  } catch (err) {
    next(err);
  }
};

export const postCampaign = async (req, res, next) => {
  try {
    const { campaign, duplicate } = await createCampaign(req.body, req.user);
    if (!duplicate) await audit(req, 'CAMPAIGN_CREATED', 'NotificationCampaign', campaign._id, { kind: campaign.kind });
    res.status(duplicate ? 200 : 201).json({ success: true, data: { campaign, duplicate } });
  } catch (err) {
    next(err);
  }
};

export const previewCampaignHandler = async (req, res, next) => {
  try {
    const c = await NotificationCampaign.findById(req.params.id);
    if (!c) throw httpError('Campaign not found.', 404);
    res.json({ success: true, data: await previewCampaign(c, req.user) });
  } catch (err) {
    next(err);
  }
};

export const publishCampaignHandler = async (req, res, next) => {
  try {
    const c = await publishCampaign(req.params.id);
    await audit(req, c.status === 'scheduled' ? 'CAMPAIGN_SCHEDULED' : 'CAMPAIGN_PUBLISHED', 'NotificationCampaign', c._id);
    if (c.status === 'running') runCampaignBatches(c._id).catch((e) => console.error('[Campaign] run error:', e.message));
    res.json({ success: true, data: { campaign: c } });
  } catch (err) {
    next(err);
  }
};

export const pauseCampaignHandler = async (req, res, next) => {
  try {
    const c = await pauseCampaign(req.params.id);
    await audit(req, 'CAMPAIGN_PAUSED', 'NotificationCampaign', c._id);
    res.json({ success: true, data: { campaign: c } });
  } catch (err) {
    next(err);
  }
};

export const cancelCampaignHandler = async (req, res, next) => {
  try {
    const c = await cancelCampaign(req.params.id);
    await audit(req, 'CAMPAIGN_CANCELLED', 'NotificationCampaign', c._id);
    res.json({ success: true, data: { campaign: c } });
  } catch (err) {
    next(err);
  }
};
