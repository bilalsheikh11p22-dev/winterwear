import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, RefreshCw, X } from 'lucide-react';
import { useNotifications } from '../../hooks/useNotifications';
import NotificationItem from '../notifications/NotificationItem';

const Skeleton = () => (
  <ul aria-hidden className="divide-y divide-white/5">
    {[0, 1, 2, 3].map((i) => (
      <li key={i} className="flex gap-3 px-4 py-3">
        <div className="h-9 w-9 flex-none animate-pulse rounded-full bg-white/10 motion-reduce:animate-none" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-2/3 animate-pulse rounded bg-white/10 motion-reduce:animate-none" />
          <div className="h-3 w-full animate-pulse rounded bg-white/5 motion-reduce:animate-none" />
        </div>
      </li>
    ))}
  </ul>
);

/**
 * Header bell. Desktop: anchored dropdown. Mobile: bottom drawer.
 * Opening the panel does NOT mark anything as read — only clicking a notification, "Mark all read",
 * or dismissing does.
 */
const NotificationBell = ({ onNew, align = 'right' }) => {
  const { notifications, unreadCount, loading, error, refresh, markAllRead, dismiss, openNotification } = useNotifications({ onNew });
  const [open, setOpen] = useState(false);
  const [actionError, setActionError] = useState('');
  const [busy, setBusy] = useState(false);
  const rootRef = useRef(null);
  const btnRef = useRef(null);
  const listRef = useRef(null);
  const panelId = useId();
  const navigate = useNavigate();

  const close = useCallback((restoreFocus = true) => {
    setOpen(false);
    if (restoreFocus) btnRef.current?.focus();
  }, []);

  // Refetch fresh data each time the panel opens (does not alter read state)
  useEffect(() => { if (open) refresh({ silent: notifications.length > 0 }); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Outside click, Escape, and body scroll lock for the mobile drawer
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (rootRef.current && !rootRef.current.contains(e.target)) close(false); };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    const mobile = window.matchMedia('(max-width: 639px)').matches;
    const prev = document.body.style.overflow;
    if (mobile) document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, close]);

  const onListKey = (e) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return;
    const els = [...(listRef.current?.querySelectorAll('[data-nitem]') || [])];
    if (!els.length) return;
    e.preventDefault();
    const i = els.indexOf(document.activeElement);
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? els.length - 1 : e.key === 'ArrowDown' ? Math.min(els.length - 1, i + 1) : Math.max(0, i - 1);
    els[next].focus();
  };

  const handleOpen = async (n, url) => {
    setActionError('');
    await openNotification(n);
    if (url) { close(false); navigate(url); }
  };

  const handleDismiss = async (n) => {
    setActionError('');
    try { await dismiss(n._id); } catch { setActionError('Could not dismiss that notification. Please try again.'); }
  };

  const handleMarkAll = async () => {
    setBusy(true); setActionError('');
    try { await markAllRead(); } catch { setActionError('Could not mark notifications as read. Please try again.'); } finally { setBusy(false); }
  };

  const label = unreadCount > 0 ? `Notifications, ${unreadCount > 99 ? 'more than 99' : unreadCount} unread` : 'Notifications';

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-full p-2 text-current transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-ice"
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
      >
        <Bell className="h-5 w-5" aria-hidden />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-burgundy px-1 text-[10px] font-bold leading-none text-snow" aria-hidden>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
        {/* polite live region so screen readers hear new arrivals */}
        <span className="sr-only" role="status" aria-live="polite">{unreadCount > 0 ? `${unreadCount} unread notifications` : 'No unread notifications'}</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-[60] bg-black/60 sm:hidden" aria-hidden onClick={() => close()} />
          <div
            id={panelId}
            role="dialog"
            aria-label="Notifications"
            data-lenis-prevent
            className={`fixed inset-x-0 bottom-0 z-[70] flex max-h-[80vh] flex-col overflow-hidden rounded-t-xl border border-white/10 bg-[#1E2125] text-snow shadow-2xl sm:absolute sm:inset-x-auto sm:bottom-auto sm:top-full sm:mt-2 sm:w-[400px] sm:rounded-lg ${align === 'left' ? 'sm:left-0' : 'sm:right-0'}`}
          >
            <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <h2 className="text-sm font-semibold tracking-wide">Notifications{unreadCount > 0 && <span className="ml-2 text-xs font-normal text-silver">{unreadCount} unread</span>}</h2>
              <div className="flex items-center gap-1">
                <button type="button" onClick={handleMarkAll} disabled={busy || unreadCount === 0} className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-ice hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ice">
                  <CheckCheck className="h-3.5 w-3.5" aria-hidden /> Mark all read
                </button>
                <button type="button" onClick={() => close()} className="rounded p-1.5 text-silver hover:bg-white/10 hover:text-snow focus:outline-none focus-visible:ring-2 focus-visible:ring-ice sm:hidden" aria-label="Close notifications">
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </header>

            {actionError && <p role="alert" className="border-b border-red-400/20 bg-red-400/10 px-4 py-2 text-xs text-red-200">{actionError}</p>}

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain" onKeyDown={onListKey}>
              {loading && notifications.length === 0 ? (
                <Skeleton />
              ) : error && notifications.length === 0 ? (
                <div role="alert" className="px-6 py-10 text-center">
                  <p className="text-sm text-snow">We couldn’t load your notifications.</p>
                  <p className="mt-1 text-xs text-silver">{error}</p>
                  <button type="button" onClick={() => refresh()} className="mt-4 inline-flex items-center gap-2 rounded border border-white/20 px-4 py-2 text-xs uppercase tracking-widest hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-ice">
                    <RefreshCw className="h-3.5 w-3.5" aria-hidden /> Retry
                  </button>
                </div>
              ) : notifications.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <Bell className="mx-auto h-8 w-8 text-silver/40" aria-hidden />
                  <p className="mt-3 text-sm text-snow">You’re all caught up</p>
                  <p className="mt-1 text-xs text-silver">Order updates, new arrivals and offers will appear here.</p>
                </div>
              ) : (
                <ul ref={listRef}>
                  {notifications.map((n) => (
                    <NotificationItem key={n._id} n={n} onOpen={handleOpen} onDismiss={handleDismiss} />
                  ))}
                </ul>
              )}
            </div>

            <footer className="border-t border-white/10 px-4 py-2.5 text-center">
              <Link to="/notifications" onClick={() => close(false)} className="text-xs font-semibold uppercase tracking-[0.2em] text-ice hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ice">
                View all notifications
              </Link>
            </footer>
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationBell;
