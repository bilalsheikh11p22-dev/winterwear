import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../app.js';
import aiProvider from '../services/ai/aiProvider.js';
import { parseNaturalLanguageQuery } from '../services/ai/groundedSearchService.js';
import { AI_TOOLS } from '../services/ai/aiTools.js';

test('Phase 7 — Grounded AI Shopping Assistant, Safe Tools & BI Security Suite', async (t) => {
  await t.test('AI Provider abstraction safely operates in fallback mode without external API keys', () => {
    assert.equal(aiProvider.getProviderName(), 'deterministic_fallback');
    assert.equal(aiProvider.isConfigured(), false);
  });

  await t.test('Natural language query parser accurately extracts budget, size, and category intent', () => {
    const query = 'Find me a warm black coat under PKR 25,000 in size M';
    const parsed = parseNaturalLanguageQuery(query);

    assert.equal(parsed.maxPrice, 25000);
    assert.equal(parsed.size, 'M');
    assert.equal(parsed.color, 'black');
    assert.equal(parsed.categorySlug, 'coats');
  });

  await t.test('Natural language parser handles price ranges correctly', () => {
    const query = 'Looking for jackets between 10,000 and 20,000';
    const parsed = parseNaturalLanguageQuery(query);

    assert.equal(parsed.minPrice, 10000);
    assert.equal(parsed.maxPrice, 20000);
  });

  await t.test('Public Shipping Policy tool returns verified rates from environment', async () => {
    const policy = await AI_TOOLS.getPublicShippingPolicy();
    assert.equal(policy.success, true);
    assert.equal(policy.currency, 'PKR');
    assert.equal(typeof policy.freeShippingThreshold, 'number');
    assert.equal(policy.freeShippingThreshold >= 1000, true);
  });

  await t.test('Public Return Policy tool returns verified 14-day window', async () => {
    const policy = await AI_TOOLS.getPublicReturnPolicy();
    assert.equal(policy.success, true);
    assert.equal(policy.returnWindowDays, 14);
    assert.equal(Array.isArray(policy.conditionRequirements), true);
  });

  await t.test('Public Sizing Guide tool returns standard European measurements', async () => {
    const guide = await AI_TOOLS.getPublicSizeGuide();
    assert.equal(guide.success, true);
    assert.ok(guide.sizes.M);
    assert.ok(guide.sizes.M.chestInches);
  });

  await t.test('POST /api/v1/ai/chat returns grounded assistant reply and session ID', async () => {
    const res = await request(app)
      .post('/api/v1/ai/chat')
      .send({ message: 'What is your shipping policy for Lahore?' });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.reply);
    assert.ok(res.body.data.sessionId);
    assert.equal(res.body.data.provider, 'deterministic_fallback');
  });

  await t.test('POST /api/v1/ai/chat rejects empty payload with 400', async () => {
    const res = await request(app).post('/api/v1/ai/chat').send({ message: '' });
    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });

  await t.test('POST /api/v1/ai/product-comparison rejects fewer than 2 products with 400', async () => {
    const res = await request(app)
      .post('/api/v1/ai/product-comparison')
      .send({ productIds: ['60c72b2f9b1d8b2bad000001'] });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });

  await t.test('POST /api/v1/admin/analytics/business-insights rejects unauthenticated request with 401', async () => {
    const res = await request(app)
      .post('/api/v1/admin/analytics/business-insights')
      .send({ query: 'Analyze sales velocity' });

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
  });

  await t.test('GET /api/v1/admin/analytics/inventory rejects unauthenticated request with 401', async () => {
    const res = await request(app).get('/api/v1/admin/analytics/inventory');
    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
  });

  await t.test('POST /api/v1/ai/track-event records valid analytics touchpoint', async () => {
    const res = await request(app)
      .post('/api/v1/ai/track-event')
      .send({
        eventType: 'product_view',
        couponCode: 'WINTER10',
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.eventId);
  });
});
