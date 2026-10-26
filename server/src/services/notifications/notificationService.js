import mongoose from 'mongoose';
import Notification from '../../models/Notification.js';
import NotificationDeliveryAttempt from '../../models/NotificationDeliveryAttempt.js';
import User from '../../models/User.js';
import { FILTERS, getTypeMeta } from './catalog.js';
import { channelDecision, getPreferences, signUnsubscribeToken } from './preferenceService.js';
import { enqueueEvent } from './outbox.js';
import { getEmailProvider } from './emailProvider.js';
import { renderNotificationEmail } from './emailTemplates.js';
import { emitToUser } from '../../socket/index.js';

const MARKETING_MAX_PER_DAY = () => Number(process.env.MARKETING_MAX_PER_DAY) || 3;

/** Public shape sent to browsers (no internal bookkeeping). */
export const toClient = (n) => {
  const o = typeof n.toObject === 'function' ? n.toObject() : n;
  return {
    _id: String(o._id),
    type: o.type,
    category: o.category,
    title: o.title,
    message: o.message,
    data: o.data || {},
    actionUrl: o.actionUrl || '',
    imageUrl: o.imageUrl || '',
    priority: o.priority,
    isRead: !!o.isRead,
    readAt: o.readAt || null,
    isMarketing: !!o.isMarketing,
    createdAt: o.createdAt,
  };
};

export const getUnreadCount = (userId) =>
  Notification.countDocuments({ recipient: userId, isRead: false, dismissedAt: null });

const pushCount = async (userId) => emitToUser(userId, 'notification:unread-count', { unreadCount: await getUnreadCount(userId) });

/**
 * The single entry point for creating a notification.
 * - Deduplicates on (recipient, eventId) via a unique index, so event retries are harmless.
 * - Applies the recipient's preferences and the marketing frequency cap.
 * - Persists FIRST (MongoDB is the source of truth), then best-effort emits over Socket.IO and queues email.
 */
export const createNotification = async ({
  recipient,
  recipientDoc = null,
  prefs = null,
  type,
  title,
  message,
  data = {},
  actionUrl = '',
  imageUrl = '',
  eventId,
  priority,
  campaign,
  referenceId,
  referenceModel,
  emailRequested = true,
  bypassFrequency = false,
}) => {
  const meta = getTypeMeta(type);
  if (!meta) throw new Error(`Unknown notification type "${type}"`);

  const user = recipientDoc || (await User.findById(recipient).select('role isActive'));
  if (!user || user.isActive === false) return { status: 'skipped_inactive' };
  const recipientId = user._id;

  const preferences = prefs || (await getPreferences(recipientId));
  const decision = channelDecision(meta, preferences, { campaignEmail: emailRequested ? null : false });
  if (!decision.inApp) return { status: 'skipped_preference' };

  if (!meta.transactional && !bypassFrequency) {
    const since = new Date(Date.now() - 24 * 3600 * 1000);
    const recent = await Notification.countDocuments({ recipient: recipientId, isMarketing: true, createdAt: { $gte: since } });
    if (recent >= MARKETING_MAX_PER_DAY()) return { status: 'skipped_frequency' };
  }

  let notification;
  try {
    notification = await Notification.create({
      recipient: recipientId,
      recipientRole: user.role || '',
      type,
      title,
      message,
      data,
      actionUrl,
      imageUrl,
      eventId,
      priority,
      campaign,
      referenceId,
      referenceModel,
      channels: decision.email ? ['in_app', 'email'] : ['in_app'],
      deliveryStatus: {
        inApp: 'sent',
        email: decision.email ? 'pending' : meta.email ? 'skipped' : 'not_requested',
        emailReason: !decision.email && meta.email ? (emailRequested ? 'opted_out' : 'not_requested_by_campaign') : '',
      },
    });
  } catch (err) {
    if (err.code === 11000) return { status: 'duplicate' };
    throw err;
  }

  // Real-time is best effort — the notification already exists and is fetchable via the API.
  try {
    emitToUser(recipientId, 'notification:created', toClient(notification));
    await pushCount(recipientId);
  } catch (err) {
    console.error('[Notifications] socket emit failed:', err.message);
  }

  if (decision.email) {
    try {
      await enqueueEvent({ name: 'notification.email', eventId: `email:${notification._id}`, payload: { notificationId: String(notification._id) } });
    } catch (err) {
      console.error('[Notifications] could not queue email:', err.message);
      await Notification.updateOne({ _id: notification._id }, { $set: { 'deliveryStatus.email': 'failed', 'deliveryStatus.emailReason': 'queue_error' } });
    }
  }

  return { status: 'created', notification };
};

// ── Reads / state changes (always scoped to the owner) ───────────────────────────────────
export const listNotifications = async (userId, { page = 1, limit = 20, filter = 'all', sort = 'newest' } = {}) => {
  const query = { recipient: userId, dismissedAt: null, ...(FILTERS[filter] || {}) };
  const [items, total, unreadCount] = await Promise.all([
    Notification.find(query)
      .sort({ createdAt: sort === 'oldest' ? 1 : -1, _id: sort === 'oldest' ? 1 : -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Notification.countDocuments(query),
    getUnreadCount(userId),
  ]);
  return { items: items.map(toClient), total, unreadCount, page, limit, pages: Math.max(1, Math.ceil(total / limit)) };
};

export const markRead = async (userId, id) => {
  if (!mongoose.isValidObjectId(id)) return null;
  const n = await Notification.findOneAndUpdate(
    { _id: id, recipient: userId },
    { $set: { isRead: true }, $min: { readAt: new Date() } },
    { new: true }
  );
  if (!n) return null;
  emitToUser(userId, 'notification:read', { id: String(n._id) });
  await pushCount(userId);
  return n;
};

export const markAllRead = async (userId, filter = 'all') => {
  const cond = { recipient: userId, isRead: false, dismissedAt: null };
  const f = FILTERS[filter] || {};
  if (f.category) cond.category = f.category;
  const res = await Notification.updateMany(cond, { $set: { isRead: true, readAt: new Date() } });
  emitToUser(userId, 'notification:read-all', {});
  await pushCount(userId);
  return res.modifiedCount;
};

/** Soft-dismiss. Rows are kept (order & security history is never destroyed by a user click). */
export const dismiss = async (userId, id) => {
  if (!mongoose.isValidObjectId(id)) return null;
  const n = await Notification.findOneAndUpdate(
    { _id: id, recipient: userId },
    { $set: { dismissedAt: new Date(), isRead: true } },
    { new: true }
  );
  if (n) {
    emitToUser(userId, 'notification:dismissed', { id: String(n._id) });
    await pushCount(userId);
  }
  return n;
};

/** Records a real click on the notification's action (used for honest CTR metrics) and marks it read. */
export const recordClick = async (userId, id) => {
  if (!mongoose.isValidObjectId(id)) return null;
  const n = await Notification.findOneAndUpdate(
    { _id: id, recipient: userId },
    { $set: { isRead: true }, $min: { readAt: new Date(), clickedAt: new Date() } },
    { new: true }
  );
  if (n) {
    emitToUser(userId, 'notification:read', { id: String(n._id) });
    await pushCount(userId);
  }
  return n;
};

// ── Email channel (runs inside the outbox worker) ────────────────────────────────────────
const maskEmail = (e = '') => e.replace(/^(.).*(@.*)$/, '$1***$2');
const apiPublicUrl = () => (process.env.API_PUBLIC_URL || `http://localhost:${process.env.PORT || 5000}`).replace(/\/$/, '');

export const deliverNotificationEmail = async ({ notificationId }) => {
  const n = await Notification.findById(notificationId);
  if (!n) return { status: 'missing' };
  if (n.deliveryStatus?.email === 'sent') return { status: 'already_sent' };
  const priorSent = await NotificationDeliveryAttempt.exists({ notification: n._id, status: 'sent' });
  if (priorSent) return { status: 'already_sent' };

  const meta = getTypeMeta(n.type);
  const skip = async (reason) => {
    await Notification.updateOne({ _id: n._id }, { $set: { 'deliveryStatus.email': 'skipped', 'deliveryStatus.emailReason': reason } });
    await NotificationDeliveryAttempt.create({ notification: n._id, recipient: n.recipient, status: 'skipped', error: reason });
    return { status: 'skipped', reason };
  };

  const provider = getEmailProvider();
  if (!provider) return skip('email_not_configured');

  const user = await User.findById(n.recipient).select('email name isActive');
  if (!user?.email || user.isActive === false) return skip('no_deliverable_recipient');

  // Re-check consent at send time — the user may have unsubscribed since we queued this.
  const decision = channelDecision(meta, await getPreferences(n.recipient));
  if (!decision.email) return skip('opted_out');

  const unsubscribeUrl = n.isMarketing ? `${apiPublicUrl()}/api/v1/notifications/unsubscribe?token=${signUnsubscribeToken(n.recipient)}` : '';
  const { subject, html, text } = renderNotificationEmail(n, { name: user.name, unsubscribeUrl });
  const attemptNo = (await NotificationDeliveryAttempt.countDocuments({ notification: n._id, status: 'failed' })) + 1;

  try {
    const info = await provider.send({
      to: user.email,
      subject,
      html,
      text,
      headers: unsubscribeUrl
        ? { 'List-Unsubscribe': `<${unsubscribeUrl}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' }
        : {},
    });
    await NotificationDeliveryAttempt.create({
      notification: n._id, recipient: n.recipient, provider: provider.name, status: 'sent',
      attempt: attemptNo, providerMessageId: info?.messageId || '', toMasked: maskEmail(user.email),
    });
    await Notification.updateOne({ _id: n._id }, { $set: { 'deliveryStatus.email': 'sent', 'deliveryStatus.emailReason': '' } });
    return { status: 'sent' };
  } catch (err) {
    await NotificationDeliveryAttempt.create({
      notification: n._id, recipient: n.recipient, provider: provider.name, status: 'failed',
      attempt: attemptNo, error: String(err.message).slice(0, 300), toMasked: maskEmail(user.email),
    });
    await Notification.updateOne({ _id: n._id }, { $set: { 'deliveryStatus.email': 'failed', 'deliveryStatus.emailReason': 'provider_error' } });
    throw err; // let the outbox apply bounded exponential backoff; the in-app notification is untouched
  }
};

/** Admin: re-queue a failed email delivery. */
export const retryEmailDelivery = async (notificationId) => {
  const n = await Notification.findById(notificationId);
  if (!n || n.deliveryStatus?.email === 'sent') return null;
  await Notification.updateOne({ _id: n._id }, { $set: { 'deliveryStatus.email': 'pending', 'deliveryStatus.emailReason': '' } });
  await enqueueEvent({ name: 'notification.email', eventId: `email:${n._id}:retry:${Date.now()}`, payload: { notificationId: String(n._id) } });
  return n;
};
