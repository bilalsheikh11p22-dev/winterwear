import './helpers/testEnv.js';
import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../app.js';
import Coupon from '../models/Coupon.js';
import CouponRedemption from '../models/CouponRedemption.js';
import Order from '../models/Order.js';
import Payment from '../models/Payment.js';
import Notification from '../models/Notification.js';
import { connectTestDb, closeTestDb, resetDb, authHeader } from './helpers/db.js';
import { makeUser, makeProduct, makeCategory, stockProduct } from './helpers/fixtures.js';
import { createOrderFromCheckout, transitionOrderStatus } from '../services/orderService.js';
import { verifyPaymentWebhook } from '../services/paymentService.js';
import { drainOutbox } from '../services/notifications/outbox.js';
import '../services/notifications/handlers.js';

const address = { fullName: 'A B', phone: '0300', street: 's', city: 'Lahore', state: 'Punjab', postalCode: '54000' };
const day = 86400000;
let customer; let admin; let marketing; let product; let saleProduct;

const couponBody = (over = {}) => ({
  code: 'WINTER10', discountType: 'percentage', discountValue: 10,
  validFrom: new Date(Date.now() - day).toISOString(), validUntil: new Date(Date.now() + 7 * day).toISOString(), ...over,
});
const mkCoupon = (over = {}) => Coupon.create({ ...couponBody(), validFrom: new Date(Date.now() - day), validUntil: new Date(Date.now() + 7 * day), ...over });
const preview = (user, code, items) => request(app).post('/api/v1/coupons/validate').set(user ? authHeader(user) : {}).send({ code, items: items || [{ productId: String(product._id), quantity: 1 }] });
const order = (user, code, method = 'COD', p = product) =>
  createOrderFromCheckout({ userId: user._id, shippingAddress: address, paymentMethod: method, couponCode: code, items: [{ productId: p._id, name: p.name, quantity: 1, size: 'M', color: { name: 'Black', hex: '#000' } }] });

describe('Coupons', () => {
  before(() => connectTestDb('coupons'));
  after(closeTestDb);
  beforeEach(async () => {
    await resetDb();
    customer = await makeUser();
    admin = await makeUser('admin');
    marketing = await makeUser('marketing_manager');
    product = await makeProduct({ regularPrice: 10000 });
    saleProduct = await makeProduct({ regularPrice: 8000, salePrice: 6000 });
    await stockProduct(product, 500);
    await stockProduct(saleProduct, 500);
  });

  describe('admin management & authorization', () => {
    it('admin/marketing can create, edit, toggle; customers and anonymous users cannot', async () => {
      assert.equal((await request(app).post('/api/v1/admin/coupons').send(couponBody())).status, 401);
      assert.equal((await request(app).post('/api/v1/admin/coupons').set(authHeader(customer)).send(couponBody())).status, 403);
      assert.equal((await request(app).get('/api/v1/admin/coupons').set(authHeader(customer))).status, 403);

      const created = await request(app).post('/api/v1/admin/coupons').set(authHeader(marketing)).send(couponBody({ code: 'welcome15', discountValue: 15 }));
      assert.equal(created.status, 201, JSON.stringify(created.body));
      assert.equal(created.body.data.coupon.code, 'WELCOME15');
      const id = created.body.data.coupon._id;
      assert.equal(created.body.data.coupon.status, 'active');

      assert.equal((await request(app).patch(`/api/v1/admin/coupons/${id}`).set(authHeader(customer)).send({ discountValue: 90 })).status, 403);
      const patched = await request(app).patch(`/api/v1/admin/coupons/${id}`).set(authHeader(admin)).send({ minOrderAmount: 5000 });
      assert.equal(patched.body.data.coupon.minOrderAmount, 5000);

      const off = await request(app).patch(`/api/v1/admin/coupons/${id}/status`).set(authHeader(admin)).send({ isActive: false });
      assert.equal(off.body.data.coupon.status, 'disabled');
      assert.equal((await request(app).patch(`/api/v1/admin/coupons/${id}/status`).set(authHeader(customer)).send({ isActive: true })).status, 403);

      const list = await request(app).get('/api/v1/admin/coupons?status=disabled').set(authHeader(admin));
      assert.equal(list.body.data.coupons.length, 1);
      assert.equal((await request(app).get('/api/v1/admin/coupons?status=active').set(authHeader(admin))).body.data.coupons.length, 0);
    });

    it('validates input: duplicate code, bad percentages, expiry before start, legacy "fixed" alias', async () => {
      await request(app).post('/api/v1/admin/coupons').set(authHeader(admin)).send(couponBody()).expect(201);
      assert.equal((await request(app).post('/api/v1/admin/coupons').set(authHeader(admin)).send(couponBody())).status, 409);
      assert.equal((await request(app).post('/api/v1/admin/coupons').set(authHeader(admin)).send(couponBody({ code: 'BAD', discountValue: 150 }))).status, 400);
      const reversed = couponBody({ code: 'REV', validFrom: new Date(Date.now() + 2 * day).toISOString(), validUntil: new Date(Date.now() + day).toISOString() });
      assert.equal((await request(app).post('/api/v1/admin/coupons').set(authHeader(admin)).send(reversed)).status, 400);
      const fixed = await request(app).post('/api/v1/admin/coupons').set(authHeader(admin)).send(couponBody({ code: 'FIXED', discountType: 'fixed', discountValue: 500, usageLimit: 5 }));
      assert.equal(fixed.status, 201);
      assert.equal(fixed.body.data.coupon.discountType, 'fixed_amount');
      assert.equal(fixed.body.data.coupon.maxUsageCount, 5);
      assert.equal((await request(app).post('/api/v1/admin/coupons').set(authHeader(admin)).send({ ...couponBody({ code: 'XTRA' }), role: 'admin' })).status, 400, 'unknown fields rejected');
    });

    it('terms of a used coupon are locked; usage limit cannot drop below real usage', async () => {
      const c = await mkCoupon({ maxUsageCount: 10 });
      await order(customer, 'WINTER10');
      const lock = await request(app).patch(`/api/v1/admin/coupons/${c._id}`).set(authHeader(admin)).send({ discountValue: 90 });
      assert.equal(lock.status, 409);
      assert.equal(lock.body.code, 'COUPON_TERMS_LOCKED');
      assert.equal((await request(app).patch(`/api/v1/admin/coupons/${c._id}`).set(authHeader(admin)).send({ maxUsageCount: 1 })).status, 200);
      assert.equal((await request(app).patch(`/api/v1/admin/coupons/${c._id}`).set(authHeader(admin)).send({ maxUsageCount: 0 })).status, 400);
    });
  });

  describe('validation (preview)', () => {
    it('an eligible customer validates a coupon; the amount is computed from DB prices; preview consumes nothing', async () => {
      await mkCoupon();
      const res = await preview(customer, 'winter10');
      assert.equal(res.status, 200, JSON.stringify(res.body));
      assert.equal(res.body.data.discountAmount, 1000);
      assert.equal(res.body.data.preview, true);
      for (let i = 0; i < 5; i += 1) await preview(customer, 'WINTER10');
      const c = await Coupon.findOne({ code: 'WINTER10' });
      assert.equal(c.currentUsageCount, 0);
      assert.equal(c.reservedCount, 0);
      assert.equal(await CouponRedemption.countDocuments(), 0);
    });

    it('never trusts a client-sent amount, price or subtotal', async () => {
      await mkCoupon();
      const res = await request(app).post('/api/v1/coupons/validate').set(authHeader(customer))
        .send({ code: 'WINTER10', items: [{ productId: String(product._id), quantity: 2 }], discountAmount: 99999, price: 1, subtotal: 1 });
      assert.equal(res.body.data.discountAmount, 2000);
    });

    it('rejects expired / scheduled / disabled / exhausted / unknown with clear reasons', async () => {
      await mkCoupon({ code: 'EXPIRED', validFrom: new Date(Date.now() - 3 * day), validUntil: new Date(Date.now() - day) });
      await mkCoupon({ code: 'FUTURE', validFrom: new Date(Date.now() + day), validUntil: new Date(Date.now() + 3 * day) });
      await mkCoupon({ code: 'OFF', isActive: false });
      await mkCoupon({ code: 'GONE', maxUsageCount: 2, currentUsageCount: 2 });
      const expect = async (code, reason, re) => {
        const r = await preview(customer, code);
        assert.equal(r.status, 400, code);
        assert.equal(r.body.code, `COUPON_${reason}`, code);
        assert.match(r.body.message, re, code);
      };
      await expect('EXPIRED', 'EXPIRED', /expired/i);
      await expect('FUTURE', 'SCHEDULED', /not valid yet/i);
      await expect('OFF', 'DISABLED', /no longer active/i);
      await expect('GONE', 'EXHAUSTED', /redemption limit/i);
      await expect('NOPE', 'NOT_FOUND', /does not exist/i);
    });

    it('rejects ineligible carts: minimum order, sale items, product/category restrictions, segments', async () => {
      await mkCoupon({ code: 'BIGSPEND', minOrderAmount: 50000 });
      let r = await preview(customer, 'BIGSPEND');
      assert.equal(r.body.code, 'COUPON_MIN_ORDER');
      assert.match(r.body.message, /40,000/);

      await mkCoupon({ code: 'NOSALE', excludeSaleItems: true });
      r = await preview(customer, 'NOSALE', [{ productId: String(saleProduct._id), quantity: 1 }]);
      assert.equal(r.body.code, 'COUPON_NOT_ELIGIBLE_ITEMS');
      r = await preview(customer, 'NOSALE', [{ productId: String(saleProduct._id), quantity: 1 }, { productId: String(product._id), quantity: 1 }]);
      assert.equal(r.body.data.discountAmount, 1000, 'discount applies only to the full-price item');

      const other = await makeProduct();
      await mkCoupon({ code: 'ONLYPARKA', eligibleProducts: [product._id] });
      assert.equal((await preview(customer, 'ONLYPARKA', [{ productId: String(other._id), quantity: 1 }])).body.code, 'COUPON_NOT_ELIGIBLE_ITEMS');
      assert.equal((await preview(customer, 'ONLYPARKA')).status, 200);

      const cat = await makeCategory('Scarves');
      const scarf = await makeProduct({ category: cat._id, regularPrice: 2000 });
      await mkCoupon({ code: 'SCARVES', applicableCategories: [cat._id] });
      r = await preview(customer, 'SCARVES', [{ productId: String(scarf._id), quantity: 1 }, { productId: String(product._id), quantity: 1 }]);
      assert.equal(r.body.data.discountAmount, 200, '10% of the scarf only');

      await mkCoupon({ code: 'VIPONLY', customerSegment: 'specific', eligibleCustomers: [(await makeUser())._id] });
      assert.equal((await preview(customer, 'VIPONLY')).body.code, 'COUPON_SEGMENT');
      assert.equal((await preview(null, 'WINTER10')).status, 400, 'anonymous gets a sign-in message, not a discount');
    });

    it('caps: max discount amount, fixed amount never exceeds the eligible subtotal, free shipping', async () => {
      await mkCoupon({ code: 'CAP', discountValue: 50, maxDiscountAmount: 1500 });
      assert.equal((await preview(customer, 'CAP')).body.data.discountAmount, 1500);
      const cheap = await makeProduct({ regularPrice: 300 });
      await mkCoupon({ code: 'BIGFIX', discountType: 'fixed_amount', discountValue: 5000 });
      assert.equal((await preview(customer, 'BIGFIX', [{ productId: String(cheap._id), quantity: 1 }])).body.data.discountAmount, 300);
      await mkCoupon({ code: 'SHIPFREE', discountType: 'free_shipping', discountValue: 0 });
      const ship = await preview(customer, 'SHIPFREE', [{ productId: String(cheap._id), quantity: 1 }]);
      assert.equal(ship.body.data.freeShipping, true);
      assert.equal(ship.body.data.shippingDiscount, 250);
    });

    it('legacy body {code, subtotal} still works; empty body is a validation error', async () => {
      await mkCoupon();
      const legacy = await request(app).post('/api/v1/coupons/validate').set(authHeader(customer)).send({ code: 'WINTER10', subtotal: 5000 });
      assert.equal(legacy.body.data.discountAmount, 500);
      assert.equal((await request(app).post('/api/v1/coupons/validate').send({ code: 'WINTER10' })).body.code, 'VALIDATION_ERROR');
    });
  });

  describe('checkout lifecycle: reserve → redeem / release', () => {
    it('COD: discount computed server-side, coupon redeemed immediately', async () => {
      await mkCoupon();
      const o = await order(customer, 'WINTER10');
      assert.equal(o.discountAmount, 1000);
      assert.equal(o.couponCode, 'WINTER10');
      assert.equal(o.totalAmount, 10000 - 1000 + 0); // over free-shipping threshold
      const c = await Coupon.findOne({ code: 'WINTER10' });
      assert.equal(c.currentUsageCount, 1);
      assert.equal(c.reservedCount, 0);
      assert.equal((await CouponRedemption.findOne({ order: o._id })).status, 'redeemed');
      await drainOutbox();
      assert.equal(await Notification.countDocuments({ recipient: customer._id, type: 'coupon_applied' }), 1);
    });

    it('online payment: coupon is only RESERVED until the verified webhook, then redeemed', async () => {
      await mkCoupon();
      const o = await order(customer, 'WINTER10', 'Stripe');
      let c = await Coupon.findOne({ code: 'WINTER10' });
      assert.equal(c.reservedCount, 1);
      assert.equal(c.currentUsageCount, 0);
      assert.equal((await CouponRedemption.findOne({ order: o._id })).status, 'reserved');

      await Payment.create({ order: o._id, customer: customer._id, orderNumber: o.orderNumber, amount: o.totalAmount, provider: 'stripe', idempotencyKey: `p-${o._id}`, status: 'pending' });
      await verifyPaymentWebhook({ provider: 'stripe', eventId: 'e1', eventType: 't', transactionId: 'tx', orderNumber: o.orderNumber, status: 'succeeded', payloadHash: 'h' });
      c = await Coupon.findOne({ code: 'WINTER10' });
      assert.equal(c.reservedCount, 0);
      assert.equal(c.currentUsageCount, 1);
      assert.equal((await CouponRedemption.findOne({ order: o._id })).status, 'redeemed');
    });

    it('a cancelled / expired unpaid order releases the coupon so it can be used again', async () => {
      await mkCoupon({ maxUsageCount: 1 });
      const o = await order(customer, 'WINTER10', 'Stripe');
      await assert.rejects(order(await makeUser(), 'WINTER10'), /limit|available/i);
      await transitionOrderStatus({ orderId: o._id, targetStatus: 'cancelled', actorId: customer._id, actorRole: 'system' });
      const c = await Coupon.findOne({ code: 'WINTER10' });
      assert.equal(c.reservedCount, 0);
      assert.equal(c.currentUsageCount, 0);
      const again = await order(customer, 'WINTER10');
      assert.equal(again.discountAmount, 1000, 'the same customer can use the released coupon');
    });

    it('per-customer limit applies across orders; a second use is rejected with a clear message', async () => {
      await mkCoupon();
      await order(customer, 'WINTER10');
      await assert.rejects(order(customer, 'WINTER10'), (e) => e.code === 'COUPON_CUSTOMER_LIMIT' && /already used/i.test(e.message));
      assert.equal(await Order.countDocuments({ customer: customer._id }), 1, 'no second order was written');
    });

    it('perCustomerLimit > 1 allows exactly that many uses', async () => {
      await mkCoupon({ perCustomerLimit: 2 });
      await order(customer, 'WINTER10');
      await order(customer, 'WINTER10');
      await assert.rejects(order(customer, 'WINTER10'), (e) => e.code === 'COUPON_CUSTOMER_LIMIT');
    });

    it('an invalid coupon blocks the order (no silent full-price charge), writes no order, and explains why', async () => {
      await mkCoupon({ code: 'DEAD', validFrom: new Date(Date.now() - 3 * day), validUntil: new Date(Date.now() - day) });
      await assert.rejects(order(customer, 'DEAD'), (e) => e.status === 400 && e.code === 'COUPON_EXPIRED');
      assert.equal(await Order.countDocuments(), 0);
      await drainOutbox();
      const n = await Notification.findOne({ recipient: customer._id, type: 'coupon_rejected' });
      assert.ok(n);
      assert.match(n.message, /expired/i);
    });

    it('first-order-only: valid on the first order, rejected after one exists', async () => {
      await mkCoupon({ code: 'FIRST', firstOrderOnly: true });
      assert.equal((await preview(customer, 'FIRST')).status, 200);
      await order(customer, null); // a normal order first
      const r = await preview(customer, 'FIRST');
      assert.equal(r.body.code, 'COUPON_FIRST_ORDER_ONLY');
    });
  });

  describe('concurrency', () => {
    it('global limit: 12 simultaneous checkouts on a 3-use coupon → exactly 3 succeed', async () => {
      await mkCoupon({ maxUsageCount: 3 });
      const users = await Promise.all(Array.from({ length: 12 }, () => makeUser()));
      const results = await Promise.allSettled(users.map((u) => order(u, 'WINTER10')));
      const ok = results.filter((r) => r.status === 'fulfilled');
      const failed = results.filter((r) => r.status === 'rejected');
      assert.equal(ok.length, 3, failed.map((f) => f.reason.message).join(' | '));
      for (const f of failed) assert.match(f.reason.code || '', /^COUPON_/);
      const c = await Coupon.findOne({ code: 'WINTER10' });
      assert.equal(c.currentUsageCount, 3);
      assert.equal(c.reservedCount, 0);
      assert.equal(await CouponRedemption.countDocuments({ status: 'redeemed' }), 3);
      assert.equal(await Order.countDocuments({ couponCode: 'WINTER10' }), 3, 'failed checkouts left no orphan orders');
    });

    it('per-customer limit: 8 simultaneous checkouts by ONE customer → exactly 1 uses the coupon', async () => {
      await mkCoupon();
      const results = await Promise.allSettled(Array.from({ length: 8 }, () => order(customer, 'WINTER10')));
      assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
      assert.equal(await CouponRedemption.countDocuments({ user: customer._id, active: true }), 1);
      assert.equal((await Coupon.findOne({ code: 'WINTER10' })).currentUsageCount, 1);
    });

    it('reservations count toward the limit (online orders in flight cannot oversell)', async () => {
      await mkCoupon({ maxUsageCount: 2 });
      const users = await Promise.all(Array.from({ length: 6 }, () => makeUser()));
      const results = await Promise.allSettled(users.map((u) => order(u, 'WINTER10', 'Stripe')));
      assert.equal(results.filter((r) => r.status === 'fulfilled').length, 2);
      const c = await Coupon.findOne({ code: 'WINTER10' });
      assert.equal(c.reservedCount, 2);
      assert.equal(c.currentUsageCount, 0);
    });
  });

  describe('customer coupon list & analytics', () => {
    it('lists only coupons this customer may see, with eligibility and redemption status', async () => {
      await mkCoupon({ code: 'PUBLIC1' });
      await mkCoupon({ code: 'HIDDEN1', visibility: 'hidden' });
      await mkCoupon({ code: 'EXPIRED1', validFrom: new Date(Date.now() - 3 * day), validUntil: new Date(Date.now() - day) });
      await mkCoupon({ code: 'OFF1', isActive: false });
      await mkCoupon({ code: 'MINE', customerSegment: 'specific', eligibleCustomers: [customer._id] });
      await mkCoupon({ code: 'NOTMINE', customerSegment: 'specific', eligibleCustomers: [(await makeUser())._id] });
      await mkCoupon({ code: 'USEDUP', validUntil: new Date(Date.now() + 3 * day) });
      await order(customer, 'USEDUP');

      assert.equal((await request(app).get('/api/v1/coupons/available')).status, 401);
      const res = await request(app).get('/api/v1/coupons/available').set(authHeader(customer));
      const byCode = Object.fromEntries(res.body.data.coupons.map((c) => [c.code, c]));
      assert.deepEqual(Object.keys(byCode).sort(), ['MINE', 'PUBLIC1', 'USEDUP']);
      assert.equal(byCode.PUBLIC1.eligible, true);
      assert.equal(byCode.USEDUP.eligible, false);
      assert.equal(byCode.USEDUP.redeemedByMe, true);
      assert.equal(byCode.USEDUP.ineligibleReason, 'Already redeemed');
      assert.match(byCode.PUBLIC1.summary, /10% off/);
    });

    it('analytics report real redemption, discount and attributed-sales numbers', async () => {
      const c = await mkCoupon({ perCustomerLimit: 1 });
      const u2 = await makeUser();
      await order(customer, 'WINTER10');
      await order(u2, 'WINTER10');
      await order(await makeUser(), 'WINTER10', 'Stripe'); // reserved, not redeemed
      const res = await request(app).get(`/api/v1/admin/coupons/${c._id}/analytics`).set(authHeader(admin));
      assert.equal(res.status, 200);
      assert.equal(res.body.data.redemptions, 2);
      assert.equal(res.body.data.reserved, 1);
      assert.equal(res.body.data.totalDiscountGiven, 2000);
      assert.equal(res.body.data.couponAttributedSales, 18000);
      assert.equal(res.body.data.uniqueCustomers, 2);
      assert.equal((await request(app).get(`/api/v1/admin/coupons/${c._id}/analytics`).set(authHeader(customer))).status, 403);
    });
  });
});
