import './helpers/testEnv.js';
import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../app.js';
import Coupon from '../models/Coupon.js';
import Notification from '../models/Notification.js';
import NotificationCampaign from '../models/NotificationCampaign.js';
import NotificationDeliveryAttempt from '../models/NotificationDeliveryAttempt.js';
import OutboxEvent from '../models/OutboxEvent.js';
import AuditLog from '../models/AuditLog.js';
import { connectTestDb, closeTestDb, resetDb, authHeader } from './helpers/db.js';
import { makeUser, makeProduct } from './helpers/fixtures.js';
import { drainOutbox } from '../services/notifications/outbox.js';
import { tickCampaigns } from '../services/notifications/campaignService.js';
import { setEmailProvider } from '../services/notifications/emailProvider.js';
import { updatePreferences } from '../services/notifications/preferenceService.js';
import { sweepExpiringCoupons } from '../jobs/worker.js';
import '../services/notifications/handlers.js';

const day = 86400000;
let admin; let marketing; let support; let alice; let bob; let coupon;
const api = (method, url, user, body) => request(app)[method](url).set(user ? authHeader(user) : {}).send(body);
const mine = (u, type) => Notification.find({ recipient: u._id, ...(type ? { type } : {}) });

describe('Campaign manager & admin notification dashboard', () => {
  before(() => connectTestDb('campaigns'));
  after(async () => { setEmailProvider(null); await closeTestDb(); });
  beforeEach(async () => {
    await resetDb();
    setEmailProvider(null);
    admin = await makeUser('admin');
    marketing = await makeUser('marketing_manager');
    support = await makeUser('customer_support');
    alice = await makeUser();
    bob = await makeUser();
    coupon = await Coupon.create({ code: 'WELCOME15', name: 'Winter Special', discountType: 'percentage', discountValue: 15, validFrom: new Date(Date.now() - day), validUntil: new Date(Date.now() + 5 * day), minOrderAmount: 3000 });
  });

  const createCouponCampaign = (over = {}, user = marketing) =>
    api('post', '/api/v1/admin/notifications/campaigns', user, { name: 'Welcome push', kind: 'coupon', coupon: String(coupon._id), ...over });

  it('RBAC: only marketing/admin manage campaigns; per-customer data is admin-only; everyone else is refused', async () => {
    assert.equal((await createCouponCampaign({}, null)).status, 401);
    for (const u of [alice, support]) {
      assert.equal((await createCouponCampaign({}, u)).status, 403);
      assert.equal((await api('get', '/api/v1/admin/notifications/campaigns', u)).status, 403);
      assert.equal((await api('get', '/api/v1/admin/notifications/metrics', u)).status, 403);
      assert.equal((await api('get', '/api/v1/admin/notifications/activity', u)).status, 403);
    }
    assert.equal((await createCouponCampaign({}, marketing)).status, 201);
    assert.equal((await api('get', '/api/v1/admin/notifications/metrics', marketing)).status, 200);
    assert.equal((await api('get', '/api/v1/admin/notifications/activity', marketing)).status, 403, 'marketing sees aggregates, not individual customers');
    assert.equal((await api('get', '/api/v1/admin/notifications/activity', admin)).status, 200);
    assert.equal(await NotificationCampaign.countDocuments(), 1, 'refused requests created nothing');
  });

  it('coupon campaign: content is generated from the real coupon (code, discount, expiry) and delivered once', async () => {
    const created = await createCouponCampaign();
    const id = created.body.data.campaign._id;
    assert.equal(created.body.data.campaign.status, 'draft');

    const preview = await api('get', `/api/v1/admin/notifications/campaigns/${id}/preview`, marketing);
    assert.match(preview.body.data.notification.message, /WELCOME15/);
    assert.match(preview.body.data.notification.message, /15% off/);
    assert.match(preview.body.data.email.html, /WELCOME15/);
    assert.equal(await Notification.countDocuments(), 0, 'preview sends nothing');

    const pub = await api('post', `/api/v1/admin/notifications/campaigns/${id}/publish`, marketing);
    assert.equal(pub.status, 200);
    await new Promise((r) => { setTimeout(r, 400); }); // controller kicks the fan-out in the background
    await drainOutbox();

    for (const u of [alice, bob]) {
      const [n] = await mine(u, 'coupon_announced');
      assert.ok(n);
      assert.equal(n.data.couponCode, 'WELCOME15');
      assert.equal(n.data.couponId, String(coupon._id));
      assert.match(n.message, new RegExp(coupon.validUntil.toDateString()));
      assert.match(n.message, /3,000/, 'minimum order is stated');
    }
    assert.equal((await mine(admin)).length, 0);
    assert.equal((await mine(marketing)).length, 0);

    // publishing again / running again must not duplicate
    assert.equal((await api('post', `/api/v1/admin/notifications/campaigns/${id}/publish`, marketing)).status, 409);
    await tickCampaigns();
    assert.equal(await Notification.countDocuments({ type: 'coupon_announced' }), 2);

    const detail = await api('get', `/api/v1/admin/notifications/campaigns/${id}`, marketing);
    assert.equal(detail.body.data.campaign.status, 'completed');
    assert.equal(detail.body.data.results.created, 2);
    assert.equal(detail.body.data.results.clicked, 0);
    assert.equal((await AuditLog.countDocuments({ action: { $in: ['CAMPAIGN_CREATED', 'CAMPAIGN_PUBLISHED'] } })), 2, 'sensitive actions are audited');
  });

  it('validates campaigns: unsafe URLs, unpublished products, inactive/expired coupons, missing fields', async () => {
    assert.equal((await createCouponCampaign({ actionUrl: 'https://evil.test/phish' })).status, 400);
    assert.equal((await createCouponCampaign({ actionUrl: 'javascript:alert(1)' })).status, 400);
    const draft = await makeProduct({ isPublished: false });
    const r = await api('post', '/api/v1/admin/notifications/campaigns', marketing, { name: 'Test campaign', kind: 'product_announcement', products: [String(draft._id)] });
    assert.equal(r.status, 400);
    assert.match(r.body.message, /published/i);
    assert.equal((await api('post', '/api/v1/admin/notifications/campaigns', marketing, { name: 'Test campaign', kind: 'product_announcement' })).status, 400);
    assert.equal((await api('post', '/api/v1/admin/notifications/campaigns', marketing, { name: 'Test campaign', kind: 'custom', title: 't' })).status, 400);
    assert.equal((await api('post', '/api/v1/admin/notifications/campaigns', marketing, { name: 'Test campaign', kind: 'coupon', coupon: String(coupon._id), isAdmin: true })).status, 400);

    await Coupon.updateOne({ _id: coupon._id }, { $set: { isActive: false } });
    assert.equal((await createCouponCampaign()).status, 400);
    await Coupon.updateOne({ _id: coupon._id }, { $set: { isActive: true, validUntil: new Date(Date.now() - 1000), validFrom: new Date(Date.now() - day) } });
    assert.equal((await createCouponCampaign()).status, 400);
  });

  it('eventKey makes campaign creation idempotent', async () => {
    const a = await createCouponCampaign({ eventKey: 'spring-2026' });
    const b = await createCouponCampaign({ eventKey: 'spring-2026' });
    assert.equal(a.status, 201);
    assert.equal(b.status, 200);
    assert.equal(b.body.data.duplicate, true);
    assert.equal(await NotificationCampaign.countDocuments(), 1);
  });

  it('scheduling: nothing is sent early; it starts when due; pause and cancel stop delivery', async () => {
    const scheduled = await createCouponCampaign({ scheduledAt: new Date(Date.now() + 3600000).toISOString() });
    const id = scheduled.body.data.campaign._id;
    const pub = await api('post', `/api/v1/admin/notifications/campaigns/${id}/publish`, marketing);
    assert.equal(pub.body.data.campaign.status, 'scheduled');
    await tickCampaigns();
    assert.equal(await Notification.countDocuments(), 0, 'not before its time');

    await NotificationCampaign.updateOne({ _id: id }, { $set: { scheduledAt: new Date(Date.now() - 1000) } });
    await tickCampaigns();
    assert.equal(await Notification.countDocuments({ type: 'coupon_announced' }), 2);

    // pause / cancel
    const c2 = await createCouponCampaign({ name: 'second', scheduledAt: new Date(Date.now() + 3600000).toISOString() });
    const id2 = c2.body.data.campaign._id;
    await api('post', `/api/v1/admin/notifications/campaigns/${id2}/publish`, marketing);
    assert.equal((await api('post', `/api/v1/admin/notifications/campaigns/${id2}/pause`, marketing)).body.data.campaign.status, 'paused');
    await NotificationCampaign.updateOne({ _id: id2 }, { $set: { scheduledAt: new Date(Date.now() - 1000) } });
    await tickCampaigns();
    assert.equal(await Notification.countDocuments({ campaign: id2 }), 0, 'paused campaigns do not send');
    assert.equal((await api('post', `/api/v1/admin/notifications/campaigns/${id2}/cancel`, marketing)).body.data.campaign.status, 'cancelled');
    await tickCampaigns();
    assert.equal(await Notification.countDocuments({ campaign: id2 }), 0);
    assert.equal((await api('post', `/api/v1/admin/notifications/campaigns/${id2}/publish`, marketing)).status, 409, 'cancelled is final');
    assert.equal((await api('post', `/api/v1/admin/notifications/campaigns/${id2}/pause`, alice)).status, 403);
  });

  it('audience targeting: specific users get an "exclusive" notification; others get nothing', async () => {
    const r = await createCouponCampaign({ audience: { segment: 'specific_users', userIds: [String(alice._id)] } });
    await api('post', `/api/v1/admin/notifications/campaigns/${r.body.data.campaign._id}/publish`, marketing);
    await new Promise((res) => { setTimeout(res, 400); });
    await tickCampaigns();
    assert.equal((await mine(alice, 'coupon_exclusive')).length, 1);
    assert.equal((await mine(bob)).length, 0);
    assert.equal((await api('post', '/api/v1/admin/notifications/campaigns', marketing, { name: 'Test campaign', kind: 'coupon', coupon: String(coupon._id), audience: { segment: 'specific_users' } })).status, 400);
  });

  it('coupon expiry reminders go only to people who were told about the coupon and have not used it', async () => {
    await Coupon.updateOne({ _id: coupon._id }, { $set: { validUntil: new Date(Date.now() + 20 * 3600000) } });
    const r = await createCouponCampaign();
    await api('post', `/api/v1/admin/notifications/campaigns/${r.body.data.campaign._id}/publish`, marketing);
    await new Promise((res) => { setTimeout(res, 400); });
    await tickCampaigns();
    await drainOutbox();

    // bob already used it
    const CouponRedemption = (await import('../models/CouponRedemption.js')).default;
    const { oid } = await import('./helpers/fixtures.js');
    await CouponRedemption.create({ coupon: coupon._id, couponCode: 'WELCOME15', user: bob._id, order: oid(), slot: 1, status: 'redeemed', discountAmount: 100 });
    // a bystander who never got the announcement
    const stranger = await makeUser();

    await sweepExpiringCoupons();
    await sweepExpiringCoupons(); // idempotent
    await drainOutbox();
    assert.equal((await mine(alice, 'coupon_expiring')).length, 1);
    assert.equal((await mine(bob, 'coupon_expiring')).length, 0);
    assert.equal((await mine(stranger, 'coupon_expiring')).length, 0);
  });

  it('metrics are database-backed and never fabricate opens/clicks/bounces', async () => {
    const r = await createCouponCampaign({ sendEmail: true });
    await updatePreferences(alice._id, { marketingEmails: true, discounts: { email: true } });
    setEmailProvider({ name: 'mock', async send() { return { messageId: '<1>' }; } });
    await api('post', `/api/v1/admin/notifications/campaigns/${r.body.data.campaign._id}/publish`, marketing);
    await new Promise((res) => { setTimeout(res, 400); });
    await tickCampaigns();
    await drainOutbox();
    const n = (await mine(alice, 'coupon_announced'))[0];
    await api('post', `/api/v1/notifications/${n._id}/click`, alice);

    const m = (await api('get', '/api/v1/admin/notifications/metrics?days=30', marketing)).body.data;
    assert.equal(m.notificationsCreated, 2);
    assert.equal(m.inAppReadRate, 0.5);
    assert.equal(m.inAppClicks, 1);
    assert.equal(m.email.sent, 1);
    assert.equal(m.email.skipped, 1);
    assert.equal(m.email.opened, null);
    assert.equal(m.email.delivered, null);
    assert.equal(m.email.bounced, null);
    assert.match(m.email.note, /not reported/i);
    assert.equal(m.failedDeliveryAttempts, 0);
    assert.equal((await api('get', '/api/v1/admin/notifications/metrics?days=0', marketing)).status, 400);
  });

  it('admin can inspect failed deliveries and retry them; dead events can be re-queued; activity is filterable', async () => {
    const r = await createCouponCampaign({ sendEmail: true });
    await updatePreferences(alice._id, { marketingEmails: true, discounts: { email: true } });
    let fail = true;
    const sent = [];
    setEmailProvider({ name: 'flaky', async send(m) { if (fail) throw new Error('mailbox full'); sent.push(m); return { messageId: '<ok>' }; } });
    await api('post', `/api/v1/admin/notifications/campaigns/${r.body.data.campaign._id}/publish`, marketing);
    await new Promise((res) => { setTimeout(res, 400); });
    await tickCampaigns();
    await drainOutbox();

    const failed = await api('get', '/api/v1/admin/notifications/failed-deliveries', admin);
    assert.equal(failed.body.data.items.length, 1);
    assert.match(failed.body.data.items[0].error, /mailbox full/);
    assert.ok(!failed.body.data.items[0].to.includes(alice.email), 'masked address');
    assert.equal((await api('get', '/api/v1/admin/notifications/failed-deliveries', marketing)).status, 403);

    fail = false;
    const nid = failed.body.data.items[0].notificationId;
    assert.equal((await api('post', `/api/v1/admin/notifications/deliveries/${nid}/retry`, support)).status, 403);
    assert.equal((await api('post', `/api/v1/admin/notifications/deliveries/${nid}/retry`, admin)).status, 200);
    await drainOutbox();
    assert.equal(sent.length, 1);
    assert.equal((await Notification.findById(nid)).deliveryStatus.email, 'sent');
    assert.equal((await api('post', `/api/v1/admin/notifications/deliveries/${nid}/retry`, admin)).status, 409, 'nothing left to retry');

    const act = await api('get', `/api/v1/admin/notifications/activity?emailStatus=sent&type=coupon_announced`, admin);
    assert.equal(act.body.data.items.length, 1);
    assert.equal(act.body.data.items[0].recipient.role, 'customer');
    assert.equal((await api('get', '/api/v1/admin/notifications/activity?page=0', admin)).status, 400);

    const ev = await api('get', '/api/v1/admin/notifications/events?status=failed', admin);
    assert.ok(Array.isArray(ev.body.data.items));
    assert.ok(await NotificationDeliveryAttempt.countDocuments({ status: 'sent' }) >= 1);
    assert.ok(await OutboxEvent.countDocuments() > 0);
  });
});
