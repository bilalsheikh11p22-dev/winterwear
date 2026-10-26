import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { ENV } from '../config/env.js';

/**
 * Socket.IO delivery layer. MongoDB is the source of truth; sockets are only a fast path.
 *
 * Security model:
 *  - The handshake must carry a valid ACCESS token (auth.token). The user is re-loaded from MongoDB,
 *    so deactivated users are refused.
 *  - Rooms are decided SERVER-SIDE from the verified user. There is no client-callable "join" event, so a
 *    client cannot pick a user id or a role room.
 *  - The socket is disconnected when the access token expires; the client refreshes and reconnects.
 */
const STAFF_ROLES = new Set([
  'super_admin', 'admin', 'inventory_manager', 'warehouse_staff', 'rider',
  'fulfillment_staff', 'customer_support', 'finance_staff', 'marketing_manager',
]);

let io = null;

export const getIO = () => io;

export const userRoom = (userId) => `user:${String(userId)}`;
export const roleRoom = (role) => `role:${role}`;

const parseOrigins = () => {
  const raw = process.env.SOCKET_CORS_ORIGIN || process.env.CORS_ORIGIN || '';
  const list = raw.split(',').map((s) => s.trim()).filter(Boolean);
  const defaults = [ENV.CLIENT_URL, 'http://localhost:5173', 'http://localhost:3000'];
  return [...new Set([...list, ...defaults])];
};

export const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token || typeof token !== 'string') return next(new Error('UNAUTHORIZED'));
    const decoded = jwt.verify(token, ENV.JWT.ACCESS_SECRET);
    const user = await User.findById(decoded.id).select('role isActive');
    if (!user || !user.isActive) return next(new Error('UNAUTHORIZED'));
    socket.data.userId = String(user._id);
    socket.data.role = user.role;
    socket.data.exp = decoded.exp;
    return next();
  } catch (err) {
    return next(new Error(err.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'UNAUTHORIZED'));
  }
};

export const initSocket = async (httpServer) => {
  if (io) return io;

  io = new Server(httpServer, {
    path: '/socket.io',
    cors: {
      origin: (origin, cb) => {
        if (!origin) return cb(null, true);
        if (parseOrigins().includes(origin) || ENV.NODE_ENV !== 'production') return cb(null, true);
        return cb(new Error('Blocked by CORS policy'));
      },
      credentials: true,
    },
  });

  // Multi-instance deployments need a shared adapter or events only reach sockets on the same process.
  if (process.env.REDIS_URL) {
    try {
      const [{ createAdapter }, { createClient }] = await Promise.all([
        import('@socket.io/redis-adapter'),
        import('redis'),
      ]);
      const pub = createClient({ url: process.env.REDIS_URL });
      const sub = pub.duplicate();
      await Promise.all([pub.connect(), sub.connect()]);
      io.adapter(createAdapter(pub, sub));
      console.log('[Socket.IO] Redis adapter enabled');
    } catch (err) {
      console.error(
        `[Socket.IO] REDIS_URL is set but the adapter could not start (${err.message}). ` +
          'Install "@socket.io/redis-adapter" and "redis". Falling back to in-memory (single instance only).'
      );
    }
  }

  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    const { userId, role, exp } = socket.data;
    socket.join(userRoom(userId));
    if (STAFF_ROLES.has(role)) socket.join(roleRoom(role));

    // Respect token expiry: tell the client, then drop the connection.
    const ms = Math.max(0, exp * 1000 - Date.now());
    const timer = setTimeout(() => {
      socket.emit('auth:expired');
      socket.disconnect(true);
    }, ms);
    timer.unref?.();
    socket.on('disconnect', () => clearTimeout(timer));

    socket.emit('ready', { userId });
  });

  return io;
};

export const emitToUser = (userId, event, payload) => {
  if (!io || !userId) return false;
  io.to(userRoom(userId)).emit(event, payload);
  return true;
};

export const emitToRoles = (roles, event, payload) => {
  if (!io) return false;
  roles.forEach((r) => io.to(roleRoom(r)).emit(event, payload));
  return true;
};

export const closeSocket = async () => {
  if (!io) return;
  const current = io;
  io = null;
  await new Promise((resolve) => current.close(resolve));
};
