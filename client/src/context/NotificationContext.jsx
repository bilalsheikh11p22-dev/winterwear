import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { notificationApi } from '../services/api';
import { acquireSocket, releaseSocket } from '../services/socket';
import { apiMessage } from '../utils/notifications';

const NotificationContext = createContext(null);
const RECENT = 20;
const POLL_MS = 60000;

export const NotificationProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const userId = user?._id || user?.id || null;

  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);

  const newListeners = useRef(new Set());
  const eventListeners = useRef(new Set());
  const alive = useRef(true);

  const emit = (type, payload) => eventListeners.current.forEach((fn) => fn({ type, payload }));

  const refresh = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const res = await notificationApi.list({ limit: RECENT, page: 1 });
      if (!alive.current) return;
      setItems(res.data.data.items);
      setUnreadCount(res.data.data.unreadCount);
      setError('');
    } catch (err) {
      if (alive.current) setError(apiMessage(err, 'Could not load notifications.'));
    } finally {
      if (alive.current && !silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);

  // Connect when signed in, tear down (and clear all state) on sign-out or account switch.
  useEffect(() => {
    if (!isAuthenticated || !userId) {
      setItems([]); setUnreadCount(0); setError(''); setConnected(false);
      return undefined;
    }
    refresh();

    const socket = acquireSocket();
    const onConnect = () => { setConnected(true); refresh({ silent: true }); }; // reconnect → resync from the API
    const onDisconnect = () => setConnected(false);
    const onCreated = (n) => {
      setItems((prev) => (prev.some((p) => p._id === n._id) ? prev : [n, ...prev].slice(0, RECENT)));
      newListeners.current.forEach((fn) => fn(n));
      emit('created', n);
    };
    const onRead = ({ id }) => { setItems((p) => p.map((n) => (n._id === id ? { ...n, isRead: true } : n))); emit('read', { id }); };
    const onReadAll = () => { setItems((p) => p.map((n) => ({ ...n, isRead: true }))); emit('read-all', {}); };
    const onDismissed = ({ id }) => { setItems((p) => p.filter((n) => n._id !== id)); emit('dismissed', { id }); };
    const onCount = ({ unreadCount: c }) => setUnreadCount(c);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('notification:created', onCreated);
    socket.on('notification:read', onRead);
    socket.on('notification:read-all', onReadAll);
    socket.on('notification:dismissed', onDismissed);
    socket.on('notification:unread-count', onCount);
    if (socket.connected) setConnected(true);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('notification:created', onCreated);
      socket.off('notification:read', onRead);
      socket.off('notification:read-all', onReadAll);
      socket.off('notification:dismissed', onDismissed);
      socket.off('notification:unread-count', onCount);
      releaseSocket();
    };
  }, [isAuthenticated, userId, refresh]);

  // Safety net while the socket is down (or blocked by a proxy): poll gently, only when the tab is visible.
  useEffect(() => {
    if (!isAuthenticated || connected) return undefined;
    const t = setInterval(() => { if (document.visibilityState === 'visible') refresh({ silent: true }); }, POLL_MS);
    return () => clearInterval(t);
  }, [isAuthenticated, connected, refresh]);

  // Returning to the tab resyncs counts that may have changed on another device.
  useEffect(() => {
    if (!isAuthenticated) return undefined;
    const onVisible = () => { if (document.visibilityState === 'visible') refresh({ silent: true }); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [isAuthenticated, refresh]);

  // ── Explicit user actions. Opening the dropdown never calls any of these. ──
  const markRead = useCallback(async (id) => {
    const target = items.find((n) => n._id === id);
    if (target && !target.isRead) {
      setItems((p) => p.map((n) => (n._id === id ? { ...n, isRead: true } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    try {
      const res = await notificationApi.markRead(id);
      setUnreadCount(res.data.data.unreadCount);
    } catch (err) {
      refresh({ silent: true }); // roll back to server truth
      throw err;
    }
  }, [items, refresh]);

  const markAllRead = useCallback(async (filter) => {
    try {
      const res = await notificationApi.markAllRead(filter);
      setUnreadCount(res.data.data.unreadCount);
      await refresh({ silent: true });
      emit('read-all', {});
    } catch (err) {
      refresh({ silent: true });
      throw err;
    }
  }, [refresh]);

  const dismiss = useCallback(async (id) => {
    setItems((p) => p.filter((n) => n._id !== id));
    try {
      const res = await notificationApi.dismiss(id);
      setUnreadCount(res.data.data.unreadCount);
      emit('dismissed', { id });
    } catch (err) {
      refresh({ silent: true });
      throw err;
    }
  }, [refresh]);

  /** User opened a notification's action: records the click and marks it read. */
  const openNotification = useCallback(async (n) => {
    if (!n.isRead) {
      setItems((p) => p.map((x) => (x._id === n._id ? { ...x, isRead: true } : x)));
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    try {
      const res = await notificationApi.click(n._id);
      setUnreadCount(res.data.data.unreadCount);
    } catch {
      /* navigation should never be blocked by tracking */
    }
  }, []);

  const subscribeNew = useCallback((fn) => {
    newListeners.current.add(fn);
    return () => newListeners.current.delete(fn);
  }, []);
  const subscribeEvents = useCallback((fn) => {
    eventListeners.current.add(fn);
    return () => eventListeners.current.delete(fn);
  }, []);

  const value = useMemo(() => ({
    items, unreadCount, loading, error, connected,
    refresh, markRead, markAllRead, dismiss, openNotification, subscribeNew, subscribeEvents,
  }), [items, unreadCount, loading, error, connected, refresh, markRead, markAllRead, dismiss, openNotification, subscribeNew, subscribeEvents]);

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};

export const useNotificationContext = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotificationContext must be used inside <NotificationProvider>');
  return ctx;
};
