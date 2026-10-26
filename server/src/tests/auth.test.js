import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../app.js';

describe('Authentication & Validation Logic', () => {
  it('POST /api/v1/auth/register rejects empty payload with 400 validation error', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({});
    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.code, 'VALIDATION_ERROR');
    assert.ok(Array.isArray(res.body.errors));
  });

  it('POST /api/v1/auth/register rejects weak password lacking uppercase/digit', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      name: 'Test Customer',
      email: 'customer@test.com',
      password: 'weakpassword',
    });
    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.code, 'VALIDATION_ERROR');
  });

  it('POST /api/v1/auth/login rejects request missing password', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'customer@test.com',
    });
    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.code, 'VALIDATION_ERROR');
  });

  it('GET /api/v1/auth/me rejects unauthenticated request with 401', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.equal(res.body.code, 'UNAUTHORIZED');
  });
});
