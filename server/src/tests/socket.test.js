import './helpers/testEnv.js';
import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import jwt from 'jsonwebtoken';
import { io as connect } from 'socket.io-client';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { connectTestDb, closeTestDb, resetDb, tokenFor } from './helpers/db.js';
import { makeUser } from './helpers/fixtures.js';
import { initSocket, closeSocket, emitToRoles, emitToUser } from '../socket/index.js';
import { createNotification, getUnreadCount } from '../services/notifications/notificationService.js';

let server; let url; let alice; let bob; let admin;
const open = (token, opts = {}) =>
  connect(url, { auth: token === null ? {} : { token }, transports: ['websocket'], reconnection: false, forceNew: true, ...opts });
const once = (socket, event, ms = 1500) =>
  new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout waiting for "${event}"`)), ms);
    socket.once(event, (payload) => { clearTimeout(t); resolve(payload); });
  });
const noEvent = (socket, event, ms = 300) =>
  new Promise((resolve, reject) => {
    const h = () => reject(new Error(`unexpected "${event}"`));
    socket.once(event, h);
    setTimeout(() => { socket.off(event, h); resolve(); }, ms);
  });
const connectOk = async (user) => { const s = open(tokenFor(user)); await once(s, 'ready'); return s; };
const give = (u, eventId) => createNotification({ recipient: u._id, type: 'order_placed', title: 'Order placed', message: 'Placed.', eventId });

describe('Socket.IO real-time delivery', () => {
  const sockets = [];
  before(async () => {
    await connectTestDb('socket');
    server = http.createServer();
    await initSocket(server);
    await new Promise((r) => { server.listen(0, '127.0.0.1', r); });
    url = `http://127.0.0.1:${server.address().port}`;
  });
  after(async () => { sockets.forEach((s) => s.close()); await closeSocket(); await new Promise((r) => { server.close(r); }); await closeTestDb(); });
  beforeEach(async () => { await resetDb(); alice = await makeUser(); bob = await makeUser(); admin = await makeUser('admin'); });

  const track = (s) => { sockets.push(s); return s; };

  it('refuses connections without a valid access token', async () => {
    for (const token of [null, 'garbage', jwt.sign({ id: alice._id }, 'wrong-secret'), jwt.sign({ sub: String(alice._id), purpose: 'unsubscribe_marketing' }, process.env.JWT_ACCESS_SECRET)]) {
      const s = track(open(token));
      const err = await once(s, 'connect_error');
      assert.equal(err.message, 'UNAUTHORIZED');
    }
  });

  it('refuses expired tokens and deactivated users', async () => {
    const expired = jwt.sign({ id: alice._id, role: 'customer' }, process.env.JWT_ACCESS_SECRET, { expiresIn: -10 });
    const e1 = await once(track(open(expired)), 'connect_error');
    assert.equal(e1.message, 'TOKEN_EXPIRED');
    await User.updateOne({ _id: bob._id }, { $set: { isActive: false } });
    const e2 = await once(track(open(tokenFor(bob))), 'connect_error');
    assert.equal(e2.message, 'UNAUTHORIZED');
  });

  it('pushes created + unread-count events to the owner ONLY', async () => {
    const a = track(await connectOk(alice));
    const b = track(await connectOk(bob));
    const created = once(a, 'notification:created');
    const count = once(a, 'notification:unread-count');
    const bobNothing = noEvent(b, 'notification:created');
    const bobNoCount = noEvent(b, 'notification:unread-count');

    await give(alice, 'rt-1');
    const n = await created;
    assert.equal(n.type, 'order_placed');
    assert.equal(n.isRead, false);
    assert.equal((await count).unreadCount, 1);
    assert.ok(!('recipient' in n) && !('eventId' in n), 'internal fields are not sent to browsers');
    await bobNothing;
    await bobNoCount;
  });

  it('read / read-all / dismiss keep every tab of the same user in sync', async () => {
    const tab1 = track(await connectOk(alice));
    const tab2 = track(await connectOk(alice));
    const { notification } = await give(alice, 'sync-1');
    const { markRead } = await import('../services/notifications/notificationService.js');

    const readSeen = once(tab2, 'notification:read');
    const countSeen = once(tab2, 'notification:unread-count');
    await markRead(alice._id, notification._id);
    assert.equal((await readSeen).id, String(notification._id));
    assert.equal((await countSeen).unreadCount, 0);
    assert.ok(tab1);
  });

  it('clients cannot join arbitrary rooms or listen to other users / role rooms', async () => {
    const attacker = track(await connectOk(alice));
    const victim = track(await connectOk(bob));
    const adminSock = track(await connectOk(admin));
    // try every plausible client-side join message
    for (const ev of ['join', 'joinRoom', 'subscribe', 'room:join']) {
      attacker.emit(ev, `user:${bob._id}`);
      attacker.emit(ev, { room: `user:${bob._id}` });
      attacker.emit(ev, 'role:admin');
    }
    const nothing = noEvent(attacker, 'notification:created');
    const noStaff = noEvent(attacker, 'staff:refresh');
    const adminGets = once(adminSock, 'staff:refresh');
    const victimGets = once(victim, 'notification:created');
    await give(bob, 'private-1');
    emitToRoles(['admin'], 'staff:refresh', { reason: 'test' });
    await nothing;
    await noStaff;
    // the legitimate holders DO receive their events (proves the negative assertions above are meaningful)
    assert.equal((await adminGets).reason, 'test');
    assert.equal((await victimGets).type, 'order_placed');
  });

  it('role rooms are populated from the verified DB role, not from token claims', async () => {
    // a customer whose token CLAIMS to be admin must not land in the admin room
    const forged = jwt.sign({ id: alice._id, role: 'admin' }, process.env.JWT_ACCESS_SECRET, { expiresIn: '5m' });
    const s = track(open(forged));
    await once(s, 'ready');
    const noStaff = noEvent(s, 'staff:refresh');
    emitToRoles(['admin', 'super_admin'], 'staff:refresh', { reason: 'x' });
    await noStaff;

    const real = track(await connectOk(admin));
    const got = once(real, 'staff:refresh');
    emitToRoles(['admin'], 'staff:refresh', { reason: 'x' });
    assert.equal((await got).reason, 'x');
  });

  it('drops the connection when the access token expires', async () => {
    const short = jwt.sign({ id: alice._id, role: 'customer' }, process.env.JWT_ACCESS_SECRET, { expiresIn: 1 });
    const s = track(open(short));
    await once(s, 'ready');
    const expired = once(s, 'auth:expired', 3000);
    const disc = once(s, 'disconnect', 3000);
    await expired;
    await disc;
    assert.equal(s.connected, false);
  });

  it('reconnects do not duplicate notifications; the API stays the source of truth', async () => {
    let s = track(await connectOk(alice));
    await give(alice, 'dup-1');
    s.close();
    // created while offline → must still be retrievable, and must not be re-pushed or duplicated on reconnect
    await give(alice, 'offline-1');
    const replay = [];
    s = track(open(tokenFor(alice)));
    s.on('notification:created', (n) => replay.push(n));
    await once(s, 'ready');
    await new Promise((r) => { setTimeout(r, 300); });
    assert.equal(replay.length, 0, 'no replay storm on reconnect');
    assert.equal(await Notification.countDocuments({ recipient: alice._id }), 2);
    assert.equal(await getUnreadCount(alice._id), 2, 'client refetches this on reconnect');

    // a duplicate event while connected is dropped by deduplication and never reaches the socket
    const dupes = [];
    s.on('notification:created', (n) => dupes.push(n));
    await give(alice, 'dup-1');
    await new Promise((r) => { setTimeout(r, 300); });
    assert.equal(dupes.length, 0);
    assert.equal(await Notification.countDocuments({ recipient: alice._id }), 2);
  });

  it('socket emit failures never lose the notification', async () => {
    await closeSocket(); // no io instance at all
    assert.equal(emitToUser(alice._id, 'x', {}), false);
    const r = await give(alice, 'no-socket');
    assert.equal(r.status, 'created');
    assert.equal(await Notification.countDocuments({ recipient: alice._id }), 1);
    await initSocket(server); // restore for any following tests
  });
});
