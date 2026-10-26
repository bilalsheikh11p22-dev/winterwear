import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../app.js';

describe('WinterWear API Core & Health Check', () => {
  it('GET /api/health should return online status and version', async () => {
    const res = await request(app).get('/api/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.status, 'online');
    assert.equal(res.body.version, '1.0.0');
  });

  it('GET /non-existent-endpoint should return 404 with standard error structure', async () => {
    const res = await request(app).get('/api/v1/non-existent-route-999');
    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
    assert.equal(res.body.code, 'NOT_FOUND');
  });

  it('GET /api/docs should serve Swagger UI documentation', async () => {
    const res = await request(app).get('/api/docs/');
    assert.equal(res.status, 200);
    assert.match(res.text, /swagger/i);
  });
});
