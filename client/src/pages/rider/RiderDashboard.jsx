import React, { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import {
  Bike,
  CheckCircle2,
  Clock,
  LogOut,
  MapPin,
  Navigation,
  PackageCheck,
  Phone,
  RefreshCw,
  Store,
  User as UserIcon,
  Wallet,
  XCircle,
  AlertTriangle,
  Truck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { riderPortalApi } from '../../services/api';
import NotificationBell from '../../components/common/NotificationBell';
import { BrandLoader, InlineLoader, Skeleton, Spinner } from '../../components/common/Loader';

const DeliveryMap = lazy(() => import('../../components/rider/DeliveryMap'));

const STATUS_META = {
  pending_pickup: { label: 'Ready for pickup', tone: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  in_transit: { label: 'On the way', tone: 'bg-sky-500/15 text-sky-300 border-sky-500/30' },
  picked_up: { label: 'Picked up', tone: 'bg-sky-500/15 text-sky-300 border-sky-500/30' },
  completed: { label: 'Delivered', tone: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  failed: { label: 'Failed', tone: 'bg-red-500/15 text-red-300 border-red-500/30' },
};

const FAIL_REASONS = [
  'Customer not reachable',
  'Customer refused the parcel',
  'Wrong or incomplete address',
  'Customer asked to reschedule',
  'Other',
];

const formatPKR = (v) => `PKR ${(Number(v) || 0).toLocaleString('en-PK')}`;

const haversineKm = (a, b) => {
  if (!a || !b || a.lat == null || b.lat == null) return null;
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
};

const mapsLink = (point) => {
  const dest =
    point?.lat != null && point?.lng != null
      ? `${point.lat},${point.lng}`
      : encodeURIComponent(point?.address || '');
  return `https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=driving`;
};

const beep = () => {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch {
    /* sound is optional */
  }
};

/* ───────────────────────── Layout pieces ───────────────────────── */

const RiderHeader = ({ user, onLogout, onNewNotifications }) => (
  <header className="sticky top-0 z-30 h-16 bg-[#17191C]/95 backdrop-blur border-b border-white/10 px-4 sm:px-8 flex items-center justify-between">
    <Link to="/" className="flex items-center gap-2.5">
      <div className="w-8 h-8 rounded bg-burgundy/20 border border-burgundy flex items-center justify-center font-serif text-snow font-bold text-lg">
        W
      </div>
      <div className="leading-none">
        <span className="block font-serif tracking-widest text-sm text-snow font-semibold">WINTERWEAR</span>
        <span className="block mt-1 text-[10px] tracking-wider text-ice uppercase">Rider</span>
      </div>
    </Link>

    <div className="flex items-center gap-1 sm:gap-3">
      <NotificationBell onNew={onNewNotifications} />
      <Link
        to="/profile"
        className="hidden sm:flex items-center gap-2 px-2 py-1.5 rounded text-xs text-silver hover:text-snow hover:bg-white/5"
      >
        <UserIcon size={15} />
        <span className="max-w-[140px] truncate">{user.name}</span>
      </Link>
      <button
        type="button"
        onClick={onLogout}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs text-red-300 hover:bg-red-500/10"
        aria-label="Sign out"
      >
        <LogOut size={15} />
        <span className="hidden sm:inline">Sign out</span>
      </button>
    </div>
  </header>
);

const StatusScreen = ({ icon: Icon, tone, title, children, actions }) => (
  <div className="max-w-md mx-auto mt-16 px-4 text-center">
    <div
      className={`w-16 h-16 mx-auto mb-5 rounded-full border flex items-center justify-center ${tone}`}
    >
      <Icon size={30} />
    </div>
    <h1 className="font-editorial-serif text-3xl text-snow mb-3">{title}</h1>
    <div className="text-sm text-silver leading-relaxed space-y-3">{children}</div>
    {actions && <div className="mt-6 flex items-center justify-center gap-3">{actions}</div>}
  </div>
);

const Kpi = ({ icon: Icon, label, value }) => (
  <div className="bg-[#1F2226] border border-white/10 rounded p-4 flex items-center gap-3">
    <div className="w-9 h-9 rounded bg-white/5 border border-white/10 flex items-center justify-center text-ice shrink-0">
      <Icon size={16} />
    </div>
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-widest text-silver">{label}</p>
      <p className="text-lg font-serif text-snow truncate">{value}</p>
    </div>
  </div>
);

/* ───────────────────────── Delivery card ───────────────────────── */

const DeliveryCard = ({ delivery, selected, onSelect, riderPos, busy, onPickup, onDrop, onFail }) => {
  const [panel, setPanel] = useState(null); // 'drop' | 'fail' | null
  const [recipientName, setRecipientName] = useState('');
  const [otp, setOtp] = useState('');
  const [note, setNote] = useState('');
  const [reason, setReason] = useState(FAIL_REASONS[0]);

  const meta = STATUS_META[delivery.status] || STATUS_META.pending_pickup;
  const target = delivery.status === 'pending_pickup' ? delivery.pickup : delivery.drop;
  const km = haversineKm(riderPos, target);
  const itemCount = (delivery.order?.items || []).reduce((n, i) => n + i.quantity, 0);
  const isActive = ['pending_pickup', 'in_transit', 'picked_up'].includes(delivery.status);

  return (
    <article
      className={`bg-[#1F2226] border rounded transition-colors ${
        selected ? 'border-ice/60' : 'border-white/10'
      }`}
    >
      <button type="button" onClick={onSelect} className="w-full text-left p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-serif text-lg text-snow leading-tight">
              Order {delivery.order?.orderNumber || '—'}
            </p>
            <p className="text-[11px] text-silver/70 mt-0.5">
              {itemCount} item{itemCount === 1 ? '' : 's'}
              {delivery.priority !== 'standard' && ` · ${delivery.priority.replace('_', ' ')}`}
            </p>
          </div>
          <span className={`shrink-0 px-2.5 py-1 rounded border text-[10px] uppercase tracking-wider font-semibold ${meta.tone}`}>
            {meta.label}
          </span>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 text-xs">
          <div className="flex gap-2.5">
            <Store size={15} className="mt-0.5 text-amber-300 shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-widest text-silver/70">Pickup</p>
              <p className="text-snow">{delivery.pickup?.name || 'Warehouse'}</p>
              <p className="text-silver/80 leading-snug">{delivery.pickup?.address}</p>
            </div>
          </div>
          <div className="flex gap-2.5">
            <MapPin size={15} className="mt-0.5 text-burgundy-light shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-widest text-silver/70">Drop-off</p>
              <p className="text-snow">{delivery.drop.name}</p>
              <p className="text-silver/80 leading-snug">{delivery.drop.address}</p>
            </div>
          </div>
        </div>

        {delivery.order?.codAmount > 0 && (
          <p className="mt-3 inline-flex items-center gap-1.5 px-2 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-200">
            <Wallet size={12} /> Collect cash on delivery: {formatPKR(delivery.order.codAmount)}
          </p>
        )}
        {delivery.order?.deliveryNotes && (
          <p className="mt-2 text-[11px] text-silver/80">Note: {delivery.order.deliveryNotes}</p>
        )}
        {km != null && isActive && (
          <p className="mt-2 text-[11px] text-ice">
            {km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`} from you to the{' '}
            {delivery.status === 'pending_pickup' ? 'pickup point' : 'customer'}
          </p>
        )}
      </button>

      {isActive && (
        <div className="px-4 sm:px-5 pb-4 sm:pb-5 space-y-3">
          <div className="flex flex-wrap gap-2">
            {delivery.status === 'pending_pickup' && (
              <button
                type="button"
                disabled={busy}
                onClick={() => onPickup(delivery)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded bg-burgundy hover:bg-burgundy-hover text-snow text-xs font-bold uppercase tracking-widest disabled:opacity-60"
              >
                {busy ? <Spinner size={14} /> : <PackageCheck size={15} />} Confirm pickup
              </button>
            )}

            {delivery.status !== 'pending_pickup' && (
              <>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setPanel(panel === 'drop' ? null : 'drop')}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-widest disabled:opacity-60"
                >
                  <CheckCircle2 size={15} /> Mark delivered
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setPanel(panel === 'fail' ? null : 'fail')}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded border border-white/15 text-silver hover:text-snow hover:border-white/30 text-xs uppercase tracking-widest disabled:opacity-60"
                >
                  <XCircle size={15} /> Couldn&apos;t deliver
                </button>
              </>
            )}

            <a
              href={mapsLink(target)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded border border-white/15 text-ice hover:text-snow hover:border-ice/50 text-xs uppercase tracking-widest"
            >
              <Navigation size={15} /> Navigate
            </a>

            {delivery.drop.phone && (
              <a
                href={`tel:${delivery.drop.phone}`}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded border border-white/15 text-silver hover:text-snow text-xs uppercase tracking-widest"
              >
                <Phone size={15} /> Call customer
              </a>
            )}
          </div>

          {panel === 'drop' && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                onDrop(delivery, { recipientName: recipientName.trim(), otp: otp.trim(), notes: note.trim() });
              }}
              className="p-4 rounded border border-white/10 bg-white/[0.03] space-y-3"
            >
              <p className="text-xs text-snow font-medium">Confirm hand-over to the customer</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="Received by (name)"
                  className="bg-charcoal border border-white/10 rounded px-3 py-2 text-xs text-snow focus:outline-none focus:border-cream"
                />
                <input
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="Delivery code (optional)"
                  inputMode="numeric"
                  className="bg-charcoal border border-white/10 rounded px-3 py-2 text-xs text-snow focus:outline-none focus:border-cream"
                />
              </div>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Note (optional)"
                className="w-full bg-charcoal border border-white/10 rounded px-3 py-2 text-xs text-snow focus:outline-none focus:border-cream"
              />
              {delivery.order?.codAmount > 0 && (
                <p className="text-[11px] text-amber-200">
                  Make sure you have collected {formatPKR(delivery.order.codAmount)} in cash before confirming.
                </p>
              )}
              <button
                type="submit"
                disabled={busy}
                className="inline-flex items-center gap-2 px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-widest disabled:opacity-60"
              >
                {busy && <Spinner size={14} />} Confirm delivery
              </button>
            </form>
          )}

          {panel === 'fail' && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                onFail(delivery, reason);
              }}
              className="p-4 rounded border border-white/10 bg-white/[0.03] space-y-3"
            >
              <p className="text-xs text-snow font-medium">Why could the parcel not be delivered?</p>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full bg-charcoal border border-white/10 rounded px-3 py-2 text-xs text-snow focus:outline-none focus:border-cream"
              >
                {FAIL_REASONS.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
              <button
                type="submit"
                disabled={busy}
                className="inline-flex items-center gap-2 px-4 py-2 rounded bg-red-600 hover:bg-red-500 text-white text-xs font-bold uppercase tracking-widest disabled:opacity-60"
              >
                {busy && <Spinner size={14} />} Report failed delivery
              </button>
            </form>
          )}
        </div>
      )}
    </article>
  );
};

/* ───────────────────────── Main page ───────────────────────── */

const RiderDashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, logout, refreshUser } = useAuth();

  const [scope, setScope] = useState('active'); // 'active' | 'history'
  const [deliveries, setDeliveries] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [toast, setToast] = useState(null);
  const [riderPos, setRiderPos] = useState(null);
  const [geoState, setGeoState] = useState('idle'); // idle | on | denied | unsupported
  const lastSentRef = useRef(0);

  const isApproved =
    !!user && (user.role !== 'rider' || (user.approvalStatus || 'approved') === 'approved');

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const load = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setLoading(true);
      setError('');
      try {
        const [list, sum] = await Promise.all([
          riderPortalApi.getMyDeliveries({ scope }),
          riderPortalApi.getSummary().catch(() => null),
        ]);
        setDeliveries(list.data?.data || []);
        setSummary(sum?.data?.data || null);
      } catch (err) {
        setError(err.response?.data?.message || 'Could not load your deliveries.');
      } finally {
        setLoading(false);
      }
    },
    [scope]
  );

  // Load deliveries + poll as a safety net (notifications trigger an instant reload)
  useEffect(() => {
    if (!isApproved) return undefined;
    load();
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') load({ silent: true });
    }, 30000);
    return () => clearInterval(timer);
  }, [isApproved, load]);

  // Live location of the rider
  useEffect(() => {
    if (!isApproved || user?.role !== 'rider') return undefined;
    if (!('geolocation' in navigator)) {
      setGeoState('unsupported');
      return undefined;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const point = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setRiderPos(point);
        setGeoState('on');
        if (Date.now() - lastSentRef.current > 30000) {
          lastSentRef.current = Date.now();
          riderPortalApi.updateLocation(point.lat, point.lng).catch(() => {});
        }
      },
      (err) => setGeoState(err.code === 1 ? 'denied' : 'idle'),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [isApproved, user?.role]);

  // Keep the pending screen fresh so approval shows up without a manual refresh
  useEffect(() => {
    if (!user || user.role !== 'rider' || isApproved) return undefined;
    const timer = setInterval(() => refreshUser(), 15000);
    return () => clearInterval(timer);
  }, [user, isApproved, refreshUser]);

  // Select the first delivery automatically
  useEffect(() => {
    if (deliveries.length && !deliveries.some((d) => d._id === selectedId)) {
      setSelectedId(deliveries[0]._id);
    }
  }, [deliveries, selectedId]);

  const handleNewNotifications = useCallback(
    (incoming) => {
      // the bell reports one notification at a time (or a list); handle both
      const fresh = Array.isArray(incoming) ? incoming : [incoming];
      if (fresh.some((n) => n?.type === 'rider_assigned')) {
        beep();
        showToast('New delivery assigned to you!');
        setScope('active');
        load({ silent: true });
      }
      if (fresh.some((n) => n?.type === 'rider_approved')) {
        showToast('Your rider account has been approved.');
        refreshUser();
      }
    },
    [load, refreshUser, showToast]
  );

  const runAction = async (delivery, request, successMessage) => {
    setBusyId(delivery._id);
    try {
      await request();
      showToast(successMessage);
      await load({ silent: true });
    } catch (err) {
      showToast(err.response?.data?.message || 'Action failed. Please try again.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  /* ── Gates ── */
  if (authLoading) return <BrandLoader fullScreen label="Loading your workspace" />;
  if (!user) return <Navigate to="/login?redirect=/rider" replace />;
  if (!['rider', 'admin', 'super_admin'].includes(user.role)) return <Navigate to="/" replace />;

  const approval = user.role === 'rider' ? user.approvalStatus || 'approved' : 'approved';

  if (approval !== 'approved') {
    return (
      <div className="min-h-screen bg-[#111315] text-snow">
        <RiderHeader user={user} onLogout={handleLogout} onNewNotifications={handleNewNotifications} />
        {approval === 'pending' ? (
          <StatusScreen
            icon={Clock}
            tone="border-amber-500/40 bg-amber-500/10 text-amber-300"
            title="Waiting for confirmation"
            actions={
              <>
                <button
                  type="button"
                  onClick={() => refreshUser()}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded bg-burgundy hover:bg-burgundy-hover text-snow text-xs font-bold uppercase tracking-widest"
                >
                  <RefreshCw size={14} /> Check status
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="px-4 py-2.5 rounded border border-white/15 text-silver hover:text-snow text-xs uppercase tracking-widest"
                >
                  Sign out
                </button>
              </>
            }
          >
            <p>
              Thanks for applying, <span className="text-snow">{user.name}</span>. Your rider account has been
              sent to the WinterWear admin team.
            </p>
            <p>
              You&apos;ll be able to receive deliveries as soon as an admin confirms your account. This page
              updates automatically, so you can leave it open.
            </p>
          </StatusScreen>
        ) : (
          <StatusScreen
            icon={XCircle}
            tone="border-red-500/40 bg-red-500/10 text-red-300"
            title="Application not approved"
            actions={
              <button
                type="button"
                onClick={handleLogout}
                className="px-4 py-2.5 rounded border border-white/15 text-silver hover:text-snow text-xs uppercase tracking-widest"
              >
                Sign out
              </button>
            }
          >
            <p>Unfortunately your rider application was not approved.</p>
            {user.approvalNote && <p className="text-silver/90">Reason: {user.approvalNote}</p>}
            <p>Please contact the WinterWear team if you think this is a mistake.</p>
          </StatusScreen>
        )}
      </div>
    );
  }

  const selected = deliveries.find((d) => d._id === selectedId) || null;
  const mapTarget = selected;

  return (
    <div className="min-h-screen bg-[#111315] text-snow">
      <RiderHeader user={user} onLogout={handleLogout} onNewNotifications={handleNewNotifications} />

      {toast && (
        <div
          role="status"
          className={`fixed top-20 right-4 z-50 px-4 py-2.5 rounded shadow-lg text-xs flex items-center gap-2 border ${
            toast.type === 'error'
              ? 'bg-red-900/90 border-red-500/40 text-red-100'
              : 'bg-burgundy border-white/20 text-snow'
          }`}
        >
          {toast.type === 'error' ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} className="text-emerald-300" />}
          {toast.message}
        </div>
      )}

      <main className="max-w-6xl mx-auto px-4 sm:px-8 py-6 space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-editorial-serif text-3xl text-snow">Hello, {user.name.split(' ')[0]}</h1>
            <p className="text-xs text-silver mt-1">Your deliveries for today. New orders appear here the moment they are assigned.</p>
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded border ${
                geoState === 'on'
                  ? 'border-emerald-500/30 text-emerald-300 bg-emerald-500/10'
                  : 'border-white/10 text-silver bg-white/5'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${geoState === 'on' ? 'bg-emerald-400' : 'bg-silver/50'}`} />
              {geoState === 'on' && 'Location on'}
              {geoState === 'denied' && 'Location blocked'}
              {geoState === 'unsupported' && 'Location unavailable'}
              {geoState === 'idle' && 'Locating…'}
            </span>
            <button
              type="button"
              onClick={() => load()}
              className="inline-flex items-center gap-1.5 text-ice hover:text-snow"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
        </div>

        {geoState === 'denied' && (
          <p className="text-[11px] text-amber-200 bg-amber-500/10 border border-amber-500/30 rounded px-3 py-2">
            Location access is blocked, so your position will not show on the map. Allow location for this site
            in your browser settings to see yourself on the map and the distance to each stop.
          </p>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Kpi icon={Truck} label="Assigned today" value={summary?.totalToday ?? '—'} />
          <Kpi icon={CheckCircle2} label="Delivered today" value={summary?.deliveredToday ?? '—'} />
          <Kpi icon={Clock} label="Open deliveries" value={summary?.pendingToday ?? '—'} />
          <Kpi icon={Wallet} label="COD collected" value={summary ? formatPKR(summary.codCollectedToday) : '—'} />
        </div>

        <div className="flex gap-2">
          {[
            { id: 'active', label: 'Active' },
            { id: 'history', label: 'History' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setScope(t.id)}
              className={`px-4 py-2 rounded text-xs uppercase tracking-wider font-medium transition-colors ${
                scope === t.id ? 'bg-burgundy text-snow' : 'text-silver hover:text-snow hover:bg-white/5'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-300 p-3 rounded text-xs">{error}</div>
        )}

        {loading && deliveries.length === 0 ? (
          <InlineLoader label="Loading deliveries" />
        ) : deliveries.length === 0 ? (
          <div className="bg-[#1F2226] border border-white/10 rounded py-16 px-6 text-center">
            <Bike className="mx-auto mb-3 text-silver/50" size={34} />
            <p className="text-sm text-snow">
              {scope === 'active' ? 'No active deliveries right now' : 'No completed deliveries yet'}
            </p>
            {scope === 'active' && (
              <p className="text-xs text-silver/70 mt-1">
                You&apos;ll get a notification as soon as an order is assigned to you.
              </p>
            )}
          </div>
        ) : (
          <div className="grid lg:grid-cols-5 gap-6 items-start">
            <div className="lg:col-span-3 space-y-4">
              {deliveries.map((d) => (
                <DeliveryCard
                  key={d._id}
                  delivery={d}
                  selected={d._id === selectedId}
                  onSelect={() => setSelectedId(d._id)}
                  riderPos={riderPos}
                  busy={busyId === d._id}
                  onPickup={(del) =>
                    runAction(del, () => riderPortalApi.pickup(del._id), 'Pickup confirmed. Drive safe!')
                  }
                  onDrop={(del, body) =>
                    runAction(del, () => riderPortalApi.drop(del._id, body), 'Delivery completed. Great job!')
                  }
                  onFail={(del, reason) =>
                    runAction(del, () => riderPortalApi.fail(del._id, { reason }), 'Delivery marked as failed.')
                  }
                />
              ))}
            </div>

            <aside className="lg:col-span-2 lg:sticky lg:top-24 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs uppercase tracking-widest text-snow font-semibold">
                  {mapTarget ? `Route · Order ${mapTarget.order?.orderNumber || ''}` : 'Route'}
                </h2>
                <div className="flex items-center gap-3 text-[10px] text-silver">
                  <span className="flex items-center gap-1"><i className="w-2 h-2 rounded-full bg-amber-700 inline-block" /> Pickup</span>
                  <span className="flex items-center gap-1"><i className="w-2 h-2 rounded-full bg-burgundy inline-block" /> Drop</span>
                  <span className="flex items-center gap-1"><i className="w-2 h-2 rounded-full bg-blue-600 inline-block" /> You</span>
                </div>
              </div>

              <Suspense fallback={<Skeleton className="h-72 lg:h-[420px] w-full" />}>
                <DeliveryMap
                  pickup={mapTarget?.pickup}
                  drop={mapTarget?.drop}
                  rider={riderPos}
                />
              </Suspense>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
};

export default RiderDashboard;
