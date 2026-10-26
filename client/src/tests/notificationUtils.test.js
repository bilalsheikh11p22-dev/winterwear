import { describe, it, expect } from 'vitest';
import { safeInternalPath, safeImageUrl, relativeTime, resolveActionUrl } from '../utils/notifications';

describe('safeInternalPath (open-redirect / script-URL protection)', () => {
  it.each(['/my-orders/123', '/product/alpine-jacket', '/shop?sort=newest', '/notifications?tab=settings'])('allows %s', (p) => expect(safeInternalPath(p)).toBe(p));
  it.each(['https://evil.test', 'http://evil.test/x', '//evil.test', 'javascript:alert(1)', 'data:text/html,<script>', '/ok\\evil', '', null, undefined, 42, '/a b'])('rejects %j', (p) => expect(safeInternalPath(p)).toBeNull());
  it('rejects overly long paths', () => expect(safeInternalPath(`/${'a'.repeat(400)}`)).toBeNull());
});

describe('resolveActionUrl', () => {
  it('uses a safe actionUrl, ignores an unsafe one, and falls back for legacy rows', () => {
    expect(resolveActionUrl({ actionUrl: '/my-orders/1', type: 'delivered' })).toBe('/my-orders/1');
    expect(resolveActionUrl({ actionUrl: 'https://evil.test', type: 'delivered' })).toBeNull();
    expect(resolveActionUrl({ actionUrl: '', type: 'rider_assigned' })).toBe('/rider');
    expect(resolveActionUrl({ actionUrl: '', type: 'delivered' })).toBeNull();
  });
});

describe('safeImageUrl', () => {
  it('only renders https images', () => {
    expect(safeImageUrl('https://res.cloudinary.com/x/a.jpg')).toBe('https://res.cloudinary.com/x/a.jpg');
    expect(safeImageUrl('http://x/a.jpg')).toBeNull();
    expect(safeImageUrl('javascript:alert(1)')).toBeNull();
    expect(safeImageUrl('')).toBeNull();
  });
});

describe('relativeTime', () => {
  const now = new Date('2026-10-22T12:00:00Z').getTime();
  const ago = (ms) => new Date(now - ms).toISOString();
  it('formats human friendly timestamps', () => {
    expect(relativeTime(ago(10 * 1000), now)).toBe('just now');
    expect(relativeTime(ago(2 * 60 * 1000), now)).toBe('2 minutes ago');
    expect(relativeTime(ago(60 * 1000), now)).toBe('1 minute ago');
    expect(relativeTime(ago(3 * 3600 * 1000), now)).toBe('3 hours ago');
    expect(relativeTime(ago(86400 * 1000), now)).toBe('yesterday');
    expect(relativeTime(ago(5 * 86400 * 1000), now)).toBe('5 days ago');
  });
  it('tolerates bad input', () => expect(relativeTime('nonsense', now)).toBe(''));
});
