import { useEffect, useRef } from 'react';
import { useNotificationContext } from '../context/NotificationContext';

/**
 * Backwards-compatible hook (the rider portal and admin layout already use it).
 * State now comes from the shared NotificationProvider (Socket.IO + REST) instead of its own 20 s poll.
 * `onNew(notification)` fires for notifications that arrive in real time.
 */
export const useNotifications = ({ onNew } = {}) => {
  const ctx = useNotificationContext();
  const ref = useRef(onNew);
  useEffect(() => { ref.current = onNew; }, [onNew]);

  useEffect(() => ctx.subscribeNew((n) => ref.current?.(n)), [ctx.subscribeNew]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    notifications: ctx.items,
    unreadCount: ctx.unreadCount,
    loading: ctx.loading,
    error: ctx.error,
    connected: ctx.connected,
    refresh: ctx.refresh,
    markRead: ctx.markRead,
    markAllRead: ctx.markAllRead,
    dismiss: ctx.dismiss,
    openNotification: ctx.openNotification,
  };
};

export default useNotifications;
