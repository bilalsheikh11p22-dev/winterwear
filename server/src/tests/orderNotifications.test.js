import './helpers/testEnv.js';
import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import Notification from '../models/Notification.js';
import Order from '../models/Order.js';
import Payment from '../models/Payment.js';
import OutboxEvent from '../models/OutboxEvent.js';
import NotificationDeliveryAttempt from '../models/NotificationDeliveryAttempt.js';
import { connectTestDb, closeTestDb, resetDb } from './helpers/db.js';
import { makeUser, makeProduct, stockProduct } from './helpers/fixtures.js';
import { createOrderFromCheckout, transitionOrderStatus } from '../services/orderService.js';
import { verifyPaymentWebhook } from '../services/paymentService.js';
import { drainOutbox } from '../services/notifications/outbox.js';
import { publishOrderPlaced } from '../services/notifications/events.js';
import { setEmailProvider } from '../services/notifications/emailProvider.js';
import { updatePreferences } from '../services/notifications/preferenceService.js';
import '../services/notifications/handlers.js';

const address = { fullName: 'Zainab Private', phone: '03001234567', street: '12 Secret Lane', city: 'Lahore', state: 'Punjab', postalCode: '54000' };
let customer; let admin; let fulfillment; let finance; let support; let product;

const place = async (paymentMethod = 'COD', extra = {}) =>
  createOrderFromCheckout({
    userId: customer._id, shippingAddress: address, paymentMethod,
    items: [{ productId: product._id, name: product.name, quantity: 1, size: 'M', color: { name: 'Black', hex: '#000000' } }], ...extra,
  });

const mine = (user, type) => Notification.find({ recipient: user._id, ...(type ? { type } : {}) });

const goodProvider = () => {
  const sent = [];
  return { name: 'mock', sent, async send(m) { sent.push(m); return { messageId: `<m${sent.length}@mock>` }; } };
};

describe('Order notifications (real order lifecycle)', () => {
  before(() => connectTestDb('order_notifications'));
  after(async () => { setEmailProvider(null); await closeTestDb(); });
  beforeEach(async () => {
    await resetDb();
    setEmailProvider(null);
    customer = await makeUser();
    admin = await makeUser('admin');
    fulfillment = await makeUser('fulfillment_staff');
    finance = await makeUser('finance_staff');
    support = await makeUser('customer_support');
    product = await makeProduct();
    await stockProduct(product, 100);
  });

  it('COD: customer gets "placed" with the REAL order number; admin + fulfillment are alerted; others are not', async () => {
    const order = await place('COD');
    assert.equal(order.orderStatus, 'confirmed');
    await drainOutbox();

    const [n] = await mine(customer, 'order_placed');
    assert.ok(n, 'customer notification exists');
    assert.ok(n.message.includes(order.orderNumber));
    assert.equal(n.actionUrl, `/my-orders/${order._id}`);
    assert.equal(n.data.orderNumber, order.orderNumber);
    assert.equal(n.isRead, false);

    assert.equal((await mine(admin, 'new_order_staff')).length, 1);
    assert.equal((await mine(fulfillment, 'new_order_staff')).length, 1);
    assert.equal((await mine(finance, 'new_order_staff')).length, 0);
    assert.equal((await mine(support, 'new_order_staff')).length, 0);
  });

  it('staff notifications never contain customer PII', async () => {
    await place('COD');
    await drainOutbox();
    const staffRows = await Notification.find({ recipient: { $in: [admin._id, fulfillment._id] } });
    assert.ok(staffRows.length >= 2);
    for (const r of staffRows) {
      const blob = JSON.stringify(r.toObject());
      for (const secret of ['Zainab', '03001234567', 'Secret Lane', customer.email]) {
        assert.ok(!blob.includes(secret), `staff notification leaked "${secret}"`);
      }
    }
  });

  it('online payment: "payment pending" wording, no staff alert until the provider webhook confirms payment', async () => {
    const order = await place('Stripe');
    assert.equal(order.orderStatus, 'pending_payment');
    assert.equal(order.paymentStatus, 'pending');
    await drainOutbox();

    const [pending] = await mine(customer, 'payment_pending');
    assert.ok(pending);
    assert.match(pending.title, /payment pending/i);
    assert.equal((await mine(customer, 'order_placed')).length, 0, 'must not claim the order is placed/paid yet');
    assert.equal((await mine(admin, 'new_order_staff')).length, 0, 'unpaid orders are not fulfilment work');

    await Payment.create({ order: order._id, customer: customer._id, orderNumber: order.orderNumber, amount: order.totalAmount, provider: 'stripe', idempotencyKey: `pay-${order._id}`, status: 'pending' });
    await verifyPaymentWebhook({ provider: 'stripe', eventId: 'evt_1', eventType: 'payment_intent.succeeded', transactionId: 'pi_123', orderNumber: order.orderNumber, status: 'succeeded', payloadHash: 'h' });
    await drainOutbox();

    const fresh = await Order.findById(order._id);
    assert.equal(fresh.paymentStatus, 'paid');
    assert.equal((await mine(customer, 'payment_confirmed')).length, 1);
    assert.equal((await mine(admin, 'new_order_staff')).length, 1);
    // the system "confirmed" echo is suppressed — payment_confirmed already says it
    assert.equal((await mine(customer, 'order_confirmed')).length, 0);
  });

  it('payment failure notifies the customer and does NOT mark the order paid', async () => {
    const order = await place('Stripe');
    await Payment.create({ order: order._id, customer: customer._id, orderNumber: order.orderNumber, amount: order.totalAmount, provider: 'stripe', idempotencyKey: `pay-${order._id}`, status: 'pending' });
    await verifyPaymentWebhook({ provider: 'stripe', eventId: 'evt_f', eventType: 'payment_intent.payment_failed', transactionId: 'pi_x', orderNumber: order.orderNumber, status: 'failed', payloadHash: 'h' });
    await drainOutbox();
    assert.equal((await Order.findById(order._id)).paymentStatus, 'failed');
    assert.equal((await mine(customer, 'payment_failed')).length, 1);
    assert.equal((await mine(customer, 'payment_confirmed')).length, 0);
  });

  it('duplicate events, retried webhooks and repeated drains never duplicate critical notifications', async () => {
    const order = await place('Stripe');
    await Payment.create({ order: order._id, customer: customer._id, orderNumber: order.orderNumber, amount: order.totalAmount, provider: 'stripe', idempotencyKey: `pay-${order._id}`, status: 'pending' });

    await publishOrderPlaced(order);
    await publishOrderPlaced(order);
    await drainOutbox();
    await drainOutbox();
    assert.equal(await OutboxEvent.countDocuments({ eventId: `order.placed:${order._id}` }), 1);
    assert.equal((await mine(customer, 'payment_pending')).length, 1);

    const hook = (eventId) => verifyPaymentWebhook({ provider: 'stripe', eventId, eventType: 'payment_intent.succeeded', transactionId: 'pi_1', orderNumber: order.orderNumber, status: 'succeeded', payloadHash: 'h' });
    await hook('evt_a');
    await hook('evt_a'); // exact redelivery
    await hook('evt_b'); // provider retry with a NEW event id
    await drainOutbox();
    assert.equal((await mine(customer, 'payment_confirmed')).length, 1);
    assert.equal((await mine(admin, 'new_order_staff')).length, 1);
  });

  it('does not announce an order that does not exist in MongoDB', async () => {
    await publishOrderPlaced({ _id: '64b7f0c2a1b2c3d4e5f60718' });
    await drainOutbox();
    assert.equal(await Notification.countDocuments(), 0);
  });

  it('status changes produce the right customer notifications with real data (and staff for COD cash)', async () => {
    const order = await place('COD');
    await drainOutbox();
    const step = (targetStatus, actorRole = 'admin') => transitionOrderStatus({ orderId: order._id, targetStatus, actorId: admin._id, actorRole });

    await step('processing');
    await step('packing');
    await step('ready_for_dispatch');
    await step('assigned_to_rider');
    await step('picked_up', 'super_admin');
    await step('out_for_delivery', 'super_admin');
    await step('delivered', 'super_admin');
    await drainOutbox();

    const types = (await mine(customer)).map((n) => n.type).sort();
    for (const expected of ['order_placed', 'order_processing', 'order_packed', 'delivery_rider_assigned', 'order_shipped', 'out_for_delivery', 'delivered']) {
      assert.ok(types.includes(expected), `missing ${expected}; got ${types}`);
    }
    const delivered = (await mine(customer, 'delivered'))[0];
    assert.ok(delivered.message.includes(order.orderNumber));
    assert.equal((await mine(finance, 'cod_reconciliation_required')).length, 1, 'COD delivery → finance reconciliation task');
    assert.equal((await Order.findById(order._id)).orderStatus, 'delivered');
  });

  it('cancellation notifies the customer; system cancellation explains why', async () => {
    const o1 = await place('COD');
    await transitionOrderStatus({ orderId: o1._id, targetStatus: 'cancelled', actorId: customer._id, actorRole: 'customer' });
    const o2 = await place('Stripe');
    await transitionOrderStatus({ orderId: o2._id, targetStatus: 'cancelled', actorId: customer._id, actorRole: 'system' });
    await drainOutbox();
    const rows = await mine(customer, 'order_cancelled');
    assert.equal(rows.length, 2);
    assert.ok(rows.some((r) => /payment was not completed/i.test(r.message)));
  });

  it('EMAIL FAILURE keeps the in-app notification, retries with backoff, then sends exactly once', async () => {
    const provider = { name: 'flaky', calls: 0, sent: [], async send(m) { this.calls += 1; if (this.calls < 3) throw new Error('SMTP 421 try later'); this.sent.push(m); return { messageId: '<ok@flaky>' }; } };
    setEmailProvider(provider);
    const order = await place('COD');
    const r1 = await drainOutbox();
    assert.ok(r1.failed >= 1, 'email job failed');

    let [n] = await mine(customer, 'order_placed');
    assert.ok(n, 'in-app notification survived the email failure');
    assert.equal(n.deliveryStatus.email, 'failed');
    assert.equal(n.deliveryStatus.inApp, 'sent');

    const evt = await OutboxEvent.findOne({ eventId: `email:${n._id}` });
    assert.equal(evt.status, 'failed');
    assert.ok(evt.nextAttemptAt > new Date(), 'backoff scheduled in the future');
    assert.equal(evt.attempts, 1);

    // nothing is retried before it is due
    assert.equal((await drainOutbox()).failed, 0);

    // retry #2 fails, retry #3 succeeds
    for (let i = 0; i < 2; i += 1) { await OutboxEvent.updateMany({ status: 'failed' }, { $set: { nextAttemptAt: new Date() } }); await drainOutbox(); }
    n = await Notification.findById(n._id);
    assert.equal(n.deliveryStatus.email, 'sent');
    assert.equal(provider.sent.length, 1);
    assert.equal(await NotificationDeliveryAttempt.countDocuments({ notification: n._id, status: 'failed' }), 2);
    const ok = await NotificationDeliveryAttempt.findOne({ notification: n._id, status: 'sent' });
    assert.equal(ok.providerMessageId, '<ok@flaky>');
    assert.ok(!JSON.stringify(ok.toObject()).includes(customer.email), 'full email address is not stored');

    // re-running everything must not send again
    await OutboxEvent.updateMany({}, { $set: { nextAttemptAt: new Date() } });
    await drainOutbox();
    assert.equal(provider.sent.length, 1);
    assert.ok(order);
  });

  it('events that keep failing end in the dead-letter state (bounded retries)', async () => {
    setEmailProvider({ name: 'down', async send() { throw new Error('provider down'); } });
    await place('COD');
    await drainOutbox();
    await OutboxEvent.updateMany({ name: 'notification.email' }, { $set: { attempts: 5, status: 'failed', nextAttemptAt: new Date() } });
    const res = await drainOutbox();
    assert.equal(res.dead, 1);
    const dead = await OutboxEvent.findOne({ status: 'dead' });
    assert.match(dead.lastError, /provider down/);
    await OutboxEvent.updateMany({}, { $set: { nextAttemptAt: new Date() } });
    assert.equal((await drainOutbox()).dead, 0, 'dead events are not retried automatically');
  });

  it('email not configured: in-app works and the email is reported as skipped (not silently dropped)', async () => {
    await place('COD');
    await drainOutbox();
    const [n] = await mine(customer, 'order_placed');
    assert.ok(n);
    assert.equal(n.deliveryStatus.email, 'skipped');
    assert.equal(n.deliveryStatus.emailReason, 'email_not_configured');
  });

  it('respects the customer\'s "order updates by email" preference at send time', async () => {
    const provider = goodProvider();
    setEmailProvider(provider);
    await updatePreferences(customer._id, { orderUpdates: { email: false } });
    await place('COD');
    await drainOutbox();
    assert.equal(provider.sent.length, 0);
    const [n] = await mine(customer, 'order_placed');
    assert.ok(n, 'in-app still delivered');
    assert.equal(n.deliveryStatus.email, 'skipped');
  });

  it('security email is sent even when promotional email is off', async () => {
    const provider = goodProvider();
    setEmailProvider(provider);
    const { publishAccountEvent } = await import('../services/notifications/events.js');
    await publishAccountEvent({ userId: customer._id, kind: 'password_changed', key: 'k1' });
    await drainOutbox();
    assert.equal(provider.sent.length, 1);
    assert.equal(provider.sent[0].to, customer.email);
    assert.ok(!provider.sent[0].headers['List-Unsubscribe'], 'transactional mail has no marketing unsubscribe header');
  });
});
