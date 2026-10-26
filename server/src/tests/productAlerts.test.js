import './helpers/testEnv.js';
import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../app.js';
import Notification from '../models/Notification.js';
import NotificationCampaign from '../models/NotificationCampaign.js';
import ProductSubscription from '../models/ProductSubscription.js';
import Wishlist from '../models/Wishlist.js';
import Product from '../models/Product.js';
import { connectTestDb, closeTestDb, resetDb, authHeader } from './helpers/db.js';
import { makeUser, makeProduct, makeCategory } from './helpers/fixtures.js';
import { createProduct, updateProduct } from '../services/productService.js';
import { drainOutbox } from '../services/notifications/outbox.js';
import { setEmailProvider } from '../services/notifications/emailProvider.js';
import { updatePreferences } from '../services/notifications/preferenceService.js';
import { runCampaignBatches } from '../services/notifications/campaignService.js';
import '../services/notifications/handlers.js';

let admin; let category; let alice; let bob; let carol;
const mine = (u, type) => Notification.find({ recipient: u._id, ...(type ? { type } : {}) });
const newProductData = (over = {}) => ({
  name: 'Alpine Down Jacket', sku: `ALP-${Math.random().toString(36).slice(2, 8)}`, slug: `alpine-${Math.random().toString(36).slice(2, 8)}`,
  description: 'Premium goose-down jacket for deep winter.', category: category._id, regularPrice: 24000, stockQuantity: 10,
  images: [{ public_id: 'winterwear/alpine', url: 'https://res.cloudinary.com/demo/image/upload/alpine.jpg', isPrimary: true }], ...over,
});

describe('Product publishing, alerts & latest arrivals', () => {
  before(() => connectTestDb('product_alerts'));
  after(async () => { setEmailProvider(null); await closeTestDb(); });
  beforeEach(async () => {
    await resetDb();
    setEmailProvider(null);
    admin = await makeUser('admin');
    category = await makeCategory('Jackets');
    alice = await makeUser();
    bob = await makeUser();
    carol = await makeUser();
  });

  it('publishing a product announces it to eligible customers with real product data', async () => {
    const p = await createProduct(newProductData({ salePrice: 19999 }));
    await drainOutbox();

    const [n] = await mine(alice, 'product_published');
    assert.ok(n, 'customer announcement');
    assert.equal(n.data.productSlug, p.slug);
    assert.equal(n.actionUrl, `/product/${p.slug}`);
    assert.equal(n.imageUrl, 'https://res.cloudinary.com/demo/image/upload/alpine.jpg', 'actual Cloudinary image');
    assert.match(n.message, /19,999/);
    assert.match(n.message, /24,000/);
    assert.match(n.title, /Alpine Down Jacket/);
    assert.equal(n.data.salePrice, 19999);
    assert.ok(n.expiresAt, 'marketing announcements expire');

    // staff accounts are not customers
    assert.equal((await mine(admin)).length, 0);
    const camp = await NotificationCampaign.findOne({ eventKey: `product.published:${p._id}` });
    assert.equal(camp.status, 'completed');
    assert.equal(camp.stats.created, 3);
  });

  it('DRAFT products never trigger announcements — not on save, not on editing, only on real publication', async () => {
    const draft = await createProduct(newProductData({ isPublished: false }));
    await drainOutbox();
    assert.equal(draft.publishedAt, null);
    assert.equal(await Notification.countDocuments(), 0);
    assert.equal(await NotificationCampaign.countDocuments(), 0);

    await updateProduct(draft._id, { description: 'Edited while still a draft, still not public.' });
    await updateProduct(draft._id, { regularPrice: 22000 });
    await drainOutbox();
    assert.equal(await Notification.countDocuments(), 0);

    const published = await updateProduct(draft._id, { isPublished: true });
    assert.ok(published.publishedAt instanceof Date, 'publication timestamp stamped');
    await drainOutbox();
    assert.equal((await mine(alice, 'product_published')).length, 1);

    // unpublish → republish must not announce a second time
    await updateProduct(draft._id, { isPublished: false });
    await updateProduct(draft._id, { isPublished: true });
    await drainOutbox();
    assert.equal((await mine(alice, 'product_published')).length, 1);
    assert.equal(await NotificationCampaign.countDocuments(), 1);
  });

  it('a product unpublished before the event is processed is not announced', async () => {
    const p = await createProduct(newProductData());
    await Product.updateOne({ _id: p._id }, { $set: { isPublished: false } });
    await drainOutbox();
    assert.equal(await Notification.countDocuments(), 0);
  });

  it('respects opt-outs, inactive accounts, and the frequency cap', async () => {
    await updatePreferences(bob._id, { newArrivals: { inApp: false } });
    await makeUser('customer', { isActive: false });
    await createProduct(newProductData());
    await drainOutbox();
    assert.equal((await mine(alice, 'product_published')).length, 1);
    assert.equal((await mine(bob, 'product_published')).length, 0);
    const camp = await NotificationCampaign.findOne();
    assert.equal(camp.stats.skippedPreference, 1);

    // 4th promo within 24h is held back by the cap (default 3)
    for (let i = 0; i < 3; i += 1) await createProduct(newProductData());
    await drainOutbox();
    assert.equal((await mine(alice, 'product_published')).length, 3);
    assert.equal((await NotificationCampaign.find()).reduce((s, c) => s + c.stats.skippedFrequency, 0) > 0, true);
  });

  it('announcement emails go ONLY to customers who opted in to marketing email, with an unsubscribe link', async () => {
    const sent = [];
    setEmailProvider({ name: 'mock', async send(m) { sent.push(m); return { messageId: `<${sent.length}@mock>` }; } });
    await updatePreferences(alice._id, { marketingEmails: true, newArrivals: { email: true } });
    await updatePreferences(bob._id, { newArrivals: { email: true } }); // category yes, master switch NO
    // carol: defaults
    await createProduct(newProductData());
    await drainOutbox();

    assert.deepEqual(sent.map((m) => m.to), [alice.email]);
    assert.match(sent[0].html, /Alpine Down Jacket/);
    assert.match(sent[0].html, /unsubscribe/i);
    assert.ok(sent[0].headers['List-Unsubscribe']);
    assert.equal((await mine(bob, 'product_published')).length, 1, 'bob still gets the in-app notification');
    assert.equal((await mine(bob, 'product_published'))[0].deliveryStatus.email, 'skipped');
  });

  it('one-click unsubscribe disables promotional email, and a queued email is not sent afterwards', async () => {
    const sent = [];
    setEmailProvider({ name: 'mock', async send(m) { sent.push(m); return { messageId: '<x>' }; } });
    await updatePreferences(alice._id, { marketingEmails: true, newArrivals: { email: true } });
    await createProduct(newProductData());
    // process only the campaign fan-out, leaving the email jobs queued
    await drainOutbox({ limit: 1 });
    const link = (await import('../services/notifications/preferenceService.js')).signUnsubscribeToken(alice._id);
    const res = await request(app).get(`/api/v1/notifications/unsubscribe?token=${link}`);
    assert.equal(res.status, 200);
    assert.match(res.text, /unsubscribed/i);
    await drainOutbox();
    assert.equal(sent.length, 0, 'consent is re-checked at send time');
    const prefs = await request(app).get('/api/v1/notifications/preferences').set(authHeader(alice));
    assert.equal(prefs.body.data.preferences.marketingEmails, false);
    assert.equal((await request(app).get('/api/v1/notifications/unsubscribe?token=garbage')).status, 400);
    // an access token is not an unsubscribe token
    assert.equal((await request(app).get(`/api/v1/notifications/unsubscribe?token=${authHeader(alice).Authorization.slice(7)}`)).status, 400);
  });

  describe('GET /products/latest', () => {
    it('returns only published products, newest publication first, with real fields', async () => {
      const old = await makeProduct({ name: 'Older', publishedAt: new Date(Date.now() - 10 * 86400000) });
      await makeProduct({ name: 'Draft', isPublished: false });
      const fresh = await makeProduct({ name: 'Fresh', publishedAt: new Date() });
      const res = await request(app).get('/api/v1/products/latest?limit=5');
      assert.equal(res.status, 200);
      assert.deepEqual(res.body.data.products.map((p) => p.name), ['Fresh', 'Older']);
      assert.equal(res.body.data.products[0].images[0].url.startsWith('https://res.cloudinary.com'), true);
      assert.ok(res.body.data.products[0].publishedAt);
      assert.equal((await request(app).get('/api/v1/products/latest?limit=999')).status, 400);
      assert.ok(old && fresh);
    });
  });

  describe('product alert subscriptions', () => {
    it('require auth, belong to the caller, reject drafts/unknown products, and cannot be duplicated', async () => {
      const p = await makeProduct();
      const draft = await makeProduct({ isPublished: false });
      assert.equal((await request(app).post(`/api/v1/products/${p._id}/subscribe`)).status, 401);
      assert.equal((await request(app).post(`/api/v1/products/${draft._id}/subscribe`).set(authHeader(alice))).status, 404);
      assert.equal((await request(app).post('/api/v1/products/64b7f0c2a1b2c3d4e5f60718/subscribe').set(authHeader(alice))).status, 404);
      assert.equal((await request(app).post('/api/v1/products/not-an-id/subscribe').set(authHeader(alice))).status, 400);

      const a = await request(app).post(`/api/v1/products/${p._id}/subscribe`).set(authHeader(alice)).send({});
      assert.equal(a.status, 201);
      const again = await request(app).post(`/api/v1/products/${p._id}/subscribe`).set(authHeader(alice)).send({});
      assert.equal(again.status, 200);
      assert.equal(again.body.data.created, false);
      assert.equal(await ProductSubscription.countDocuments({ user: alice._id, product: p._id }), 1);

      // someone else's unsubscribe doesn't touch alice's subscription
      await request(app).delete(`/api/v1/products/${p._id}/subscribe`).set(authHeader(bob)).expect(200);
      assert.equal(await ProductSubscription.countDocuments({ user: alice._id }), 1);
      await request(app).delete(`/api/v1/products/${p._id}/subscribe`).set(authHeader(alice)).expect(200);
      assert.equal(await ProductSubscription.countDocuments({ user: alice._id }), 0);
    });

    it('back-in-stock: subscribers (only) are notified when stock returns, once', async () => {
      const p = await makeProduct({ stockQuantity: 0 });
      await ProductSubscription.create({ user: alice._id, product: p._id, type: 'back_in_stock' });
      await ProductSubscription.create({ user: bob._id, product: p._id, type: 'back_in_stock' });
      await updatePreferences(bob._id, { backInStock: { inApp: false } });

      await updateProduct(p._id, { stockQuantity: 12 });
      await drainOutbox();
      const [n] = await mine(alice, 'back_in_stock');
      assert.ok(n);
      assert.equal(n.actionUrl, `/product/${p.slug}`);
      assert.equal((await mine(carol, 'back_in_stock')).length, 0, 'non-subscriber not notified');
      assert.equal((await mine(bob, 'back_in_stock')).length, 0, 'opted-out subscriber not notified');
      assert.equal(await ProductSubscription.countDocuments({ user: alice._id }), 0, 'one-shot subscription consumed');

      await updateProduct(p._id, { stockQuantity: 0 });
      await updateProduct(p._id, { stockQuantity: 9 });
      await drainOutbox();
      assert.equal((await mine(alice, 'back_in_stock')).length, 1, 'no repeat without re-subscribing');
    });

    it('price drop: wishlisted customers are notified; increases and opted-out users are not', async () => {
      const p = await makeProduct({ regularPrice: 10000 });
      await Wishlist.create({ user: alice._id, products: [p._id] });
      await Wishlist.create({ user: bob._id, products: [p._id] });
      await updatePreferences(bob._id, { priceDrop: { inApp: false } });

      await updateProduct(p._id, { regularPrice: 12000 }); // increase → nothing
      await drainOutbox();
      assert.equal(await Notification.countDocuments({ type: 'price_drop' }), 0);

      await updateProduct(p._id, { salePrice: 8500 });
      await drainOutbox();
      const [n] = await mine(alice, 'price_drop');
      assert.ok(n);
      assert.match(n.message, /8,500/);
      assert.match(n.message, /12,000/);
      assert.equal((await mine(bob, 'price_drop')).length, 0);
      assert.equal((await mine(carol, 'price_drop')).length, 0);
    });

    it('inventory: low-stock / out-of-stock alert staff; wishlisted customers get a vague "selling fast" (no counts)', async () => {
      const inv = await makeUser('inventory_manager');
      const finance = await makeUser('finance_staff');
      const p = await makeProduct({ stockQuantity: 20, lowStockThreshold: 5 });
      await Wishlist.create({ user: alice._id, products: [p._id] });

      await updateProduct(p._id, { stockQuantity: 4 });
      await drainOutbox();
      const [low] = await mine(inv, 'low_stock_alert');
      assert.ok(low);
      assert.match(low.message, /4 units/);
      assert.equal((await mine(admin, 'low_stock_alert')).length, 1);
      assert.equal((await mine(finance, 'low_stock_alert')).length, 0);
      const [wl] = await mine(alice, 'low_stock_wishlist');
      assert.ok(wl);
      assert.ok(!/\b4\b/.test(wl.message), 'exact stock level is not disclosed to customers');

      await updateProduct(p._id, { stockQuantity: 0 });
      await drainOutbox();
      assert.equal((await mine(inv, 'out_of_stock_alert')).length, 1);
      // same-day repeat is deduplicated
      await updateProduct(p._id, { stockQuantity: 3 });
      await updateProduct(p._id, { stockQuantity: 0 });
      await drainOutbox();
      assert.equal((await mine(inv, 'out_of_stock_alert')).length, 1);
    });
  });

  it('only authorised staff can create products through the API (customers are refused)', async () => {
    const res = await request(app).post('/api/v1/products').set(authHeader(alice)).send(newProductData());
    assert.equal(res.status, 403);
    assert.equal(await NotificationCampaign.countDocuments(), 0);
  });

  it('fan-out is cursor-based and resumable: batch size 2 over 5 customers, no duplicates', async () => {
    process.env.CAMPAIGN_BATCH_SIZE = '2';
    try {
      await makeUser(); await makeUser();
      const p = await makeProduct();
      const camp = await NotificationCampaign.create({ name: 'Batch', kind: 'product_announcement', status: 'running', products: [p._id], eventKey: 'batch-test' });
      await runCampaignBatches(camp._id);
      await runCampaignBatches(camp._id); // running it again is harmless
      const done = await NotificationCampaign.findById(camp._id);
      assert.equal(done.status, 'completed');
      assert.equal(await Notification.countDocuments({ campaign: camp._id }), 5);
      assert.equal(done.stats.created, 5);
    } finally {
      delete process.env.CAMPAIGN_BATCH_SIZE;
    }
  });
});
