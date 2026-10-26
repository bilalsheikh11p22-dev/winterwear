import React from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import CopyCodeButton from './CopyCodeButton';
import { categoryIcon, relativeTime, resolveActionUrl, safeImageUrl } from '../../utils/notifications';

const CategoryIcon = ({ category, className }) => React.createElement(categoryIcon(category), { className, 'aria-hidden': true });

const PRIORITY_RING = { urgent: 'bg-red-400', high: 'bg-burgundy-light', normal: 'bg-ice', low: 'bg-silver' };

/**
 * One notification row. All text is rendered as plain React text (never as HTML).
 * Clicking the row is the explicit "open" action — it is what marks the notification read.
 */
const NotificationItem = ({ n, onOpen, onDismiss, showShopNow = true }) => {
  const img = safeImageUrl(n.imageUrl);
  const url = resolveActionUrl(n);

  return (
    <li className="group relative border-b border-white/5 last:border-b-0">
      <button
        type="button"
        data-nitem
        onClick={() => onOpen(n, url)}
        className={`flex w-full gap-3 px-4 py-3 pr-10 text-left transition-colors hover:bg-white/5 focus:outline-none focus-visible:bg-white/10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ice ${n.isRead ? '' : 'bg-white/[0.03]'}`}
        aria-label={`${n.isRead ? '' : 'Unread. '}${n.title}. ${n.message}`}
      >
        {img ? (
          <img src={img} alt="" loading="lazy" className="h-12 w-12 flex-none rounded object-cover bg-charcoal-muted" />
        ) : (
          <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-white/5 text-ice">
            <CategoryIcon category={n.category} className="h-4 w-4" />
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="flex items-start gap-2">
            {!n.isRead && <span className={`mt-1.5 h-2 w-2 flex-none rounded-full ${PRIORITY_RING[n.priority] || PRIORITY_RING.normal}`} aria-hidden />}
            <span className={`text-sm leading-snug ${n.isRead ? 'text-silver' : 'font-semibold text-snow'}`}>{n.title}</span>
          </span>
          <span className="mt-0.5 block text-xs leading-relaxed text-silver line-clamp-3">{n.message}</span>
          <span className="mt-1 block text-[11px] text-silver/70">{relativeTime(n.createdAt)}</span>
        </span>
      </button>

      {(n.data?.couponCode || (showShopNow && n.category === 'products' && url)) && (
        <div className="flex flex-wrap items-center gap-2 px-4 pb-3 pl-16">
          {n.data?.couponCode && <CopyCodeButton code={n.data.couponCode} />}
          {n.data?.couponCode && (
            <Link to="/shop" onClick={() => onOpen(n, null)} className="text-[11px] font-semibold uppercase tracking-[0.18em] text-snow underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ice">
              Shop now
            </Link>
          )}
          {!n.data?.couponCode && showShopNow && n.category === 'products' && url && (
            <Link to={url} onClick={() => onOpen(n, null)} className="text-[11px] font-semibold uppercase tracking-[0.18em] text-snow underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ice">
              Shop now
            </Link>
          )}
        </div>
      )}

      {onDismiss && (
        <button
          type="button"
          onClick={() => onDismiss(n)}
          className="absolute right-2 top-2 rounded p-1.5 text-silver opacity-70 transition hover:bg-white/10 hover:text-snow hover:opacity-100 focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-ice group-hover:opacity-100"
          aria-label={`Dismiss notification: ${n.title}`}
        >
          <X className="h-3.5 w-3.5" aria-hidden />
        </button>
      )}
    </li>
  );
};

export default NotificationItem;
