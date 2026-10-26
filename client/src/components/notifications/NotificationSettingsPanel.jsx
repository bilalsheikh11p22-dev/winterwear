import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, RefreshCw, ShieldCheck } from 'lucide-react';
import { notificationApi } from '../../services/api';
import { apiMessage } from '../../utils/notifications';

const ROWS = [
  { key: 'orderUpdates', label: 'Order updates', hint: 'Placed, paid, shipped, out for delivery, delivered, refunds and returns.' },
  { key: 'newArrivals', label: 'New arrivals', hint: 'When a new piece is published.' },
  { key: 'backInStock', label: 'Back-in-stock alerts', hint: 'For products you asked to be told about.' },
  { key: 'priceDrop', label: 'Wishlist price drops', hint: 'When something on your wishlist gets cheaper or is nearly gone.' },
  { key: 'discounts', label: 'Discounts & campaigns', hint: 'Coupon codes, seasonal sales and expiry reminders.' },
];

const Toggle = ({ checked, onChange, label, disabled }) => (
  <button
    type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} onClick={() => onChange(!checked)}
    className={`relative h-6 w-11 flex-none rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ice focus-visible:ring-offset-2 focus-visible:ring-offset-charcoal disabled:opacity-50 ${checked ? 'bg-burgundy' : 'bg-white/15'}`}
  >
    <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-snow transition-transform motion-reduce:transition-none ${checked ? 'translate-x-5' : ''}`} />
  </button>
);

const NotificationSettingsPanel = () => {
  const [prefs, setPrefs] = useState(null);
  const [emailCfg, setEmailCfg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await notificationApi.getPreferences();
      setPrefs(res.data.data.preferences);
      setEmailCfg(res.data.data.email);
    } catch (err) {
      setError(apiMessage(err, 'Could not load your notification settings.'));
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = async (patch, optimistic) => {
    const before = prefs;
    setPrefs(optimistic);
    setSaving(true); setStatus('');
    try {
      const res = await notificationApi.updatePreferences(patch);
      setPrefs(res.data.data.preferences);
      setStatus('Saved');
    } catch (err) {
      setPrefs(before);
      setStatus(apiMessage(err, 'Could not save. Your previous setting was restored.'));
    } finally { setSaving(false); }
  };

  const toggle = (key, channel, value) => save({ [key]: { [channel]: value } }, { ...prefs, [key]: { ...prefs[key], [channel]: value } });

  if (loading) {
    return <div className="space-y-3" aria-busy="true" aria-label="Loading settings">{[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-16 animate-pulse rounded bg-white/5 motion-reduce:animate-none" />)}</div>;
  }
  if (error) {
    return (
      <div role="alert" className="rounded border border-red-400/30 bg-red-400/10 p-5 text-sm text-red-100">
        <p>{error}</p>
        <button type="button" onClick={load} className="mt-3 inline-flex items-center gap-2 border border-white/20 px-4 py-2 text-xs uppercase tracking-widest hover:bg-white/10"><RefreshCw className="h-3.5 w-3.5" aria-hidden /> Retry</button>
      </div>
    );
  }

  return (
    <section aria-labelledby="notif-settings-title" className="space-y-6">
      <div>
        <h2 id="notif-settings-title" className="text-lg font-semibold text-snow">Notification settings</h2>
        <p className="mt-1 text-sm text-silver">Choose what appears in your notification bell and what we email you.</p>
      </div>

      {emailCfg && !emailCfg.configured && (
        <p className="rounded border border-ice/20 bg-ice/5 px-4 py-3 text-xs text-ice" role="note">
          Email delivery isn’t switched on for this store yet, so email preferences are saved but no emails will be sent for now. In-app notifications work normally.
        </p>
      )}

      <div className="overflow-hidden rounded border border-white/10">
        <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-6 border-b border-white/10 bg-white/[0.03] px-4 py-2 text-[11px] uppercase tracking-widest text-silver">
          <span>Type</span><span className="w-11 text-center">In-app</span><span className="w-11 text-center">Email</span>
        </div>
        {ROWS.map((r) => (
          <div key={r.key} className="grid grid-cols-[1fr_auto_auto] items-center gap-x-6 border-b border-white/5 px-4 py-3 last:border-b-0">
            <div>
              <p className="text-sm text-snow">{r.label}</p>
              <p className="text-xs text-silver">{r.hint}</p>
            </div>
            <Toggle checked={!!prefs[r.key].inApp} onChange={(v) => toggle(r.key, 'inApp', v)} label={`${r.label} in-app`} disabled={saving} />
            <Toggle checked={!!prefs[r.key].email} onChange={(v) => toggle(r.key, 'email', v)} label={`${r.label} by email`} disabled={saving} />
          </div>
        ))}
      </div>

      <div className="flex items-start justify-between gap-6 rounded border border-white/10 p-4">
        <div>
          <p className="text-sm text-snow">Marketing emails</p>
          <p className="text-xs text-silver">Master switch for all promotional email. Off by default — we only email offers if you opt in. Each email includes an unsubscribe link.</p>
        </div>
        <Toggle checked={!!prefs.marketingEmails} onChange={(v) => save({ marketingEmails: v }, { ...prefs, marketingEmails: v })} label="Marketing emails" disabled={saving} />
      </div>

      <p className="flex items-center gap-2 text-xs text-silver"><ShieldCheck className="h-4 w-4 text-ice" aria-hidden /> Account and security alerts (password changes, new sign-ins) are always on.</p>
      <p role="status" aria-live="polite" className="h-4 text-xs text-ice">{saving ? <span className="inline-flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" aria-hidden /> Saving…</span> : status}</p>
    </section>
  );
};

export default NotificationSettingsPanel;
