import AuditLog from '../models/AuditLog.js';
import { createNotification } from './notifications/notificationService.js';

const LEGACY_LINKS = {
  rider_application: '/admin/staff',
  rider_approved: '/rider',
  rider_rejected: '/rider',
  rider_assigned: '/rider',
};

/**
 * Writes an audit record. Several older call sites use a different field naming
 * (userId / userEmail / role / resource / resourceId) and were silently failing AuditLog validation,
 * so both shapes are accepted here.
 */
export const logAuditEvent = async ({
  actorId, userId,
  actorEmail, userEmail,
  actorRole, role,
  action,
  targetModel, resource,
  targetId, resourceId,
  details = {},
  ipAddress = '',
  userAgent = '',
}) => {
  try {
    return await AuditLog.create({
      actor: actorId || userId,
      actorEmail: actorEmail || userEmail,
      actorRole: actorRole || role || 'system',
      action,
      targetModel: targetModel || resource || 'Unknown',
      targetId: targetId != null ? String(targetId) : resourceId != null ? String(resourceId) : undefined,
      details,
      ipAddress,
      userAgent,
    });
  } catch (err) {
    console.error('[Audit Log Error]', err.message);
  }
};

/** Back-compat wrapper: legacy callers keep working but now go through the unified notification pipeline. */
export const sendNotification = async ({
  recipientId, title, message, type, referenceId = null, referenceModel = null, actionUrl, eventId,
}) => {
  try {
    const r = await createNotification({
      recipient: recipientId, type, title, message,
      actionUrl: actionUrl || LEGACY_LINKS[type] || '',
      eventId, referenceId: referenceId || undefined, referenceModel: referenceModel || undefined,
    });
    return r.notification || null;
  } catch (err) {
    console.error('[Notification Error]', err.message);
  }
};
