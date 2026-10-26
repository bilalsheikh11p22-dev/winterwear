import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../app.js';

describe('Phase 5 — Checkout, Payments & Order Management', () => {
  it('POST /api/v1/checkout/validate rejects request with empty items', async () => {
    const res = await request(app).post('/api/v1/checkout/validate').send({
      items: [],
    });
    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });

  it('POST /api/v1/checkout/create-order requires authentication', async () => {
    const res = await request(app).post('/api/v1/checkout/create-order').send({
      items: [{ productId: '60c72b2f9b1d8b2bad000001', quantity: 1, size: 'M', color: 'Black' }],
      paymentMethod: 'COD',
    });
    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.equal(res.body.code, 'UNAUTHORIZED');
  });

  it('POST /api/v1/payments/create-session requires authentication', async () => {
    const res = await request(app).post('/api/v1/payments/create-session').send({
      orderId: '60c72b2f9b1d8b2bad000001',
      provider: 'stripe',
    });
    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
  });

  it('GET /api/v1/payments/:id/status requires authentication', async () => {
    const res = await request(app).get('/api/v1/payments/60c72b2f9b1d8b2bad000001/status');
    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
  });

  it('POST /api/v1/payments/:id/refund requires authentication', async () => {
    const res = await request(app).post('/api/v1/payments/60c72b2f9b1d8b2bad000001/refund').send({
      reason: 'Defective item',
    });
    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
  });

  it('POST /api/v1/orders/:id/cancel requires authentication', async () => {
    const res = await request(app).post('/api/v1/orders/60c72b2f9b1d8b2bad000001/cancel').send({
      reason: 'Ordered wrong size',
    });
    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
  });

  it('POST /api/v1/orders/:id/return-request requires authentication', async () => {
    const res = await request(app).post('/api/v1/orders/60c72b2f9b1d8b2bad000001/return-request').send({
      reason: 'Fit was too loose',
    });
    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
  });

  it('GET /api/v1/admin/orders requires staff authentication', async () => {
    const res = await request(app).get('/api/v1/admin/orders');
    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
  });

  it('POST /api/v1/webhooks/safepay rejects missing signature with 400 or 500 when unconfigured', async () => {
    const res = await request(app)
      .post('/api/v1/webhooks/safepay')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ event: 'test' }));
    assert.ok(res.status === 400 || res.status === 500);
  });
});
