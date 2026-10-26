import './helpers/testEnv.js';
import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../app.js';
import Notification from '../models/Notification.js';
import { connectTestDb, closeTestDb, resetDb, authHeader } from './helpers/db.js';
import { makeUser } from './helpers/fixtures.js';
import { createNotification } from '../services/notifications/notificationService.js';
import { isSafeInternalPath } from '../services/notifications/catalog.js';

let alice;
let bob;

const give = (user, over = {}) =>
  createNotification({ recipient: user._id, type: 'order_placed', title: 'Order placed', message: 'Your order has been placed.', ...over });

describe('Notification API', () => {
  before(() => connectTestDb('notifications_api'));
  after(closeTestDb);
  beforeEach(async () => {
    await resetDb();
    alice = await makeUser();
    bob = await makeUser();
  });

  it('requires authentication on every notification endpoint', async () => {
    for (const [method, url] of [['get', '/api/v1/notifications'], ['get', '/api/v1/notifications/unread-count'], ['patch', '/api/v1/notifications/read-all'], ['get', '/api/v1/notifications/preferences']]) {
      const res = await request(app)[method](url);
      assert.equal(res.status, 401, `${method} ${url}`);
    }
  });

  it("a user cannot read, mark, click or dismiss someone else's notification (404, not 403)", async () => {
    const { notification } = await give(alice);
    for (const [method, suffix] of [['patch', '/read'], ['post', '/click'], ['delete', '']]) {
      const res = await request(app)[method](`/api/v1/notifications/${notification._id}${suffix}`).set(authHeader(bob));
      assert.equal(res.status, 404, `${method}${suffix}`);
    }
    const stored = await Notification.findById(notification._id);
    assert.equal(stored.isRead, false);
    assert.equal(stored.dismissedAt, undefined);

    const list = await request(app).get('/api/v1/notifications').set(authHeader(bob));
    assert.equal(list.body.data.items.length, 0);
  });

  it('listing notifications never marks them as read', async () => {
    await give(alice, { eventId: 'e1' });
    await request(app).get('/api/v1/notifications').set(authHeader(alice)).expect(200);
    await request(app).get('/api/v1/notifications').set(authHeader(alice)).expect(200);
    const count = await request(app).get('/api/v1/notifications/unread-count').set(authHeader(alice));
    assert.equal(count.body.data.unreadCount, 1);
  });

  it('read status persists in MongoDB and unread count tracks it', async () => {
    const a = (await give(alice, { eventId: 'a' })).notification;
    await give(alice, { eventId: 'b' });
    await give(alice, { eventId: 'c' });

    let c = await request(app).get('/api/v1/notifications/unread-count').set(authHeader(alice));
    assert.equal(c.body.data.unreadCount, 3);

    const r = await request(app).patch(`/api/v1/notifications/${a._id}/read`).set(authHeader(alice));
    assert.equal(r.status, 200);
    assert.equal(r.body.data.unreadCount, 2);

    // "refresh the page": fresh request, state comes from the database
    const list = await request(app).get('/api/v1/notifications').set(authHeader(alice));
    assert.equal(list.body.data.unreadCount, 2);
    assert.equal(list.body.data.items.find((i) => i._id === String(a._id)).isRead, true);
    const stored = await Notification.findById(a._id);
    assert.ok(stored.readAt instanceof Date);

    const all = await request(app).patch('/api/v1/notifications/read-all').set(authHeader(alice)).send({});
    assert.equal(all.body.data.updated, 2);
    c = await request(app).get('/api/v1/notifications/unread-count').set(authHeader(alice));
    assert.equal(c.body.data.unreadCount, 0);
    // Bob is unaffected
    await give(bob, { eventId: 'x' });
    await request(app).patch('/api/v1/notifications/read-all').set(authHeader(alice)).send({});
    assert.equal((await request(app).get('/api/v1/notifications/unread-count').set(authHeader(bob))).body.data.unreadCount, 1);
  });

  it('paginates, filters by category/unread and rejects bad parameters', async () => {
    for (let i = 0; i < 7; i += 1) await give(alice, { eventId: `o${i}` });
    await give(alice, { type: 'password_changed', title: 'Password changed', message: 'Changed.', eventId: 'p1' });
    await give(alice, { type: 'delivered', title: 'Delivered', message: 'Delivered.', eventId: 'd1' });
    const first = (await give(alice, { type: 'back_in_stock', title: 'Back', message: 'Back in stock', eventId: 'b1', bypassFrequency: true })).notification;
    await request(app).patch(`/api/v1/notifications/${first._id}/read`).set(authHeader(alice));

    const p1 = await request(app).get('/api/v1/notifications?limit=4&page=1').set(authHeader(alice));
    assert.equal(p1.body.data.items.length, 4);
    assert.equal(p1.body.meta.total, 10);
    assert.equal(p1.body.meta.pages, 3);
    const p3 = await request(app).get('/api/v1/notifications?limit=4&page=3').set(authHeader(alice));
    assert.equal(p3.body.data.items.length, 2);

    const orders = await request(app).get('/api/v1/notifications?filter=orders').set(authHeader(alice));
    assert.equal(orders.body.meta.total, 7);
    const account = await request(app).get('/api/v1/notifications?filter=account').set(authHeader(alice));
    assert.equal(account.body.meta.total, 1);
    const delivery = await request(app).get('/api/v1/notifications?filter=delivery').set(authHeader(alice));
    assert.equal(delivery.body.meta.total, 1);
    const products = await request(app).get('/api/v1/notifications?filter=products').set(authHeader(alice));
    assert.equal(products.body.meta.total, 1);
    const unread = await request(app).get('/api/v1/notifications?filter=unread').set(authHeader(alice));
    assert.equal(unread.body.meta.total, 9);

    const bad = await request(app).get('/api/v1/notifications?filter=hacker&limit=9999').set(authHeader(alice));
    assert.equal(bad.status, 400);
    assert.equal(bad.body.code, 'VALIDATION_ERROR');
  });

  it('dismiss is a soft delete: hidden from the list and count, but the record survives for audit', async () => {
    const n = (await give(alice, { eventId: 'k' })).notification;
    const res = await request(app).delete(`/api/v1/notifications/${n._id}`).set(authHeader(alice));
    assert.equal(res.status, 200);
    assert.equal(res.body.data.unreadCount, 0);
    const list = await request(app).get('/api/v1/notifications').set(authHeader(alice));
    assert.equal(list.body.data.items.length, 0);
    assert.ok(await Notification.findById(n._id), 'order/security history must not be hard-deleted by users');
  });

  it('click tracking records a real click and marks the notification read', async () => {
    const n = (await give(alice, { eventId: 'click' })).notification;
    await request(app).post(`/api/v1/notifications/${n._id}/click`).set(authHeader(alice)).expect(200);
    const stored = await Notification.findById(n._id);
    assert.ok(stored.clickedAt);
    assert.equal(stored.isRead, true);
  });

  it('transactional types never get a TTL; marketing types do', async () => {
    const order = (await give(alice, { eventId: 't1' })).notification;
    const security = (await give(alice, { type: 'password_changed', title: 'x', message: 'y', eventId: 't2' })).notification;
    const promo = (await give(alice, { type: 'product_published', title: 'x', message: 'y', eventId: 't3' })).notification;
    assert.equal(order.expiresAt, undefined);
    assert.equal(security.expiresAt, undefined);
    assert.ok(promo.expiresAt > new Date());
  });

  it('rejects unsafe action URLs and strips sensitive data keys', async () => {
    for (const bad of ['https://evil.test', '//evil.test', 'javascript:alert(1)', '/ok\\evil']) {
      assert.equal(isSafeInternalPath(bad), false, bad);
    }
    assert.equal(isSafeInternalPath('/my-orders/123'), true);
    await assert.rejects(give(alice, { actionUrl: 'https://evil.test', eventId: 'u1' }), /safe internal path/);

    const { notification } = await give(alice, {
      eventId: 'sens', data: { orderNumber: 'WW-1', password: 'hunter2', cardNumber: '4242424242424242', token: 'abc', address: '1 Secret St' },
    });
    assert.deepEqual(notification.data, { orderNumber: 'WW-1' });
  });

  it('preferences: defaults, partial update, validation, and marketing email is opt-in', async () => {
    const get = await request(app).get('/api/v1/notifications/preferences').set(authHeader(alice));
    assert.equal(get.body.data.preferences.marketingEmails, false);
    assert.equal(get.body.data.preferences.newArrivals.inApp, true);

    const patch = await request(app).patch('/api/v1/notifications/preferences').set(authHeader(alice))
      .send({ newArrivals: { inApp: false }, marketingEmails: true });
    assert.equal(patch.status, 200);
    assert.equal(patch.body.data.preferences.newArrivals.inApp, false);
    assert.equal(patch.body.data.preferences.marketingEmails, true);
    assert.equal(patch.body.data.preferences.discounts.inApp, true, 'untouched fields keep their value');

    const bad = await request(app).patch('/api/v1/notifications/preferences').set(authHeader(alice)).send({ isAdmin: true });
    assert.equal(bad.status, 400);
    const empty = await request(app).patch('/api/v1/notifications/preferences').set(authHeader(alice)).send({});
    assert.equal(empty.status, 400);
  });

  it('respects in-app preferences and the marketing frequency cap, but never blocks transactional messages', async () => {
    await request(app).patch('/api/v1/notifications/preferences').set(authHeader(alice)).send({ newArrivals: { inApp: false } });
    const skipped = await give(alice, { type: 'product_published', title: 'x', message: 'y', eventId: 'm1' });
    assert.equal(skipped.status, 'skipped_preference');

    const tx = await give(alice, { type: 'password_changed', title: 'x', message: 'y', eventId: 'sec1' });
    assert.equal(tx.status, 'created');

    // frequency cap (default 3 / 24h) applies to marketing only
    const results = [];
    for (let i = 0; i < 5; i += 1) results.push((await give(bob, { type: 'coupon_announced', title: 'c', message: 'm', eventId: `cap${i}` })).status);
    assert.deepEqual(results, ['created', 'created', 'created', 'skipped_frequency', 'skipped_frequency']);
    assert.equal((await give(bob, { eventId: 'still-ok' })).status, 'created');
  });

  it('deduplicates by (recipient, eventId)', async () => {
    assert.equal((await give(alice, { eventId: 'same' })).status, 'created');
    assert.equal((await give(alice, { eventId: 'same' })).status, 'duplicate');
    assert.equal((await give(bob, { eventId: 'same' })).status, 'created', 'a different recipient is not a duplicate');
    assert.equal(await Notification.countDocuments({ eventId: 'same' }), 2);
  });
});
