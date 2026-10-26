import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';

const h = vi.hoisted(() => {
  const listeners = {};
  const socket = {
    connected: false,
    on: vi.fn((e, fn) => { (listeners[e] ||= new Set()).add(fn); }),
    off: vi.fn((e, fn) => { listeners[e]?.delete(fn); }),
  };
  return {
    listeners, socket,
    emit: (e, p) => [...(listeners[e] || [])].forEach((fn) => fn(p)),
    count: (e) => (listeners[e] ? listeners[e].size : 0),
    acquire: vi.fn(() => socket),
    release: vi.fn(),
    auth: { value: { user: { _id: 'u1' }, isAuthenticated: true } },
    api: {
      list: vi.fn(), markRead: vi.fn(), markAllRead: vi.fn(), dismiss: vi.fn(), click: vi.fn(),
    },
  };
});

vi.mock('../services/socket', () => ({ acquireSocket: h.acquire, releaseSocket: h.release }));
vi.mock('../services/api', () => ({ notificationApi: h.api }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => h.auth.value }));

import { NotificationProvider, useNotificationContext } from '../context/NotificationContext';

const n = (id, over = {}) => ({ _id: id, title: `T${id}`, message: 'm', isRead: false, createdAt: new Date().toISOString(), ...over });
const listRes = (items, unread) => ({ data: { data: { items, unreadCount: unread }, meta: { total: items.length } } });

const Probe = () => {
  const c = useNotificationContext();
  return (
    <div>
      <span data-testid="count">{c.unreadCount}</span>
      <span data-testid="ids">{c.items.map((i) => i._id).join(',')}</span>
      <span data-testid="connected">{String(c.connected)}</span>
      <span data-testid="error">{c.error}</span>
      <button onClick={() => c.markRead('a').catch(() => {})}>read</button>
    </div>
  );
};
const mount = () => render(<NotificationProvider><Probe /></NotificationProvider>);

describe('NotificationProvider (Socket.IO + REST)', () => {
  beforeEach(() => {
    Object.keys(h.listeners).forEach((k) => delete h.listeners[k]);
    h.socket.connected = false;
    h.acquire.mockClear(); h.release.mockClear();
    Object.values(h.api).forEach((f) => f.mockReset());
    h.api.list.mockResolvedValue(listRes([n('a'), n('b')], 2));
    h.auth.value = { user: { _id: 'u1' }, isAuthenticated: true };
  });

  it('loads the real unread count + recent items from the API on sign-in', async () => {
    mount();
    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('2'));
    expect(screen.getByTestId('ids')).toHaveTextContent('a,b');
    expect(h.api.list).toHaveBeenCalledWith(expect.objectContaining({ page: 1 }));
  });

  it('prepends real-time notifications once (duplicates from a replay are ignored) and trusts the server count', async () => {
    mount();
    await waitFor(() => expect(screen.getByTestId('ids')).toHaveTextContent('a,b'));
    act(() => h.emit('notification:created', n('c')));
    act(() => h.emit('notification:created', n('c')));
    act(() => h.emit('notification:unread-count', { unreadCount: 3 }));
    expect(screen.getByTestId('ids')).toHaveTextContent('c,a,b');
    expect(screen.getByTestId('count')).toHaveTextContent('3');
  });

  it('read / dismissed events from another tab or device update this tab', async () => {
    mount();
    await waitFor(() => expect(screen.getByTestId('ids')).toHaveTextContent('a,b'));
    act(() => h.emit('notification:dismissed', { id: 'a' }));
    expect(screen.getByTestId('ids')).toHaveTextContent(/^b$/);
    act(() => h.emit('notification:unread-count', { unreadCount: 1 }));
    expect(screen.getByTestId('count')).toHaveTextContent('1');
  });

  it('reconnect re-syncs from the API (no reliance on missed socket events)', async () => {
    mount();
    await waitFor(() => expect(h.api.list).toHaveBeenCalledTimes(1));
    h.api.list.mockResolvedValue(listRes([n('x'), n('a'), n('b')], 3));
    act(() => { h.socket.connected = true; h.emit('connect'); });
    await waitFor(() => expect(screen.getByTestId('ids')).toHaveTextContent('x,a,b'));
    expect(screen.getByTestId('connected')).toHaveTextContent('true');
    act(() => h.emit('disconnect'));
    expect(screen.getByTestId('connected')).toHaveTextContent('false');
  });

  it('registers exactly one set of listeners and removes them all on unmount (no duplicates after remounts)', async () => {
    const first = mount();
    await waitFor(() => expect(h.count('notification:created')).toBe(1));
    first.unmount();
    expect(h.count('notification:created')).toBe(0);
    expect(h.count('notification:unread-count')).toBe(0);
    expect(h.count('connect')).toBe(0);
    expect(h.release).toHaveBeenCalledTimes(1);

    mount();
    await waitFor(() => expect(h.count('notification:created')).toBe(1));
    act(() => h.emit('notification:created', n('z')));
    expect(screen.getByTestId('ids').textContent.split(',').filter((i) => i === 'z')).toHaveLength(1);
  });

  it('does nothing while signed out, and tears down on sign-out', async () => {
    h.auth.value = { user: null, isAuthenticated: false };
    const view = mount();
    expect(h.acquire).not.toHaveBeenCalled();
    expect(h.api.list).not.toHaveBeenCalled();

    h.auth.value = { user: { _id: 'u1' }, isAuthenticated: true };
    view.rerender(<NotificationProvider><Probe /></NotificationProvider>);
    await waitFor(() => expect(h.acquire).toHaveBeenCalledTimes(1));
    h.auth.value = { user: null, isAuthenticated: false };
    view.rerender(<NotificationProvider><Probe /></NotificationProvider>);
    await waitFor(() => expect(screen.getByTestId('ids')).toHaveTextContent(/^$/));
    expect(screen.getByTestId('count')).toHaveTextContent('0');
    expect(h.release).toHaveBeenCalled();
  });

  it('API failure surfaces an error message (and keeps previously loaded data)', async () => {
    h.api.list.mockRejectedValue({ request: {}, response: undefined });
    mount();
    await waitFor(() => expect(screen.getByTestId('error')).toHaveTextContent(/network error/i));
  });

  it('marking read is optimistic, then confirmed by the server count; failures roll back to server truth', async () => {
    h.api.markRead.mockResolvedValue({ data: { data: { unreadCount: 1 } } });
    mount();
    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('2'));
    await act(async () => { screen.getByText('read').click(); });
    expect(h.api.markRead).toHaveBeenCalledWith('a');
    expect(screen.getByTestId('count')).toHaveTextContent('1');

    h.api.markRead.mockRejectedValue(new Error('boom'));
    h.api.list.mockResolvedValue(listRes([n('a'), n('b')], 2));
    await act(async () => { screen.getByText('read').click(); });
    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('2'));
  });
});
