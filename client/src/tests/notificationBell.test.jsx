import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const state = vi.hoisted(() => ({ value: null }));
vi.mock('../hooks/useNotifications', () => ({ useNotifications: () => state.value, default: () => state.value }));
const navigateMock = vi.hoisted(() => vi.fn());
vi.mock('react-router-dom', async (orig) => ({ ...(await orig()), useNavigate: () => navigateMock }));

import NotificationBell from '../components/common/NotificationBell';

const mk = (over = {}) => ({
  _id: 'n1', type: 'order_placed', category: 'orders', title: 'Order placed', message: 'Your order #WW-1 has been placed.',
  isRead: false, priority: 'normal', createdAt: new Date(Date.now() - 2 * 60000).toISOString(), data: {}, actionUrl: '/my-orders/1', ...over,
});

const base = () => ({
  notifications: [], unreadCount: 0, loading: false, error: '', connected: true,
  refresh: vi.fn(), markRead: vi.fn(), markAllRead: vi.fn().mockResolvedValue(), dismiss: vi.fn().mockResolvedValue(), openNotification: vi.fn().mockResolvedValue(),
});

const setup = (over = {}) => {
  state.value = { ...base(), ...over };
  render(<MemoryRouter><NotificationBell /></MemoryRouter>);
  return state.value;
};

describe('NotificationBell', () => {
  beforeEach(() => { navigateMock.mockClear(); });

  it('shows the real unread count (capped at 99+) and an accessible label', () => {
    setup({ unreadCount: 3 });
    expect(screen.getByRole('button', { name: /3 unread/i })).toBeInTheDocument();
    expect(screen.getByText('3', { selector: 'span[aria-hidden]' })).toBeInTheDocument();
  });

  it('caps the badge at 99+', () => {
    setup({ unreadCount: 250 });
    expect(screen.getByText('99+')).toBeInTheDocument();
  });

  it('shows no badge when nothing is unread', () => {
    setup({ unreadCount: 0 });
    expect(screen.queryByText('0', { selector: 'span[aria-hidden]' })).toBeNull();
  });

  it('OPENING the dropdown does not mark anything as read', async () => {
    const h = setup({ notifications: [mk(), mk({ _id: 'n2' })], unreadCount: 2 });
    await userEvent.click(screen.getByRole('button', { name: /notifications/i }));
    expect(screen.getByRole('dialog', { name: 'Notifications' })).toBeInTheDocument();
    expect(h.markRead).not.toHaveBeenCalled();
    expect(h.markAllRead).not.toHaveBeenCalled();
    expect(h.openNotification).not.toHaveBeenCalled();
  });

  it('clicking a notification records the open, then navigates to its safe link', async () => {
    const h = setup({ notifications: [mk()], unreadCount: 1 });
    await userEvent.click(screen.getByRole('button', { name: /notifications/i }));
    await userEvent.click(screen.getByRole('button', { name: /^Unread\. Order placed/ }));
    expect(h.openNotification).toHaveBeenCalledWith(expect.objectContaining({ _id: 'n1' }));
    expect(navigateMock).toHaveBeenCalledWith('/my-orders/1');
  });

  it('never navigates to an unsafe external link', async () => {
    const h = setup({ notifications: [mk({ actionUrl: 'https://evil.test/phish' })], unreadCount: 1 });
    await userEvent.click(screen.getByRole('button', { name: /notifications/i }));
    await userEvent.click(screen.getByRole('button', { name: /^Unread\. Order placed/ }));
    expect(h.openNotification).toHaveBeenCalled();
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('renders notification text as plain text, never as HTML', async () => {
    setup({ notifications: [mk({ title: '<img src=x onerror=alert(1)>', message: '<script>alert(1)</script>' })], unreadCount: 1 });
    await userEvent.click(screen.getByRole('button', { name: /notifications/i }));
    const dialog = screen.getByRole('dialog');
    expect(dialog.querySelector('script')).toBeNull();
    expect(dialog.querySelector('img[src="x"]')).toBeNull();
    expect(within(dialog).getByText('<script>alert(1)</script>')).toBeInTheDocument();
  });

  it('mark all read, dismiss, relative timestamps and coupon copy are available', async () => {
    const h = setup({ notifications: [mk({ type: 'coupon_announced', category: 'discounts', title: 'Winter special', data: { couponCode: 'WELCOME15' } })], unreadCount: 1 });
    await userEvent.click(screen.getByRole('button', { name: /notifications/i }));
    expect(screen.getByText('2 minutes ago')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Copy coupon code WELCOME15/ })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Mark all read/ }));
    expect(h.markAllRead).toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: /Dismiss notification/ }));
    expect(h.dismiss).toHaveBeenCalledWith('n1');
  });

  it('loading, empty and error states (with retry)', async () => {
    setup({ loading: true });
    await userEvent.click(screen.getByRole('button', { name: /notifications/i }));
    expect(document.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
  });

  it('empty state', async () => {
    setup();
    await userEvent.click(screen.getByRole('button', { name: /notifications/i }));
    expect(screen.getByText(/all caught up/i)).toBeInTheDocument();
  });

  it('error state offers a working retry', async () => {
    const h = setup({ error: 'Network error. Check your connection and retry.' });
    await userEvent.click(screen.getByRole('button', { name: /notifications/i }));
    expect(screen.getByRole('alert')).toHaveTextContent(/couldn.t load/i);
    h.refresh.mockClear();
    await userEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(h.refresh).toHaveBeenCalled();
  });

  it('keyboard: Escape closes and returns focus to the bell; arrow keys move between items', async () => {
    setup({ notifications: [mk(), mk({ _id: 'n2', title: 'Second' })], unreadCount: 2 });
    const bell = screen.getByRole('button', { name: /notifications/i });
    await userEvent.click(bell);
    const items = document.querySelectorAll('[data-nitem]');
    items[0].focus();
    await userEvent.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(items[1]);
    await userEvent.keyboard('{ArrowUp}');
    expect(document.activeElement).toBe(items[0]);
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(bell);
  });

  it('exposes aria state and links to the full history page', async () => {
    setup();
    const bell = screen.getByRole('button', { name: /notifications/i });
    expect(bell).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(bell);
    expect(bell).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('link', { name: /view all notifications/i })).toHaveAttribute('href', '/notifications');
  });
});
