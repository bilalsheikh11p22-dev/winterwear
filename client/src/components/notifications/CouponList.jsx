import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw, Ticket } from 'lucide-react';
import { couponApi } from '../../services/api';
import CopyCodeButton from './CopyCodeButton';
import { apiMessage, formatDate, formatPKR } from '../../utils/notifications';

/** Real coupons from the backend with the customer's own eligibility + redemption status. */
const CouponList = ({ onApply, appliedCode, title = 'Your offers', compact = false }) => {
  const [coupons, setCoupons] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await couponApi.available();
      setCoupons(Array.isArray(res?.data?.data?.coupons) ? res.data.data.coupons : []);
    } catch (err) {
      setError(apiMessage(err, 'Could not load your offers.'));
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <section aria-labelledby="coupon-list-title">
      <h3 id="coupon-list-title" className={`${compact ? 'text-xs uppercase tracking-widest text-silver' : 'text-lg font-semibold text-snow'}`}>{title}</h3>

      {loading ? (
        <div className="mt-3 space-y-3" aria-busy="true" aria-label="Loading offers">{[0, 1].map((i) => <div key={i} className="h-20 animate-pulse rounded bg-white/5 motion-reduce:animate-none" />)}</div>
      ) : error ? (
        <div role="alert" className="mt-3 rounded border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-100">
          {error}
          <button type="button" onClick={load} className="ml-3 inline-flex items-center gap-1 underline"><RefreshCw className="h-3 w-3" aria-hidden /> Retry</button>
        </div>
      ) : coupons.length === 0 ? (
        <div className="mt-3 rounded border border-dashed border-white/15 p-6 text-center">
          <Ticket className="mx-auto h-6 w-6 text-silver/50" aria-hidden />
          <p className="mt-2 text-sm text-silver">No offers available right now.</p>
        </div>
      ) : (
        <ul className="mt-3 space-y-3">
          {coupons.map((c) => (
            <li key={c._id} className={`rounded border p-4 ${c.eligible ? 'border-burgundy-light/40 bg-burgundy/10' : 'border-white/10 bg-white/[0.02] opacity-80'}`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-snow">{c.name || c.summary}</p>
                  <p className="text-xs text-silver">{c.summary}{c.minOrderAmount > 0 ? ` · min. order ${formatPKR(c.minOrderAmount)}` : ''}</p>
                </div>
                <CopyCodeButton code={c.code} />
              </div>
              <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-silver">
                <li>Valid until {formatDate(c.validUntil)}</li>
                {c.excludeSaleItems && <li>Excludes sale items</li>}
                {c.firstOrderOnly && <li>First order only</li>}
                {c.restrictedToItems && <li>Selected items only</li>}
                {c.perCustomerLimit > 1 && <li>{c.myUses}/{c.perCustomerLimit} uses</li>}
              </ul>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                {c.eligible ? (
                  <>
                    {onApply && (
                      <button type="button" onClick={() => onApply(c.code)} disabled={appliedCode === c.code} className="bg-burgundy px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-snow hover:bg-burgundy-hover disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-ice">
                        {appliedCode === c.code ? 'Applied' : 'Apply'}
                      </button>
                    )}
                    <Link to="/shop" className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ice underline-offset-4 hover:underline">Shop now</Link>
                  </>
                ) : (
                  <span className="rounded bg-white/10 px-2 py-1 text-[11px] text-silver">{c.ineligibleReason || 'Not available'}</span>
                )}
                {c.redeemedByMe && <span className="text-[11px] text-ice">Redeemed</span>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default CouponList;
