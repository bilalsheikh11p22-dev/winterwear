import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { validate } from '../../middleware/validate.js';
import { apiLimiter } from '../../middleware/rateLimiter.js';
import {
  listNotificationsSchema, notificationIdSchema, markAllSchema, updatePreferencesSchema,
} from '../../validators/notificationValidators.js';
import {
  getMyNotifications, getUnreadCount, markNotificationRead, markAllNotificationsRead, dismissNotification,
  trackNotificationClick, getNotificationPreferences, patchNotificationPreferences, unsubscribeMarketing,
} from '../../controllers/notificationController.js';

const router = Router();

// Public, signed-token unsubscribe (linked from email footers; supports RFC 8058 one-click POST)
router.get('/unsubscribe', apiLimiter, unsubscribeMarketing);
router.post('/unsubscribe', apiLimiter, unsubscribeMarketing);

router.use(authenticate);

router.get('/', apiLimiter, validate(listNotificationsSchema), getMyNotifications);
router.get('/unread-count', apiLimiter, getUnreadCount);
router.get('/preferences', apiLimiter, getNotificationPreferences);
router.patch('/preferences', apiLimiter, validate(updatePreferencesSchema), patchNotificationPreferences);
router.patch('/read-all', apiLimiter, validate(markAllSchema), markAllNotificationsRead);
router.patch('/:id/read', apiLimiter, validate(notificationIdSchema), markNotificationRead);
router.post('/:id/click', apiLimiter, validate(notificationIdSchema), trackNotificationClick);
router.delete('/:id', apiLimiter, validate(notificationIdSchema), dismissNotification);

export default router;
