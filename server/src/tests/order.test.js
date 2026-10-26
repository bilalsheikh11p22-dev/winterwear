import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../app.js';
import { checkoutSchema, orderStatusTransitionSchema } from '../validators/orderValidators.js';

describe('Order & Checkout Validation', () => {
  it('POST /api/v1/orders requires authentication', async () => {
    const res = await request(app).post('/api/v1/orders').send({
      items: [{ productId: '60c72b2f9b1d8b2bad000001', quantity: 1, size: 'M', color: 'Black' }],
      paymentMethod: 'COD',
    });
    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.equal(res.body.code, 'UNAUTHORIZED');
  });

  it('POST /api/v1/coupons/validate rejects request missing subtotal', async () => {
    const res = await request(app).post('/api/v1/coupons/validate').send({
      code: 'WINTER20',
    });
    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.code, 'VALIDATION_ERROR');
  });

  it('checkoutSchema rejects payload with invalid payment method', async () => {
    const invalidPayload = {
      body: {
        paymentMethod: 'Cryptocurrency',
      },
    };
    const result = checkoutSchema.safeParse(invalidPayload);
    assert.equal(result.success, false);
  });

  it('orderStatusTransitionSchema accepts valid order status', async () => {
    const validPayload = {
      body: {
        status: 'confirmed',
        comment: 'Payment verified',
      },
    };
    const result = orderStatusTransitionSchema.safeParse(validPayload);
    assert.equal(result.success, true);
  });

  it('orderStatusTransitionSchema rejects arbitrary invalid status', async () => {
    const invalidPayload = {
      body: {
        status: 'shipped_via_rocket',
      },
    };
    const result = orderStatusTransitionSchema.safeParse(invalidPayload);
    assert.equal(result.success, false);
  });
});
