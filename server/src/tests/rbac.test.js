import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../app.js';
import { authorize } from '../middleware/authorize.js';

describe('RBAC Authorization Middleware & Unauthenticated Endpoints', () => {
  it('authorize middleware calls next() when user has permitted role', () => {
    let nextCalled = false;
    const req = { user: { role: 'admin' } };
    const res = {};
    const middleware = authorize(['admin', 'super_admin']);

    middleware(req, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, true);
  });

  it('authorize middleware allows super_admin regardless of allowed list', () => {
    let nextCalled = false;
    const req = { user: { role: 'super_admin' } };
    const res = {};
    const middleware = authorize(['rider']);

    middleware(req, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, true);
  });

  it('authorize middleware returns 403 with FORBIDDEN_ROLE when user role is not permitted', () => {
    let statusSet = null;
    let jsonResponse = null;
    const req = { user: { role: 'customer' } };
    const res = {
      status(s) {
        statusSet = s;
        return this;
      },
      json(data) {
        jsonResponse = data;
        return this;
      },
    };
    const middleware = authorize(['admin', 'finance']);

    middleware(req, res, () => {});

    assert.equal(statusSet, 403);
    assert.equal(jsonResponse.success, false);
    assert.equal(jsonResponse.code, 'FORBIDDEN_ROLE');
  });

  it('Unauthenticated requests to admin users list return 401', async () => {
    const res = await request(app).get('/api/v1/admin/users');
    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.equal(res.body.code, 'UNAUTHORIZED');
  });

  it('Unauthenticated requests to inventory endpoints return 401', async () => {
    const res = await request(app).get('/api/v1/inventory');
    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.equal(res.body.code, 'UNAUTHORIZED');
  });

  it('Unauthenticated requests to rider deliveries return 401', async () => {
    const res = await request(app).get('/api/v1/riders/deliveries');
    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.equal(res.body.code, 'UNAUTHORIZED');
  });
});
