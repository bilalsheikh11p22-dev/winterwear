import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Eye, Loader2, Pause, Play, Plus, RefreshCw, RotateCcw, Send, X, XCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { adminCouponApi, adminNotificationApi, productApi } from '../../services/api';
import { apiMessage, formatDate, relativeTime } from '../../utils/notifications';

const inputCls = 'w-full rounded border border-white/10 bg-charcoal px-3 py-2 text-sm text-snow focus:border-ice focus:outline-none focus-visible:ring-1 focus-visible:ring-ice';
const STATUS_STYLE = {
  draft: 'bg-white/10 text-silver', scheduled: 'bg-ice/15 text-ice', running: 'bg-emerald-500/15 text-emerald-300', completed: 'bg-emerald-500/15 text-emerald-300',
  paused: 'bg-amber-500/15 text-amber-300', cancelled: 'bg-red-500/15 text-red-300', failed: 'bg-red-500/15 text-red-300',
};

const Card = ({ label, value, hint }) => (
  <div className="rounded border border-white/10 p-4"><p className="text-[11px] uppercase tracking-widest text-silver">{label}</p><p className="mt-1 text-2xl">{value}</p>{hint && <p className="mt-1 text-[11px] text-silver/70">{hint}</p>}</div>
);

const Loading = () => <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-silver" aria-label="Loading" /></div>;
const ErrorBox = ({ message, onRetry }) => (
  <div role="alert" className="py-14 text-center text-sm">{message}<button onClick={onRetry} className="ml-3 inline-flex items-center gap-1 underline"><RefreshCw className="h-3 w-3" /> Retry</button></div>
);

// ── Overview ───────────────────────────────────────────────────────────────────────────
const Overview = () => {
  const [days, setDays] = useState(30);
  const [m, setM] = useState(null);
  const [error, setError] = useState('');
  const load = useCallback(() => { setM(null); setError(''); adminNotificationApi.metrics(days).then((r) => setM(r.data.data)).catch((e) => setError(apiMessage(e))); }, [days]);
  useEffect(() => { load(); }, [load]);
  if (error) return <ErrorBox message={error} onRetry={load} />;
  if (!m) return <Loading />;
  const pct = (x) => `${(x * 100).toFixed(1)}%`;
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-xs text-silver">Window:
        {[7, 30, 90].map((d) => <button key={d} onClick={() => setDays(d)} aria-pressed={days === d} className={`rounded-full border px-3 py-1 ${days === d ? 'border-burgundy-light bg-burgundy text-snow' : 'border-white/15'}`}>{d} days</button>)}
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card label="Notifications created" value={m.notificationsCreated} />
        <Card label="In-app read rate" value={pct(m.inAppReadRate)} />
        <Card label="In-app clicks" value={m.inAppClicks} hint={`CTR ${pct(m.inAppClickThroughRate)} (recorded clicks)`} />
        <Card label="Failed email attempts" value={m.failedDeliveryAttempts} />
        <Card label="Emails sent" value={m.email.sent} hint={m.email.provider.configured ? `via ${m.email.provider.provider}` : 'Email provider not configured'} />
        <Card label="Emails skipped" value={m.email.skipped} hint="opted out / not configured" />
        <Card label="Coupon redemptions" value={m.coupons.redemptions} hint={`Attributed sales PKR ${Number(m.coupons.attributedSales).toLocaleString()}`} />
        <Card label="Queue" value={`${m.outbox.pending || 0} pending`} hint={`${m.outbox.failed || 0} retrying · ${m.outbox.dead || 0} dead`} />
      </div>
      <p className="rounded border border-white/10 bg-white/[0.02] p-3 text-xs text-silver">Delivered, bounced, opened and clicked-in-email are <strong>not shown</strong>: they need provider webhook events, which are not connected. We only report what we can actually measure (sent, failed, skipped, in-app read and in-app click).</p>
      <div className="grid gap-6 lg:grid-cols-2">
        <section><h3 className="mb-2 text-sm font-semibold">Order notifications by type</h3>
          {m.orderNotificationsByType.length === 0 ? <p className="text-xs text-silver">None in this window.</p> : <ul className="space-y-1 text-sm">{m.orderNotificationsByType.map((t) => <li key={t.type} className="flex justify-between border-b border-white/5 py-1"><span className="text-silver">{t.type.replace(/_/g, ' ')}</span><span>{t.count}</span></li>)}</ul>}
        </section>
        <section><h3 className="mb-2 text-sm font-semibold">Campaigns by status</h3>
          {Object.keys(m.campaignsByStatus).length === 0 ? <p className="text-xs text-silver">None in this window.</p> : <ul className="space-y-1 text-sm">{Object.entries(m.campaignsByStatus).map(([k, v]) => <li key={k} className="flex justify-between border-b border-white/5 py-1"><span className="text-silver capitalize">{k}</span><span>{v}</span></li>)}</ul>}
        </section>
      </div>
    </div>
  );
};

// ── Campaigns ──────────────────────────────────────────────────────────────────────────
const CampaignForm = ({ presetCoupon, onClose, onCreated }) => {
  const [f, setF] = useState({ name: '', kind: presetCoupon ? 'coupon' : 'product_announcement', products: [], coupon: presetCoupon || '', title: '', message: '', actionUrl: '', segment: 'all_customers', sendEmail: false, scheduledAt: '' });
  const [products, setProducts] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  useEffect(() => {
    productApi.getProducts({ limit: 100 }).then((r) => setProducts((r.data.data?.products || r.data.data || []).filter((p) => p.isPublished !== false))).catch(() => {});
    adminCouponApi.list({ status: 'active', limit: 100 }).then((r) => setCoupons(r.data.data.coupons)).catch(() => {});
  }, []);

  const submit = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    const body = {
      name: f.name, kind: f.kind, sendEmail: f.sendEmail, audience: { segment: f.segment },
      ...(f.kind === 'product_announcement' ? { products: f.products } : {}),
      ...(f.kind === 'coupon' ? { coupon: f.coupon } : {}),
      ...(f.title ? { title: f.title } : {}), ...(f.message ? { message: f.message } : {}), ...(f.actionUrl ? { actionUrl: f.actionUrl } : {}),
      ...(f.scheduledAt ? { scheduledAt: new Date(f.scheduledAt).toISOString() } : {}),
    };
    if (f.segment === 'wishlist_of_product' && f.kind !== 'product_announcement') { setError('“Wishlist of product” targeting needs a product announcement.'); setSaving(false); return; }
    try { const res = await adminNotificationApi.createCampaign(body); onCreated(res.data.data.campaign); } catch (err) { setError(apiMessage(err)); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4" role="dialog" aria-modal="true" aria-label="Create campaign">
      <form onSubmit={submit} className="my-8 w-full max-w-xl rounded-lg border border-white/10 bg-[#1e2024]">
        <div className="flex items-center justify-between border-b border-white/10 p-5"><h2 className="text-lg font-semibold">New campaign</h2><button type="button" onClick={onClose} aria-label="Close" className="text-silver hover:text-snow"><X className="h-5 w-5" /></button></div>
        <div className="space-y-4 p-5 text-xs text-silver">
          <label className="block"><span className="mb-1 block uppercase tracking-widest">Name (internal)</span><input className={inputCls} value={f.name} onChange={(e) => set('name', e.target.value)} required minLength={2} maxLength={120} /></label>
          <label className="block"><span className="mb-1 block uppercase tracking-widest">Type</span>
            <select className={inputCls} value={f.kind} onChange={(e) => set('kind', e.target.value)}><option value="product_announcement">Product announcement</option><option value="coupon">Discount code</option><option value="custom">Custom message</option></select></label>
          {f.kind === 'product_announcement' && (
            <fieldset><legend className="mb-1 uppercase tracking-widest">Published products ({f.products.length} selected)</legend>
              <div className="max-h-36 space-y-1 overflow-y-auto rounded border border-white/10 p-2">{products.map((p) => <label key={p._id} className="flex items-center gap-2 text-snow"><input type="checkbox" checked={f.products.includes(p._id)} onChange={() => set('products', f.products.includes(p._id) ? f.products.filter((x) => x !== p._id) : [...f.products, p._id])} /> {p.name}</label>)}</div></fieldset>
          )}
          {f.kind === 'coupon' && (
            <label className="block"><span className="mb-1 block uppercase tracking-widest">Active coupon</span>
              <select className={inputCls} value={f.coupon} onChange={(e) => set('coupon', e.target.value)} required><option value="">Select…</option>{coupons.map((c) => <option key={c._id} value={c._id}>{c.code} — expires {formatDate(c.validUntil)}</option>)}</select></label>
          )}
          <label className="block"><span className="mb-1 block uppercase tracking-widest">Audience</span>
            <select className={inputCls} value={f.segment} onChange={(e) => set('segment', e.target.value)}>
              <option value="all_customers">All customers (respecting their preferences)</option><option value="previous_buyers">Previous buyers</option><option value="new_customers">New customers (last 30 days)</option><option value="wishlist_of_product">People who wishlisted the product</option>
            </select></label>
          <label className="block"><span className="mb-1 block uppercase tracking-widest">Title override <em className="normal-case">(optional — generated from real data otherwise)</em></span><input className={inputCls} value={f.title} onChange={(e) => set('title', e.target.value)} maxLength={160} /></label>
          <label className="block"><span className="mb-1 block uppercase tracking-widest">Message override <em className="normal-case">(optional)</em></span><textarea className={inputCls} rows={2} value={f.message} onChange={(e) => set('message', e.target.value)} maxLength={600} /></label>
          <label className="block"><span className="mb-1 block uppercase tracking-widest">Link <em className="normal-case">(internal path, e.g. /shop)</em></span><input className={inputCls} value={f.actionUrl} onChange={(e) => set('actionUrl', e.target.value)} pattern="/[^\s\\\\]*" placeholder="/shop" /></label>
          <label className="block"><span className="mb-1 block uppercase tracking-widest">Schedule (optional)</span><input type="datetime-local" className={inputCls} value={f.scheduledAt} onChange={(e) => set('scheduledAt', e.target.value)} /></label>
          <label className="flex items-center gap-2 text-sm text-snow"><input type="checkbox" checked={f.sendEmail} onChange={(e) => set('sendEmail', e.target.checked)} /> Also email customers who opted in to marketing email</label>
        </div>
        {error && <p role="alert" className="mx-5 mb-3 rounded border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}
        <div className="flex justify-end gap-3 border-t border-white/10 p-5"><button type="button" onClick={onClose} className="px-4 py-2 text-sm text-silver hover:text-snow">Cancel</button>
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 bg-ice px-5 py-2 text-sm font-semibold text-charcoal disabled:opacity-60">{saving && <Loader2 className="h-4 w-4 animate-spin" />} Save draft & preview</button></div>
      </form>
    </div>
  );
};

const PreviewModal = ({ campaign, onClose, onChanged }) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { adminNotificationApi.previewCampaign(campaign._id).then((r) => setData(r.data.data)).catch((e) => setError(apiMessage(e))); }, [campaign._id]);
  const publish = async () => { setBusy(true); setError(''); try { await adminNotificationApi.publishCampaign(campaign._id); onChanged(); onClose(); } catch (e) { setError(apiMessage(e)); } finally { setBusy(false); } };
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4" role="dialog" aria-modal="true" aria-label="Campaign preview">
      <div className="my-8 w-full max-w-2xl rounded-lg border border-white/10 bg-[#1e2024]">
        <div className="flex items-center justify-between border-b border-white/10 p-5"><h2 className="text-lg font-semibold">Preview — {campaign.name}</h2><button onClick={onClose} aria-label="Close" className="text-silver hover:text-snow"><X className="h-5 w-5" /></button></div>
        <div className="space-y-5 p-5">
          {!data && !error ? <Loading /> : data && (
            <>
              <div><p className="mb-2 text-[11px] uppercase tracking-widest text-silver">In-app notification</p>
                <div className="flex gap-3 rounded border border-white/10 bg-[#1E2125] p-4">{data.notification.imageUrl && <img src={data.notification.imageUrl} alt="" className="h-14 w-14 rounded object-cover" />}<div><p className="text-sm font-semibold">{data.notification.title}</p><p className="mt-1 text-xs text-silver">{data.notification.message}</p><p className="mt-1 text-[11px] text-silver/60">→ {data.notification.actionUrl}</p></div></div></div>
              <div><p className="mb-2 text-[11px] uppercase tracking-widest text-silver">Email template</p><iframe title="Email preview" sandbox="" srcDoc={data.email.html} className="h-80 w-full rounded border border-white/10 bg-white" /></div>
            </>
          )}
          {error && <p role="alert" className="rounded border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}
        </div>
        <div className="flex items-center justify-between border-t border-white/10 p-5">
          <p className="text-xs text-silver">{campaign.scheduledAt ? `Will be scheduled for ${new Date(campaign.scheduledAt).toLocaleString()}` : 'Publishing starts delivery immediately.'}</p>
          <button onClick={publish} disabled={busy || !data} className="inline-flex items-center gap-2 bg-burgundy px-5 py-2 text-sm font-semibold hover:bg-burgundy-hover disabled:opacity-50">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} {campaign.scheduledAt ? 'Schedule' : 'Publish now'}</button>
        </div>
      </div>
    </div>
  );
};

const Campaigns = ({ presetCoupon }) => {
  const [list, setList] = useState(null);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(!!presetCoupon);
  const [preview, setPreview] = useState(null);
  const [detail, setDetail] = useState(null);
  const [flash, setFlash] = useState('');
  const load = useCallback(() => { setError(''); adminNotificationApi.listCampaigns().then((r) => setList(r.data.data.items)).catch((e) => setError(apiMessage(e))); }, []);
  useEffect(() => { load(); }, [load]);
  // Keep running campaigns fresh
  useEffect(() => { const t = setInterval(() => { if (list?.some((c) => c.status === 'running')) load(); }, 5000); return () => clearInterval(t); }, [list, load]);

  const act = async (fn, id) => { setFlash(''); try { await fn(id); load(); } catch (e) { setFlash(apiMessage(e)); } };
  const openDetail = async (c) => { try { const r = await adminNotificationApi.getCampaign(c._id); setDetail(r.data.data); } catch (e) { setFlash(apiMessage(e)); } };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between"><p className="text-xs text-silver">Notifications respect each customer’s preferences, unsubscribe choices and the daily promotional cap.</p>
        <button onClick={() => setCreating(true)} className="inline-flex items-center gap-2 rounded bg-ice px-4 py-2 text-sm font-semibold text-charcoal"><Plus className="h-4 w-4" /> New campaign</button></div>
      {flash && <p role="alert" className="mb-3 rounded border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{flash}</p>}
      {error ? <ErrorBox message={error} onRetry={load} /> : !list ? <Loading /> : list.length === 0 ? <p className="rounded border border-dashed border-white/15 py-14 text-center text-sm text-silver">No campaigns yet. Publishing a product also creates an automatic announcement campaign.</p> : (
        <div className="overflow-x-auto rounded border border-white/10">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-white/[0.03] text-[11px] uppercase tracking-widest text-silver"><tr><th className="p-3">Campaign</th><th className="p-3">Status</th><th className="p-3">Delivered</th><th className="p-3">Skipped</th><th className="p-3 text-right">Actions</th></tr></thead>
            <tbody>
              {list.map((c) => (
                <tr key={c._id} className="border-t border-white/5">
                  <td className="p-3"><p className="font-medium">{c.name}</p><p className="text-xs text-silver">{c.kind.replace('_', ' ')}{c.system ? ' · automatic' : ''}{c.coupon ? ` · ${c.coupon.code}` : ''} · {relativeTime(c.createdAt)}</p></td>
                  <td className="p-3"><span className={`rounded-full px-2.5 py-1 text-[11px] capitalize ${STATUS_STYLE[c.status]}`}>{c.status}</span>{c.status === 'scheduled' && c.scheduledAt && <p className="mt-1 text-[11px] text-silver">{new Date(c.scheduledAt).toLocaleString()}</p>}{c.lastError && <p className="mt-1 text-[11px] text-red-300">{c.lastError}</p>}</td>
                  <td className="p-3 text-xs">{c.stats.created} <span className="text-silver">of {c.stats.scanned} scanned</span></td>
                  <td className="p-3 text-xs text-silver">{c.stats.skippedPreference} opted out · {c.stats.skippedFrequency} capped</td>
                  <td className="p-3"><div className="flex justify-end gap-1">
                    <button onClick={() => openDetail(c)} className="rounded p-2 text-silver hover:bg-white/10 hover:text-snow" aria-label={`Results for ${c.name}`}><Eye className="h-4 w-4" /></button>
                    {['draft', 'paused'].includes(c.status) && <button onClick={() => setPreview(c)} className="rounded p-2 text-emerald-300 hover:bg-white/10" aria-label={`Preview and publish ${c.name}`}><Play className="h-4 w-4" /></button>}
                    {['running', 'scheduled'].includes(c.status) && <button onClick={() => act(adminNotificationApi.pauseCampaign, c._id)} className="rounded p-2 text-amber-300 hover:bg-white/10" aria-label={`Pause ${c.name}`}><Pause className="h-4 w-4" /></button>}
                    {['draft', 'scheduled', 'running', 'paused'].includes(c.status) && <button onClick={() => { if (window.confirm('Cancel this campaign? This cannot be undone.')) act(adminNotificationApi.cancelCampaign, c._id); }} className="rounded p-2 text-red-300 hover:bg-white/10" aria-label={`Cancel ${c.name}`}><XCircle className="h-4 w-4" /></button>}
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {creating && <CampaignForm presetCoupon={presetCoupon} onClose={() => setCreating(false)} onCreated={(c) => { setCreating(false); load(); setPreview(c); }} />}
      {preview && <PreviewModal campaign={preview} onClose={() => setPreview(null)} onChanged={load} />}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label="Campaign results">
          <div className="w-full max-w-md rounded-lg border border-white/10 bg-[#1e2024] p-6">
            <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold">{detail.campaign.name}</h2><button onClick={() => setDetail(null)} aria-label="Close" className="text-silver hover:text-snow"><X className="h-5 w-5" /></button></div>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              {[['Notifications created', detail.results.created], ['Read in-app', detail.results.read], ['Clicked in-app', detail.results.clicked], ['Emails sent', detail.results.emailSent], ['Email failures', detail.results.emailFailed], ['Opted-out / capped', `${detail.campaign.stats.skippedPreference} / ${detail.campaign.stats.skippedFrequency}`]].map(([k, v]) => <div key={k} className="rounded border border-white/10 p-3"><dt className="text-[11px] uppercase tracking-widest text-silver">{k}</dt><dd className="mt-1 text-lg">{v}</dd></div>)}
            </dl>
            <p className="mt-3 text-[11px] text-silver">Measured from the database. Email opens/clicks are not tracked.</p>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Deliveries & events (admins only) ──────────────────────────────────────────────────
const Deliveries = () => {
  const [failed, setFailed] = useState(null);
  const [events, setEvents] = useState(null);
  const [error, setError] = useState('');
  const [flash, setFlash] = useState('');
  const load = useCallback(() => {
    setError('');
    Promise.all([adminNotificationApi.failedDeliveries(), adminNotificationApi.events('dead'), adminNotificationApi.events('failed')])
      .then(([f, d, r]) => { setFailed(f.data.data.items); setEvents([...d.data.data.items, ...r.data.data.items]); })
      .catch((e) => setError(apiMessage(e)));
  }, []);
  useEffect(() => { load(); }, [load]);
  const run = async (fn, id, ok) => { setFlash(''); try { await fn(id); setFlash(ok); load(); } catch (e) { setFlash(apiMessage(e)); } };
  if (error) return <ErrorBox message={error} onRetry={load} />;
  if (!failed || !events) return <Loading />;
  return (
    <div className="space-y-8">
      {flash && <p role="status" className="rounded border border-ice/30 bg-ice/10 p-3 text-sm text-ice">{flash}</p>}
      <section><h3 className="mb-2 text-sm font-semibold">Failed email deliveries</h3>
        {failed.length === 0 ? <p className="rounded border border-dashed border-white/15 py-8 text-center text-sm text-silver">No unresolved failures.</p> : (
          <ul className="divide-y divide-white/5 rounded border border-white/10">{failed.map((f) => (
            <li key={f._id} className="flex flex-wrap items-center justify-between gap-3 p-3 text-sm"><div><p>{f.title || f.type} <span className="text-xs text-silver">→ {f.to}</span></p><p className="text-xs text-red-300">{f.error} · attempt {f.attempt} · {relativeTime(f.at)}</p></div>
              <button onClick={() => run(adminNotificationApi.retryDelivery, f.notificationId, 'Delivery re-queued.')} className="inline-flex items-center gap-1 rounded border border-white/20 px-3 py-1.5 text-xs hover:bg-white/10"><RotateCcw className="h-3.5 w-3.5" /> Retry</button></li>))}</ul>)}
      </section>
      <section><h3 className="mb-2 text-sm font-semibold">Background events needing attention</h3>
        {events.length === 0 ? <p className="rounded border border-dashed border-white/15 py-8 text-center text-sm text-silver">Queue is healthy.</p> : (
          <ul className="divide-y divide-white/5 rounded border border-white/10">{events.map((e) => (
            <li key={e._id} className="flex flex-wrap items-center justify-between gap-3 p-3 text-sm"><div><p>{e.name} <span className={`ml-2 rounded-full px-2 py-0.5 text-[11px] ${e.status === 'dead' ? 'bg-red-500/15 text-red-300' : 'bg-amber-500/15 text-amber-300'}`}>{e.status}</span></p><p className="text-xs text-silver">{e.lastError || 'no error recorded'} · {e.attempts}/{e.maxAttempts} attempts</p></div>
              <button onClick={() => run(adminNotificationApi.retryEvent, e._id, 'Event re-queued.')} className="inline-flex items-center gap-1 rounded border border-white/20 px-3 py-1.5 text-xs hover:bg-white/10"><RotateCcw className="h-3.5 w-3.5" /> Retry</button></li>))}</ul>)}
      </section>
    </div>
  );
};

const AdminNotifications = () => {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const isAdmin = ['admin', 'super_admin'].includes(user?.role);
  const tabs = [{ key: 'overview', label: 'Overview' }, { key: 'campaigns', label: 'Campaigns' }, ...(isAdmin ? [{ key: 'deliveries', label: 'Deliveries & queue' }] : [])];
  const tab = tabs.some((t) => t.key === params.get('tab')) ? params.get('tab') : 'overview';
  return (
    <div className="min-h-screen bg-[#17191C] text-snow">
      <div className="border-b border-white/10 px-6 py-4"><h1 className="text-xl font-semibold">Notifications & campaigns</h1><p className="mt-0.5 text-xs text-silver">Real delivery data from MongoDB. Nothing here is simulated.</p></div>
      <div className="px-6 py-5">
        <div role="tablist" aria-label="Sections" className="mb-5 flex gap-1 border-b border-white/10">
          {tabs.map((t) => <button key={t.key} role="tab" aria-selected={tab === t.key} onClick={() => setParams({ tab: t.key })} className={`-mb-px border-b-2 px-4 py-2.5 text-sm ${tab === t.key ? 'border-burgundy-light text-snow' : 'border-transparent text-silver hover:text-snow'}`}>{t.label}</button>)}
        </div>
        {tab === 'overview' && <Overview />}
        {tab === 'campaigns' && <Campaigns presetCoupon={params.get('coupon') || ''} />}
        {tab === 'deliveries' && isAdmin && <Deliveries />}
      </div>
    </div>
  );
};

export default AdminNotifications;
