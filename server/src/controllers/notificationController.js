import * as svc from '../services/notifications/notificationService.js';
import { getPreferences, updatePreferences, unsubscribeFromToken } from '../services/notifications/preferenceService.js';
import { emailStatus } from '../services/notifications/emailProvider.js';

const notFound = () => Object.assign(new Error('Notification not found.'), { status: 404, code: 'NOTIFICATION_NOT_FOUND' });

// GET /notifications  — shape kept backward compatible: data.items + data.unreadCount (+ pagination in meta)
export const getMyNotifications = async (req, res, next) => {
  try {
    const { items, total, unreadCount, page, limit, pages } = await svc.listNotifications(req.user._id, req.query);
    res.json({ success: true, data: { items, unreadCount }, meta: { total, page, limit, pages } });
  } catch (err) {
    next(err);
  }
};

export const getUnreadCount = async (req, res, next) => {
  try {
    res.json({ success: true, data: { unreadCount: await svc.getUnreadCount(req.user._id) } });
  } catch (err) {
    next(err);
  }
};

// Reading the dropdown never marks anything read. Only these explicit actions do.
export const markNotificationRead = async (req, res, next) => {
  try {
    const n = await svc.markRead(req.user._id, req.params.id);
    if (!n) throw notFound(); // also returned for someone else's notification — never reveals existence
    res.json({ success: true, data: { notification: svc.toClient(n), unreadCount: await svc.getUnreadCount(req.user._id) } });
  } catch (err) {
    next(err);
  }
};

export const markAllNotificationsRead = async (req, res, next) => {
  try {
    const updated = await svc.markAllRead(req.user._id, req.body?.filter);
    res.json({ success: true, data: { updated, unreadCount: await svc.getUnreadCount(req.user._id) } });
  } catch (err) {
    next(err);
  }
};

export const dismissNotification = async (req, res, next) => {
  try {
    const n = await svc.dismiss(req.user._id, req.params.id);
    if (!n) throw notFound();
    res.json({ success: true, data: { unreadCount: await svc.getUnreadCount(req.user._id) } });
  } catch (err) {
    next(err);
  }
};

export const trackNotificationClick = async (req, res, next) => {
  try {
    const n = await svc.recordClick(req.user._id, req.params.id);
    if (!n) throw notFound();
    res.json({ success: true, data: { unreadCount: await svc.getUnreadCount(req.user._id) } });
  } catch (err) {
    next(err);
  }
};

export const getNotificationPreferences = async (req, res, next) => {
  try {
    res.json({ success: true, data: { preferences: await getPreferences(req.user._id), email: emailStatus() } });
  } catch (err) {
    next(err);
  }
};

export const patchNotificationPreferences = async (req, res, next) => {
  try {
    res.json({ success: true, message: 'Preferences saved.', data: { preferences: await updatePreferences(req.user._id, req.body) } });
  } catch (err) {
    next(err);
  }
};

// Public one-click unsubscribe from promotional email (signed token, no login)
export const unsubscribeMarketing = async (req, res) => {
  const page = (title, body) =>
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>` +
    `<body style="font-family:Helvetica,Arial,sans-serif;background:#17191C;color:#F8F7F4;display:grid;place-items:center;min-height:100vh;margin:0">` +
    `<div style="max-width:420px;padding:32px;text-align:center"><h1 style="font-weight:600;font-size:20px">${title}</h1><p style="color:#A9ADB3">${body}</p></div></body>`;
  try {
    await unsubscribeFromToken(String(req.query.token || req.body?.token || ''));
    res.status(200).type('html').send(page('You are unsubscribed', 'You will no longer receive promotional emails from WinterWear. Order and security messages are not affected.'));
  } catch {
    res.status(400).type('html').send(page('Link not valid', 'This unsubscribe link is invalid or has expired. You can change your email settings from your WinterWear account.'));
  }
};
