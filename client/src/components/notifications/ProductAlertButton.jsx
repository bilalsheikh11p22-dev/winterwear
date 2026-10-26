import React, { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Bell, BellRing, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { productApi } from '../../services/api';
import { apiMessage } from '../../utils/notifications';

/** type: 'back_in_stock' | 'price_drop'. Subscriptions are stored server-side and owned by the signed-in user. */
const ProductAlertButton = ({ productId, type = 'back_in_stock', className = '' }) => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const [subscribed, setSubscribed] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    setReady(false); setMessage('');
    if (!isAuthenticated || !productId) { setSubscribed(false); setReady(true); return undefined; }
    productApi.mySubscriptions()
      .then((res) => { if (!cancelled) setSubscribed(res.data.data.subscriptions.some((s) => String(s.product) === String(productId) && s.type === type)); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setReady(true); });
    return () => { cancelled = true; };
  }, [isAuthenticated, productId, type]);

  const toggle = useCallback(async () => {
    setBusy(true); setMessage('');
    try {
      if (subscribed) { await productApi.unsubscribe(productId, type); setSubscribed(false); setMessage('Alert removed.'); }
      else { await productApi.subscribe(productId, type); setSubscribed(true); setMessage(type === 'back_in_stock' ? 'We’ll notify you when it’s back.' : 'We’ll tell you if the price drops.'); }
    } catch (err) {
      setMessage(apiMessage(err, 'Could not update your alert.'));
    } finally { setBusy(false); }
  }, [subscribed, productId, type]);

  const label = type === 'back_in_stock'
    ? (subscribed ? 'You’ll be notified when back in stock' : 'Notify me when back in stock')
    : (subscribed ? 'Price-drop alert on' : 'Alert me on price drops');
  const Icon = subscribed ? BellRing : Bell;

  if (!isAuthenticated) {
    return <Link to="/login" state={{ from: location.pathname }} className={`inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] underline-offset-4 hover:underline ${className}`}><Bell className="h-4 w-4" aria-hidden /> Sign in to get alerts</Link>;
  }

  return (
    <div className={className}>
      <button type="button" onClick={toggle} disabled={busy || !ready} aria-pressed={subscribed}
        className="inline-flex items-center gap-2 border border-current px-4 py-2.5 text-xs uppercase tracking-[0.18em] transition hover:opacity-80 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-burgundy focus-visible:ring-offset-2">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Icon className="h-4 w-4" aria-hidden />}
        {label}
      </button>
      <p role="status" aria-live="polite" className="mt-1 min-h-[1rem] text-xs opacity-70">{message}</p>
    </div>
  );
};

export default ProductAlertButton;
