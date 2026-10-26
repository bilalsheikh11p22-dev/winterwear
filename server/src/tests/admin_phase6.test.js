import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../app.js';

test('Phase 6 — Admin Analytics, Inventory & RBAC Security Suite', async (t) => {
  await t.test('GET /api/v1/admin/analytics/dashboard rejects unauthenticated requests with 401', async () => {
    const res = await request(app).get('/api/v1/admin/analytics/dashboard');
    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
  });

  await t.test('POST /api/v1/admin/staff rejects unauthenticated requests with 401', async () => {
    const res = await request(app)
      .post('/api/v1/admin/staff')
      .send({
        name: 'Warehouse Ops',
        email: 'ops@winterwear.pk',
        role: 'warehouse_staff',
        password: 'Password123!',
      });
    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
  });

  await t.test('GET /api/v1/admin/audit-logs rejects unauthenticated requests with 401', async () => {
    const res = await request(app).get('/api/v1/admin/audit-logs');
    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
  });

  await t.test('GET /api/v1/admin/returns rejects unauthenticated requests with 401', async () => {
    const res = await request(app).get('/api/v1/admin/returns');
    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
  });

  await t.test('PATCH /api/v1/admin/returns/60c72b2f9b1d8b2bad000001/review rejects unauthenticated requests with 401', async () => {
    const res = await request(app)
      .patch('/api/v1/admin/returns/60c72b2f9b1d8b2bad000001/review')
      .send({ status: 'approved_for_return' });
    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
  });

  await t.test('GET /api/v1/admin/finance/reconciliation rejects unauthenticated requests with 401', async () => {
    const res = await request(app).get('/api/v1/admin/finance/reconciliation');
    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
  });

  await t.test('POST /api/v1/admin/finance/reconcile-cod rejects unauthenticated requests with 401', async () => {
    const res = await request(app)
      .post('/api/v1/admin/finance/reconcile-cod')
      .send({ orderIds: ['60c72b2f9b1d8b2bad000001'] });
    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
  });

  await t.test('PATCH /api/v1/admin/orders/60c72b2f9b1d8b2bad000001/assign-rider rejects unauthenticated requests with 401', async () => {
    const res = await request(app)
      .patch('/api/v1/admin/orders/60c72b2f9b1d8b2bad000001/assign-rider')
      .send({ riderId: '60c72b2f9b1d8b2bad000002' });
    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
  });

  await t.test('POST /api/v1/inventory/warehouses rejects unauthenticated requests with 401', async () => {
    const res = await request(app)
      .post('/api/v1/inventory/warehouses')
      .send({
        name: 'Karachi Hub',
        code: 'WH-KHI-01',
        location: { city: 'Karachi', address: 'Clifton Block 4' },
      });
    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
  });
});
