import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import { inventoryApi, adminApi } from '../../services/api';
import { KpiSkeletonGrid, PanelSkeleton } from '../../components/common/Loader';
import {
  Boxes,
  PackageCheck,
  Lock,
  PackageX,
  AlertTriangle,
  Warehouse,
  RefreshCw,
  ArrowDownToLine,
  ArrowUpFromLine,
  History,
  ArrowUpRight,
  TrendingDown,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

const num = (v) => (Number(v) || 0).toLocaleString('en-PK');

const MOVEMENT_LABELS = {
  purchase_in: 'Purchase received',
  sales_out: 'Sale dispatched',
  reservation_hold: 'Reserved for order',
  reservation_release: 'Reservation released',
  return_in: 'Customer return',
  damage_writeoff: 'Damage write-off',
  transfer_in: 'Transfer in',
  transfer_out: 'Transfer out',
  manual_adjustment: 'Manual adjustment',
};

const timeAgo = (value) => {
  const diff = Date.now() - new Date(value).getTime();
  if (Number.isNaN(diff)) return '';
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

const KpiCard = ({ icon: Icon, label, value, hint, tone = 'default' }) => {
  const toneClass =
    tone === 'danger'
      ? 'text-red-300 bg-red-500/10 border-red-500/30'
      : tone === 'warn'
        ? 'text-amber-300 bg-amber-500/10 border-amber-500/30'
        : 'text-ice bg-white/5 border-white/10';

  return (
    <div className="bg-[#1F2226] border border-white/10 rounded p-5 flex items-start gap-4">
      <div className={`w-10 h-10 rounded border flex items-center justify-center shrink-0 ${toneClass}`}>
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-widest text-silver">{label}</p>
        <p className="text-2xl font-serif text-snow mt-1">{value}</p>
        {hint && <p className="text-[11px] text-silver/70 mt-1">{hint}</p>}
      </div>
    </div>
  );
};

const Panel = ({ title, action, children, className = '' }) => (
  <section className={`bg-[#1F2226] border border-white/10 rounded ${className}`}>
    <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between gap-3">
      <h3 className="text-sm uppercase tracking-widest text-snow font-semibold">{title}</h3>
      {action}
    </div>
    <div className="p-5">{children}</div>
  </section>
);

const InventoryDashboard = () => {
  const [data, setData] = useState(null);
  const [reorders, setReorders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [dash, demand] = await Promise.allSettled([
        inventoryApi.getDashboard(),
        adminApi.getInventoryDemand(),
      ]);

      if (dash.status === 'rejected') throw dash.reason;
      setData(dash.value.data?.data || null);

      if (demand.status === 'fulfilled') {
        const list = demand.value.data?.data?.insights || [];
        setReorders(list.filter((i) => i.needsReorder).slice(0, 6));
      } else {
        setReorders([]);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load the inventory dashboard.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const totals = data?.totals;
  const flow = (data?.stockFlow || []).map((d) => ({
    ...d,
    label: d.date.slice(5),
  }));
  const maxWarehouseStock = Math.max(1, ...(data?.byWarehouse || []).map((w) => w.onHand));

  return (
    <AdminLayout
      title="Inventory Dashboard"
      subtitle="Stock levels, restock alerts and warehouse activity"
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-silver">
            Live summary of every warehouse. Available = on hand − reserved − damaged.
          </p>
          <div className="flex gap-2">
            <Link
              to="/admin/inventory"
              className="px-4 py-2 border border-white/20 hover:border-white text-snow text-[11px] uppercase tracking-widest transition inline-flex items-center gap-2"
            >
              Adjust stock <ArrowUpRight size={13} />
            </Link>
            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="px-4 py-2 bg-burgundy hover:bg-burgundy/90 text-snow text-[11px] uppercase tracking-widest transition inline-flex items-center gap-2 disabled:opacity-60"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
        </div>

        {error && (
          <div role="alert" className="p-4 rounded border border-red-500/30 bg-red-500/10 text-red-300 text-sm">
            {error}
          </div>
        )}

        {loading && !data && !error && (
          <div className="space-y-6" aria-busy="true">
            <KpiSkeletonGrid count={8} />
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <PanelSkeleton rows={6} />
              <PanelSkeleton rows={6} />
            </div>
          </div>
        )}

        {totals && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <KpiCard icon={Boxes} label="Units on hand" value={num(totals.onHand)} hint={`${num(totals.skuRecords)} SKU records`} />
              <KpiCard icon={PackageCheck} label="Available to sell" value={num(totals.available)} hint="After reservations and damage" />
              <KpiCard icon={Lock} label="Reserved" value={num(totals.reserved)} hint="Held for open orders" />
              <KpiCard icon={Warehouse} label="Active warehouses" value={num(totals.warehouses)} />
              <KpiCard icon={AlertTriangle} label="Low stock" value={num(totals.lowStock)} hint="At or below reorder level" tone={totals.lowStock ? 'warn' : 'default'} />
              <KpiCard icon={PackageX} label="Out of stock" value={num(totals.outOfStock)} hint="Zero available units" tone={totals.outOfStock ? 'danger' : 'default'} />
              <KpiCard icon={TrendingDown} label="Damaged" value={num(totals.damaged)} hint="Written off / quarantined" tone={totals.damaged ? 'warn' : 'default'} />
              <KpiCard
                icon={History}
                label="Movements (14d)"
                value={num(flow.reduce((a, d) => a + d.movements, 0))}
                hint="Logged stock changes"
              />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <Panel title="Stock in vs out · last 14 days" className="xl:col-span-2">
                {flow.every((d) => d.stockIn === 0 && d.stockOut === 0) ? (
                  <p className="text-sm text-silver py-16 text-center">
                    No stock movements recorded in the last 14 days.
                  </p>
                ) : (
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={flow} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                        <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                        <XAxis dataKey="label" tick={{ fill: '#A9ADB3', fontSize: 11 }} tickLine={false} axisLine={false} />
                        <YAxis allowDecimals={false} tick={{ fill: '#A9ADB3', fontSize: 11 }} tickLine={false} axisLine={false} />
                        <Tooltip
                          cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                          contentStyle={{ background: '#17191C', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 4, fontSize: 12 }}
                          labelStyle={{ color: '#EDE7DC' }}
                        />
                        <Legend wrapperStyle={{ fontSize: 12, color: '#A9ADB3' }} />
                        <Bar dataKey="stockIn" name="Stock in" fill="#A5C4D4" radius={[2, 2, 0, 0]} />
                        <Bar dataKey="stockOut" name="Stock out" fill="#8F394C" radius={[2, 2, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </Panel>

              <Panel title="Stock by warehouse">
                {data.byWarehouse.length === 0 ? (
                  <p className="text-sm text-silver">No inventory has been added to any warehouse yet.</p>
                ) : (
                  <ul className="space-y-4">
                    {data.byWarehouse.map((w) => (
                      <li key={String(w.warehouseId)}>
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-sm text-snow truncate">
                            {w.name}
                            {w.city ? <span className="text-silver/70"> · {w.city}</span> : null}
                          </span>
                          <span className="text-xs text-silver shrink-0">{num(w.onHand)} units</span>
                        </div>
                        <div className="h-1.5 mt-2 bg-white/10 rounded overflow-hidden">
                          <div
                            className="h-full bg-ice/80"
                            style={{ width: `${Math.round((w.onHand / maxWarehouseStock) * 100)}%` }}
                          />
                        </div>
                        <p className="text-[11px] text-silver/70 mt-1.5">
                          {num(w.available)} available · {num(w.skuRecords)} SKUs
                          {w.attention > 0 && (
                            <span className="text-amber-300"> · {w.attention} need attention</span>
                          )}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <Panel
                title="Needs restocking now"
                action={
                  <Link to="/admin/inventory" className="text-[11px] uppercase tracking-widest text-ice hover:text-snow">
                    Open inventory
                  </Link>
                }
              >
                {data.attentionItems.length === 0 ? (
                  <p className="text-sm text-silver">Every SKU is above its reorder level.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="text-[11px] uppercase tracking-widest text-silver border-b border-white/10">
                          <th className="py-2 pr-3 font-medium">Product</th>
                          <th className="py-2 pr-3 font-medium">Warehouse</th>
                          <th className="py-2 pr-3 font-medium text-right">Avail.</th>
                          <th className="py-2 font-medium text-right">Reorder at</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.attentionItems.map((item) => (
                          <tr key={item._id} className="border-b border-white/5 last:border-0">
                            <td className="py-2.5 pr-3">
                              <p className="text-snow">{item.product?.name || item.sku}</p>
                              <p className="text-[11px] text-silver/70">
                                {item.sku}
                                {item.variant?.size ? ` · ${item.variant.size}` : ''}
                              </p>
                            </td>
                            <td className="py-2.5 pr-3 text-silver">{item.warehouse?.name || '—'}</td>
                            <td className="py-2.5 pr-3 text-right">
                              <span
                                className={`inline-block min-w-[2rem] px-2 py-0.5 rounded text-xs ${
                                  item.availableQty === 0
                                    ? 'bg-red-500/15 text-red-300'
                                    : 'bg-amber-500/15 text-amber-300'
                                }`}
                              >
                                {item.availableQty}
                              </span>
                            </td>
                            <td className="py-2.5 text-right text-silver">{item.reorderThreshold}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Panel>

              <Panel title="Suggested reorders (sales velocity)">
                {reorders.length === 0 ? (
                  <p className="text-sm text-silver">
                    No reorder suggestions right now. Suggestions appear once products sell down.
                  </p>
                ) : (
                  <ul className="divide-y divide-white/5">
                    {reorders.map((r) => (
                      <li key={r.productId} className="py-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm text-snow truncate">{r.name}</p>
                          <p className="text-[11px] text-silver/70">
                            {r.currentStock} in stock · {r.unitsSold30d} sold in 30d ·{' '}
                            {r.daysOfStockRemaining >= 999 ? 'no recent sales' : `~${r.daysOfStockRemaining} days left`}
                          </p>
                        </div>
                        <span className="shrink-0 text-xs px-2 py-1 rounded bg-burgundy/20 border border-burgundy/40 text-cream">
                          Order {r.suggestedReorderQty}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            </div>

            <Panel
              title="Recent stock movements"
              action={
                <Link to="/admin/inventory" className="text-[11px] uppercase tracking-widest text-ice hover:text-snow">
                  Full history
                </Link>
              }
            >
              {data.recentMovements.length === 0 ? (
                <p className="text-sm text-silver">No stock movements have been logged yet.</p>
              ) : (
                <ul className="divide-y divide-white/5">
                  {data.recentMovements.map((m) => {
                    const delta = (m.newOnHand ?? 0) - (m.previousOnHand ?? 0);
                    const inbound = delta >= 0;
                    return (
                      <li key={m._id} className="py-3 flex items-center gap-4">
                        <div
                          className={`w-8 h-8 rounded flex items-center justify-center shrink-0 ${
                            inbound ? 'bg-ice/10 text-ice' : 'bg-burgundy/20 text-burgundy-light'
                          }`}
                        >
                          {inbound ? <ArrowDownToLine size={15} /> : <ArrowUpFromLine size={15} />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-snow truncate">
                            {MOVEMENT_LABELS[m.movementType] || m.movementType} · {m.sku}
                          </p>
                          <p className="text-[11px] text-silver/70 truncate">
                            {m.warehouse?.name || 'Warehouse'} ·{' '}
                            {m.performedBy?.name || m.performedBy?.email || 'System'} · {m.reason}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`text-sm font-medium ${inbound ? 'text-ice' : 'text-red-300'}`}>
                            {delta > 0 ? '+' : ''}
                            {delta}
                          </p>
                          <p className="text-[11px] text-silver/70">{timeAgo(m.createdAt)}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default InventoryDashboard;
