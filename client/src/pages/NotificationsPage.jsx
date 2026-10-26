import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Bell, CheckCheck, ChevronLeft, ChevronRight, RefreshCw, Settings, Ticket } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotificationContext } from '../context/NotificationContext';
import { notificationApi } from '../services/api';
import NotificationItem from '../components/notifications/NotificationItem';
import NotificationSettingsPanel from '../components/notifications/NotificationSettingsPanel';
import CouponList from '../components/notifications/CouponList';
import { FILTER_TABS, apiMessage } from '../utils/notifications';

const PAGE_SIZE = 15;

const TABS = [
  { key: 'list', label: 'Notifications', Icon: Bell },
  { key: 'offers', label: 'Offers', Icon: Ticket },
  { key: 'settings', label: 'Settings', Icon: Settings },
];

const NotificationsPage = () => {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { subscribeEvents, markAllRead, dismiss, openNotification, unreadCount } = useNotificationContext();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = TABS.some((t) => t.key === params.get('tab')) ? params.get('tab') : 'list';
  const filter = FILTER_TABS.some((f) => f.key === params.get('filter')) ? params.get('filter') : 'all';
  const page = Math.max(1, parseInt(params.get('page'), 10) || 1);

  const [data, setData] = useState({ items: [], total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const reqId = useRef(0);

  const load = useCallback(async ({ silent = false } = {}) => {
    const id = ++reqId.current;
    if (!silent) setLoading(true);
    setError('');
    try {
      const res = await notificationApi.list({ page, limit: PAGE_SIZE, filter });
      if (id !== reqId.current) return; // a newer request superseded this one
      setData({ items: res.data.data.items, total: res.data.meta.total, pages: res.data.meta.pages });
    } catch (err) {
      if (id === reqId.current) setError(apiMessage(err, 'Could not load notifications.'));
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }, [page, filter]);

  useEffect(() => { if (isAuthenticated && tab === 'list') load(); }, [isAuthenticated, tab, load]);

  // Live updates: new/read/dismissed events refresh the current page quietly.
  useEffect(() => subscribeEvents(() => { if (tab === 'list') load({ silent: true }); }), [subscribeEvents, tab, load]);

  // If the last item on a page is dismissed, step back a page.
  useEffect(() => { if (!loading && page > data.pages) setParams({ tab, filter, page: String(data.pages) }, { replace: true }); }, [loading, page, data.pages, tab, filter, setParams]);

  if (authLoading) return <main className="min-h-screen bg-charcoal" aria-busy="true" />;
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: '/notifications' }} replace />;

  const set = (next) => setParams({ tab, filter, page: '1', ...next }, { replace: false });

  const guard = async (fn, msg) => { setActionError(''); try { await fn(); } catch { setActionError(msg); } };
  const onOpen = async (n, url) => { await openNotification(n); if (url) navigate(url); else load({ silent: true }); };

  return (
    <main className="min-h-screen bg-charcoal pb-24 pt-28 text-snow">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-ice">Your account</p>
            <h1 className="mt-1 font-display text-3xl">Notifications</h1>
          </div>
          {tab === 'list' && (
            <button type="button" disabled={unreadCount === 0} onClick={() => guard(() => markAllRead(filter === 'unread' ? 'all' : filter).then(() => load({ silent: true })), 'Could not mark all as read.')}
              className="inline-flex items-center gap-2 border border-white/20 px-4 py-2 text-xs uppercase tracking-widest hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ice">
              <CheckCheck className="h-4 w-4" aria-hidden /> Mark all read
            </button>
          )}
        </header>

        <div role="tablist" aria-label="Notification sections" className="mb-6 flex gap-1 border-b border-white/10">
          {TABS.map(({ key, label, Icon }) => (
            <button key={key} role="tab" aria-selected={tab === key} type="button" onClick={() => setParams({ tab: key })}
              className={`-mb-px inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ice ${tab === key ? 'border-burgundy-light text-snow' : 'border-transparent text-silver hover:text-snow'}`}>
              <Icon className="h-4 w-4" aria-hidden /> {label}
            </button>
          ))}
        </div>

        {tab === 'settings' && <NotificationSettingsPanel />}
        {tab === 'offers' && <CouponList title="Your offers" />}

        {tab === 'list' && (
          <>
            <div role="tablist" aria-label="Filter notifications" className="mb-4 flex flex-wrap gap-2">
              {FILTER_TABS.map((f) => (
                <button key={f.key} role="tab" aria-selected={filter === f.key} type="button" onClick={() => set({ filter: f.key })}
                  className={`rounded-full border px-3.5 py-1.5 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-ice ${filter === f.key ? 'border-burgundy-light bg-burgundy text-snow' : 'border-white/15 text-silver hover:text-snow'}`}>
                  {f.label}{f.key === 'unread' && unreadCount > 0 ? ` (${unreadCount})` : ''}
                </button>
              ))}
            </div>

            {actionError && <p role="alert" className="mb-3 rounded border border-red-400/30 bg-red-400/10 px-4 py-2 text-sm text-red-100">{actionError}</p>}

            <div className="overflow-hidden rounded-lg border border-white/10 bg-[#1E2125]" aria-busy={loading}>
              {loading ? (
                <ul aria-label="Loading notifications">{[0, 1, 2, 3, 4].map((i) => (
                  <li key={i} className="flex gap-3 border-b border-white/5 px-4 py-4 last:border-0"><div className="h-9 w-9 animate-pulse rounded-full bg-white/10 motion-reduce:animate-none" /><div className="flex-1 space-y-2"><div className="h-3 w-1/2 animate-pulse rounded bg-white/10 motion-reduce:animate-none" /><div className="h-3 w-3/4 animate-pulse rounded bg-white/5 motion-reduce:animate-none" /></div></li>
                ))}</ul>
              ) : error ? (
                <div role="alert" className="px-6 py-14 text-center">
                  <p className="text-sm">{error}</p>
                  <button type="button" onClick={() => load()} className="mt-4 inline-flex items-center gap-2 border border-white/20 px-4 py-2 text-xs uppercase tracking-widest hover:bg-white/10"><RefreshCw className="h-3.5 w-3.5" aria-hidden /> Retry</button>
                </div>
              ) : data.items.length === 0 ? (
                <div className="px-6 py-16 text-center">
                  <Bell className="mx-auto h-9 w-9 text-silver/40" aria-hidden />
                  <p className="mt-3 text-sm">{filter === 'unread' ? 'No unread notifications' : filter === 'all' ? 'Nothing here yet' : `No ${filter} notifications`}</p>
                  <p className="mt-1 text-xs text-silver">We’ll let you know when something happens with your orders, wishlist or offers.</p>
                </div>
              ) : (
                <ul>
                  {data.items.map((n) => (
                    <NotificationItem key={n._id} n={n} onOpen={onOpen} onDismiss={(x) => guard(() => dismiss(x._id), 'Could not dismiss that notification.')} />
                  ))}
                </ul>
              )}
            </div>

            {!loading && !error && data.pages > 1 && (
              <nav aria-label="Pagination" className="mt-5 flex items-center justify-between text-sm">
                <button type="button" disabled={page <= 1} onClick={() => setParams({ tab, filter, page: String(page - 1) })} className="inline-flex items-center gap-1 border border-white/20 px-3 py-2 text-xs uppercase tracking-widest hover:bg-white/10 disabled:opacity-40"><ChevronLeft className="h-4 w-4" aria-hidden /> Previous</button>
                <span className="text-silver" aria-live="polite">Page {page} of {data.pages} · {data.total} total</span>
                <button type="button" disabled={page >= data.pages} onClick={() => setParams({ tab, filter, page: String(page + 1) })} className="inline-flex items-center gap-1 border border-white/20 px-3 py-2 text-xs uppercase tracking-widest hover:bg-white/10 disabled:opacity-40">Next <ChevronRight className="h-4 w-4" aria-hidden /></button>
              </nav>
            )}
          </>
        )}
      </div>
    </main>
  );
};

export default NotificationsPage;
