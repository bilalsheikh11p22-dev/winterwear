import { io } from 'socket.io-client';
import { getApiOrigin, notificationApi } from './api';

/**
 * One shared Socket.IO connection for the whole app (reference counted, so mounting several consumers
 * never opens several sockets or stacks listeners). The token is read at (re)connect time, so a refreshed
 * access token is used automatically. MongoDB (via the REST API) stays the source of truth — the socket only
 * delivers hints and pushes.
 */
let socket = null;
let refs = 0;
let recovering = false;

const recoverAuth = async () => {
  if (recovering || !socket) return;
  recovering = true;
  try {
    // Any authenticated call triggers the axios refresh-token interceptor when the access token has expired.
    await notificationApi.unreadCount();
    if (socket && !socket.connected) socket.connect();
  } catch {
    // Refresh failed → the API client signs the user out; leave the socket closed.
  } finally {
    setTimeout(() => { recovering = false; }, 2000);
  }
};

// Serverless hosts (e.g. Vercel) cannot keep a WebSocket open. Set VITE_DISABLE_SOCKET=true there and the
// app uses its built-in gentle polling instead (notifications still arrive, just every few seconds).
const noopSocket = { connected: false, active: false, on() {}, off() {}, connect() {}, disconnect() {}, removeAllListeners() {} };

export const acquireSocket = () => {
  if (import.meta.env.VITE_DISABLE_SOCKET === 'true') return noopSocket;
  refs += 1;
  if (!socket) {
    socket = io(getApiOrigin(), {
      path: '/socket.io',
      autoConnect: false,
      transports: ['websocket', 'polling'],
      reconnectionDelayMax: 15000,
      auth: (cb) => cb({ token: localStorage.getItem('ww_access_token') || '' }),
    });
    // A handshake refused by the server's auth middleware is not retried by socket.io itself.
    socket.on('connect_error', (err) => {
      if (['TOKEN_EXPIRED', 'UNAUTHORIZED'].includes(err?.message)) recoverAuth();
    });
    socket.on('auth:expired', recoverAuth);
  }
  if (!socket.connected && !socket.active) socket.connect();
  return socket;
};

export const releaseSocket = () => {
  if (import.meta.env.VITE_DISABLE_SOCKET === 'true') return;
  refs = Math.max(0, refs - 1);
  if (refs === 0 && socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
};
