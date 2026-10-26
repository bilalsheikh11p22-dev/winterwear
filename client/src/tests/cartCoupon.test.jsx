import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';

const api = vi.hoisted(() => ({
  cartApi: { getCart: vi.fn(), addToCart: vi.fn(), updateItem: vi.fn(), removeItem: vi.fn(), clearCart: vi.fn() },
  couponApi: { validate: vi.fn(), validateCoupon: vi.fn() },
  resolveProductId: vi.fn(async (i) => i.productId),
  resolveCartItems: vi.fn(async (items) => items.map((i) => ({ ...i, productId: 'p'.repeat(24) }))),
}));
vi.mock('../services/api', () => api);

import { CartProvider, useCart } from '../context/CartContext';

let ctx;
const Grab = () => { ctx = useCart(); return <span data-testid="d">{ctx.discountAmount}|{ctx.shippingFee}|{ctx.couponCode}</span>; };

const seed = () => localStorage.setItem('winterwear_cart', JSON.stringify([{ key: 'k', productId: 'p'.repeat(24), name: 'Parka', price: 3000, quantity: 1, size: 'M', color: { name: 'Black', hex: '#000' } }]));

describe('Cart coupons use ONLY the server', () => {
  beforeEach(() => {
    localStorage.clear(); seed();
    Object.values(api.couponApi).forEach((f) => f.mockReset());
    api.cartApi.getCart.mockRejectedValue(new Error('offline'));
  });

  it('a rejected coupon grants NO discount — the old hard-coded WINTER20 / LUXURY10 fallbacks are gone', async () => {
    api.couponApi.validate.mockRejectedValue({ response: { status: 400, data: { message: 'Coupon "WINTER20" has expired.' } } });
    render(<CartProvider><Grab /></CartProvider>);
    let res;
    await act(async () => { res = await ctx.applyCoupon('winter20'); });
    expect(res.success).toBe(false);
    expect(res.message).toMatch(/expired/);
    expect(ctx.discountAmount).toBe(0);
    expect(ctx.couponCode).toBe('');
  });

  it('a server outage also grants no discount (no offline fallback) and says why', async () => {
    api.couponApi.validate.mockRejectedValue({ request: {} });
    render(<CartProvider><Grab /></CartProvider>);
    let res;
    await act(async () => { res = await ctx.applyCoupon('LUXURY10'); });
    expect(res.success).toBe(false);
    expect(res.message).toMatch(/couldn.t reach the server/i);
    expect(ctx.discountAmount).toBe(0);
  });

  it('sends cart items (not a client-computed amount) and uses the amount the server returns', async () => {
    api.couponApi.validate.mockResolvedValue({ data: { data: { code: 'WINTER10', discountAmount: 300, freeShipping: false } } });
    render(<CartProvider><Grab /></CartProvider>);
    await act(async () => { await ctx.applyCoupon('winter10'); });
    expect(api.couponApi.validate).toHaveBeenCalledWith('WINTER10', [{ productId: 'p'.repeat(24), quantity: 1 }]);
    expect(ctx.discountAmount).toBe(300);
    expect(ctx.couponCode).toBe('WINTER10');
    expect(ctx.totalAmount).toBe(3000 - 300 + 250);
  });

  it('free-shipping coupons waive the shipping fee', async () => {
    api.couponApi.validate.mockResolvedValue({ data: { data: { code: 'SHIPFREE', discountAmount: 0, freeShipping: true } } });
    render(<CartProvider><Grab /></CartProvider>);
    await act(async () => { await ctx.applyCoupon('SHIPFREE'); });
    expect(ctx.shippingFee).toBe(0);
    expect(ctx.totalAmount).toBe(3000);
  });

  it('when the cart changes and the coupon stops applying, it is removed with an explanation', async () => {
    api.couponApi.validate.mockResolvedValueOnce({ data: { data: { code: 'BIG', discountAmount: 300, freeShipping: false } } });
    render(<CartProvider><Grab /></CartProvider>);
    await act(async () => { await ctx.applyCoupon('BIG'); });
    api.couponApi.validate.mockRejectedValue({ response: { status: 400, data: { message: 'Add PKR 2,000 more to use "BIG".' } } });
    await act(async () => { await ctx.updateQuantity?.('k', 2); });
    await waitFor(() => expect(ctx.couponCode).toBe(''), { timeout: 3000 });
    expect(ctx.discountAmount).toBe(0);
    expect(ctx.couponNotice).toMatch(/Add PKR 2,000 more/);
  });
});
