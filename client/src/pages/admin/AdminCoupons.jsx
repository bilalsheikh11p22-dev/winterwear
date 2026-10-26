import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, BellRing, Loader2, Pencil, Plus, Power, RefreshCw, Ticket, X } from 'lucide-react';
import { adminCouponApi, productApi } from '../../services/api';
import { apiMessage, formatDate, formatPKR } from '../../utils/notifications';

const STATUS_TABS = ['all', 'active', 'scheduled', 'expired', 'disabled', 'exhausted'];
const STATUS_STYLE = {
  active: 'bg-emerald-500/15 text-emerald-300', scheduled: 'bg-ice/15 text-ice', expired: 'bg-white/10 text-silver',
  disabled: 'bg-red-500/15 text-red-300', exhausted: 'bg-amber-500/15 text-amber-300',
};

const toLocalInput = (d) => { const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 16); };
const blank = () => ({
  code: '', name: '', description: '', discountType: 'percentage', discountValue: 10, minOrderAmount: 0, maxDiscountAmount: '',
  validFrom: toLocalInput(new Date()), validUntil: toLocalInput(new Date(Date.now() + 14 * 86400000)),
  maxUsageCount: '', perCustomerLimit: 1, excludeSaleItems: false, firstOrderOnly: false, customerSegment: 'all', visibility: 'public',
  applicableCategories: [], eligibleProducts: [],
});

const Field = ({ label, hint, children }) => (
  <label className="block text-xs text-silver">
    <span className="mb-1 block uppercase tracking-widest">{label}</span>
    {children}
    {hint && <span className="mt-1 block text-[11px] text-silver/60">{hint}</span>}
  </label>
);
const inputCls = 'w-full rounded border border-white/10 bg-charcoal px-3 py-2 text-sm text-snow focus:border-ice focus:outline-none focus-visible:ring-1 focus-visible:ring-ice disabled:opacity-50';

const Stat = ({ label, value }) => (
  <div className="rounded border border-white/10 p-3"><p className="text-[11px] uppercase tracking-widest text-silver">{label}</p><p className="mt-1 text-xl text-snow">{value}</p></div>
);

const CouponForm = ({ coupon, categories, products, onClose, onSaved }) => {
  const editing = !!coupon;
  const [f, setF] = useState(() => (coupon ? {
    ...blank(), ...coupon, validFrom: toLocalInput(coupon.validFrom), validUntil: toLocalInput(coupon.validUntil),
    maxDiscountAmount: coupon.maxDiscountAmount ?? '', maxUsageCount: coupon.maxUsageCount ?? '',
    applicableCategories: (coupon.applicableCategories || []).map(String), eligibleProducts: (coupon.eligibleProducts || []).map(String),
  } : blank()));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const locked = editing && (coupon.currentUsageCount > 0 || coupon.reservedCount > 0);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const toggleId = (key, id) => set(key, f[key].includes(id) ? f[key].filter((x) => x !== id) : [...f[key], id]);
  const shown = products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase())).slice(0, 40);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    const body = {
      code: f.code.trim().toUpperCase(), name: f.name, description: f.description, discountType: f.discountType,
      discountValue: f.discountType === 'free_shipping' ? 0 : Number(f.discountValue),
      minOrderAmount: Number(f.minOrderAmount) || 0,
      maxDiscountAmount: f.maxDiscountAmount === '' ? null : Number(f.maxDiscountAmount),
      validFrom: new Date(f.validFrom).toISOString(), validUntil: new Date(f.validUntil).toISOString(),
      maxUsageCount: f.maxUsageCount === '' ? null : Number(f.maxUsageCount), perCustomerLimit: Number(f.perCustomerLimit) || 1,
      excludeSaleItems: f.excludeSaleItems, firstOrderOnly: f.firstOrderOnly, customerSegment: f.customerSegment === 'specific' ? 'all' : f.customerSegment,
      visibility: f.visibility, applicableCategories: f.applicableCategories, eligibleProducts: f.eligibleProducts,
    };
    try {
      const res = editing ? await adminCouponApi.update(coupon._id, body) : await adminCouponApi.create(body);
      onSaved(res.data.data.coupon);
    } catch (err) {
      const issues = err.response?.data?.errors;
      setError(issues?.length ? issues.map((i) => i.message || i).join(' · ') : apiMessage(err));
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={editing ? 'Edit coupon' : 'Create coupon'}>
      <form onSubmit={submit} className="my-8 w-full max-w-2xl rounded-lg border border-white/10 bg-[#1e2024] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 p-5">
          <h2 className="text-lg font-semibold text-snow">{editing ? `Edit ${coupon.code}` : 'Create coupon'}</h2>
          <button type="button" onClick={onClose} className="text-silver hover:text-snow" aria-label="Close"><X className="h-5 w-5" /></button>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          {locked && <p className="rounded border border-amber-400/30 bg-amber-400/10 p-3 text-xs text-amber-200 sm:col-span-2">This coupon has been used, so its code and discount terms are locked. You can still change limits, dates, eligibility and status.</p>}
          <Field label="Code"><input className={inputCls} value={f.code} onChange={(e) => set('code', e.target.value.toUpperCase())} required minLength={3} maxLength={30} pattern="[A-Za-z0-9_-]{3,30}" disabled={locked} placeholder="e.g. WINTER10" /></Field>
          <Field label="Display name"><input className={inputCls} value={f.name} onChange={(e) => set('name', e.target.value)} maxLength={120} placeholder="Winter Special" /></Field>
          <Field label="Discount type">
            <select className={inputCls} value={f.discountType} onChange={(e) => set('discountType', e.target.value)} disabled={locked}>
              <option value="percentage">Percentage</option><option value="fixed_amount">Fixed amount (PKR)</option><option value="free_shipping">Free shipping</option>
            </select>
          </Field>
          {f.discountType !== 'free_shipping' && (
            <Field label={f.discountType === 'percentage' ? 'Percent off' : 'Amount off (PKR)'}><input type="number" min="1" max={f.discountType === 'percentage' ? 100 : undefined} step="any" className={inputCls} value={f.discountValue} onChange={(e) => set('discountValue', e.target.value)} required disabled={locked} /></Field>
          )}
          <Field label="Minimum order (PKR)"><input type="number" min="0" className={inputCls} value={f.minOrderAmount} onChange={(e) => set('minOrderAmount', e.target.value)} /></Field>
          {f.discountType === 'percentage' && <Field label="Max discount cap (PKR)" hint="Leave empty for no cap"><input type="number" min="1" className={inputCls} value={f.maxDiscountAmount} onChange={(e) => set('maxDiscountAmount', e.target.value)} /></Field>}
          <Field label="Starts"><input type="datetime-local" className={inputCls} value={f.validFrom} onChange={(e) => set('validFrom', e.target.value)} required /></Field>
          <Field label="Expires"><input type="datetime-local" className={inputCls} value={f.validUntil} onChange={(e) => set('validUntil', e.target.value)} required /></Field>
          <Field label="Total redemption limit" hint="Empty = unlimited"><input type="number" min="1" className={inputCls} value={f.maxUsageCount} onChange={(e) => set('maxUsageCount', e.target.value)} /></Field>
          <Field label="Per-customer limit"><input type="number" min="1" max="10" className={inputCls} value={f.perCustomerLimit} onChange={(e) => set('perCustomerLimit', e.target.value)} /></Field>
          <Field label="Customer segment">
            <select className={inputCls} value={f.customerSegment === 'specific' ? 'all' : f.customerSegment} onChange={(e) => set('customerSegment', e.target.value)}>
              <option value="all">Everyone</option><option value="new_customers">New customers (no orders)</option><option value="returning_customers">Returning customers</option>
            </select>
          </Field>
          <Field label="Visibility" hint="Hidden coupons work only if the customer knows the code">
            <select className={inputCls} value={f.visibility} onChange={(e) => set('visibility', e.target.value)}><option value="public">Listed to eligible customers</option><option value="hidden">Hidden (code only)</option></select>
          </Field>
          <div className="space-y-2 text-sm text-snow sm:col-span-2">
            <label className="flex items-center gap-2"><input type="checkbox" checked={f.firstOrderOnly} onChange={(e) => set('firstOrderOnly', e.target.checked)} /> First order only</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={f.excludeSaleItems} onChange={(e) => set('excludeSaleItems', e.target.checked)} /> Exclude items already on sale</label>
          </div>
          <fieldset className="sm:col-span-2">
            <legend className="mb-1 text-xs uppercase tracking-widest text-silver">Eligible categories <span className="normal-case tracking-normal text-silver/60">(none selected = all)</span></legend>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <button key={c._id} type="button" aria-pressed={f.applicableCategories.includes(c._id)} onClick={() => toggleId('applicableCategories', c._id)}
                  className={`rounded-full border px-3 py-1 text-xs ${f.applicableCategories.includes(c._id) ? 'border-burgundy-light bg-burgundy text-snow' : 'border-white/15 text-silver'}`}>{c.name}</button>
              ))}
              {categories.length === 0 && <span className="text-xs text-silver/60">No categories found.</span>}
            </div>
          </fieldset>
          <fieldset className="sm:col-span-2">
            <legend className="mb-1 text-xs uppercase tracking-widest text-silver">Eligible products <span className="normal-case tracking-normal text-silver/60">(none selected = all) · {f.eligibleProducts.length} chosen</span></legend>
            <input className={`${inputCls} mb-2`} placeholder="Search products…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search products" />
            <div className="max-h-36 space-y-1 overflow-y-auto rounded border border-white/10 p-2">
              {shown.map((p) => (
                <label key={p._id} className="flex items-center gap-2 text-xs text-snow"><input type="checkbox" checked={f.eligibleProducts.includes(p._id)} onChange={() => toggleId('eligibleProducts', p._id)} /> {p.name}</label>
              ))}
            </div>
          </fieldset>
          <Field label="Description (optional)"><textarea className={inputCls} rows={2} maxLength={400} value={f.description} onChange={(e) => set('description', e.target.value)} /></Field>
        </div>
        {error && <p role="alert" className="mx-5 mb-3 rounded border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}
        <div className="flex justify-end gap-3 border-t border-white/10 p-5">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-silver hover:text-snow">Cancel</button>
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 bg-ice px-5 py-2 text-sm font-semibold text-charcoal hover:bg-ice/90 disabled:opacity-60">{saving && <Loader2 className="h-4 w-4 animate-spin" />} {editing ? 'Save changes' : 'Create coupon'}</button>
        </div>
      </form>
    </div>
  );
};

const AnalyticsModal = ({ coupon, onClose }) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { adminCouponApi.analytics(coupon._id).then((r) => setData(r.data.data)).catch((e) => setError(apiMessage(e))); }, [coupon._id]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label={`Analytics for ${coupon.code}`}>
      <div className="w-full max-w-lg rounded-lg border border-white/10 bg-[#1e2024] p-6">
        <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold text-snow">{coupon.code} analytics</h2><button onClick={onClose} aria-label="Close" className="text-silver hover:text-snow"><X className="h-5 w-5" /></button></div>
        {error ? <p role="alert" className="text-sm text-red-300">{error}</p> : !data ? <Loader2 className="mx-auto h-6 w-6 animate-spin text-silver" /> : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Redeemed" value={data.redemptions} /><Stat label="Reserved (in checkout)" value={data.reserved} />
              <Stat label="Discount given" value={formatPKR(data.totalDiscountGiven)} /><Stat label="Attributed sales" value={formatPKR(data.couponAttributedSales)} />
              <Stat label="Unique customers" value={data.uniqueCustomers} /><Stat label="Remaining" value={data.remaining ?? 'Unlimited'} />
            </div>
            <p className="mt-4 text-[11px] leading-relaxed text-silver">Attributed sales = order totals of orders on which this code was redeemed. Reserved orders are not counted until payment is confirmed (or COD is placed).</p>
          </>
        )}
      </div>
    </div>
  );
};

const AdminCoupons = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState('all');
  const [data, setData] = useState({ coupons: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(null); // null | 'new' | coupon
  const [stats, setStats] = useState(null);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [busyId, setBusyId] = useState('');
  const [flash, setFlash] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await adminCouponApi.list({ status: status === 'all' ? undefined : status, limit: 100 });
      setData(res.data.data);
    } catch (err) { setError(apiMessage(err, 'Could not load coupons.')); } finally { setLoading(false); }
  }, [status]);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    productApi.getCategories().then((r) => setCategories(r.data.data?.categories || r.data.data || [])).catch(() => {});
    productApi.getProducts({ limit: 100 }).then((r) => setProducts(r.data.data?.products || r.data.data || [])).catch(() => {});
  }, []);

  const toggle = async (c) => {
    setBusyId(c._id); setFlash('');
    try { await adminCouponApi.setStatus(c._id, !c.isActive); await load(); } catch (err) { setFlash(apiMessage(err)); } finally { setBusyId(''); }
  };

  const counts = useMemo(() => data.total, [data.total]);

  return (
    <div className="min-h-screen bg-[#17191C] text-snow">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-6 py-4">
        <div><h1 className="text-xl font-semibold">Discount codes</h1><p className="mt-0.5 text-xs text-silver">Create, schedule and track coupons. Every discount is calculated on the server.</p></div>
        <button onClick={() => setForm('new')} className="inline-flex items-center gap-2 rounded bg-ice px-4 py-2 text-sm font-semibold text-charcoal hover:bg-ice/90"><Plus className="h-4 w-4" /> New coupon</button>
      </div>

      <div className="px-6 py-5">
        <div role="tablist" aria-label="Coupon status" className="mb-4 flex flex-wrap gap-2">
          {STATUS_TABS.map((s) => (
            <button key={s} role="tab" aria-selected={status === s} onClick={() => setStatus(s)} className={`rounded-full border px-3.5 py-1.5 text-xs capitalize ${status === s ? 'border-burgundy-light bg-burgundy' : 'border-white/15 text-silver hover:text-snow'}`}>{s}</button>
          ))}
          <span className="ml-auto self-center text-xs text-silver">{counts} coupon{counts === 1 ? '' : 's'}</span>
        </div>

        {flash && <p role="alert" className="mb-3 rounded border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{flash}</p>}

        {loading ? <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-silver" aria-label="Loading" /></div>
          : error ? <div role="alert" className="py-16 text-center text-sm">{error}<button onClick={load} className="ml-3 inline-flex items-center gap-1 underline"><RefreshCw className="h-3 w-3" /> Retry</button></div>
          : data.coupons.length === 0 ? <div className="rounded border border-dashed border-white/15 py-16 text-center"><Ticket className="mx-auto h-8 w-8 text-silver/40" /><p className="mt-3 text-sm text-silver">No {status === 'all' ? '' : status} coupons yet.</p></div>
          : (
            <div className="overflow-x-auto rounded border border-white/10">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead className="bg-white/[0.03] text-[11px] uppercase tracking-widest text-silver"><tr><th className="p-3">Code</th><th className="p-3">Discount</th><th className="p-3">Window</th><th className="p-3">Usage</th><th className="p-3">Status</th><th className="p-3 text-right">Actions</th></tr></thead>
                <tbody>
                  {data.coupons.map((c) => (
                    <tr key={c._id} className="border-t border-white/5">
                      <td className="p-3"><p className="font-semibold tracking-wider">{c.code}</p><p className="text-xs text-silver">{c.name}</p></td>
                      <td className="p-3 text-xs">{c.discountType === 'percentage' ? `${c.discountValue}%` : c.discountType === 'fixed_amount' ? formatPKR(c.discountValue) : 'Free shipping'}{c.minOrderAmount > 0 && <span className="block text-silver">min {formatPKR(c.minOrderAmount)}</span>}</td>
                      <td className="p-3 text-xs text-silver">{formatDate(c.validFrom)} → {formatDate(c.validUntil)}</td>
                      <td className="p-3 text-xs">{c.currentUsageCount}{c.maxUsageCount != null ? ` / ${c.maxUsageCount}` : ''}{c.reservedCount > 0 && <span className="block text-silver">{c.reservedCount} reserved</span>}</td>
                      <td className="p-3"><span className={`rounded-full px-2.5 py-1 text-[11px] capitalize ${STATUS_STYLE[c.status] || ''}`}>{c.status}</span></td>
                      <td className="p-3">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => setForm(c)} className="rounded p-2 text-silver hover:bg-white/10 hover:text-snow" aria-label={`Edit ${c.code}`}><Pencil className="h-4 w-4" /></button>
                          <button onClick={() => setStats(c)} className="rounded p-2 text-silver hover:bg-white/10 hover:text-snow" aria-label={`Analytics for ${c.code}`}><BarChart3 className="h-4 w-4" /></button>
                          <button onClick={() => navigate(`/admin/notifications?tab=campaigns&coupon=${c._id}`)} disabled={c.status !== 'active'} className="rounded p-2 text-silver hover:bg-white/10 hover:text-snow disabled:opacity-30" aria-label={`Announce ${c.code}`} title="Announce to customers"><BellRing className="h-4 w-4" /></button>
                          <button onClick={() => toggle(c)} disabled={busyId === c._id} className={`rounded p-2 hover:bg-white/10 disabled:opacity-40 ${c.isActive ? 'text-emerald-300' : 'text-red-300'}`} aria-label={c.isActive ? `Deactivate ${c.code}` : `Activate ${c.code}`} aria-pressed={c.isActive}>{busyId === c._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Power className="h-4 w-4" />}</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </div>

      {form && <CouponForm coupon={form === 'new' ? null : form} categories={categories} products={products} onClose={() => setForm(null)} onSaved={() => { setForm(null); load(); }} />}
      {stats && <AnalyticsModal coupon={stats} onClose={() => setStats(null)} />}
    </div>
  );
};

export default AdminCoupons;
