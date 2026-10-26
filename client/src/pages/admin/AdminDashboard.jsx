import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { adminApi } from '../../services/api';
import { KpiSkeletonGrid, PanelSkeleton } from '../../components/common/Loader';
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Users,
  AlertTriangle,
  RefreshCw,
  Calendar,
  Truck,
  ArrowUpRight,
  Package,
  Layers,
  CheckCircle2,
  Clock,
  XCircle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

const AdminDashboard = () => {
  const [period, setPeriod] = useState('30d');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { period };
      if (period === 'custom' && dateFrom && dateTo) {
        params.dateFrom = dateFrom;
        params.dateTo = dateTo;
      }
      const res = await adminApi.getDashboardAnalytics(params);
      setData(res.data?.data || null);
    } catch (err) {
      console.error('[Dashboard Error]', err);
      setError(err.response?.data?.message || 'Failed to load live dashboard analytics.');
    } finally {
      setLoading(false);
    }
  }, [period, dateFrom, dateTo]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const formatPKR = (amount) => {
    const val = Number(amount) || 0;
    return `PKR ${val.toLocaleString('en-PK')}`;
  };

  const STATUS_COLORS = {
    confirmed: '#3B82F6',
    processing: '#6366F1',
    packing: '#8B5CF6',
    ready_for_dispatch: '#EC4899',
    assigned_to_rider: '#F59E0B',
    out_for_delivery: '#10B981',
    delivered: '#059669',
    cancelled: '#EF4444',
    return_requested: '#F97316',
    pending_payment: '#9CA3AF',
  };

  const kpis = data?.kpis || {};
  const dailyTrend = data?.dailyTrend || [];
  const statusDist = data?.orderStatusDistribution || [];
  const categories = data?.categoryPerformance || [];
  const topProducts = data?.topProducts || [];
  const lowStock = data?.lowStockAlerts || [];
  const rider = data?.riderPerformance || {};

  // First load: show placeholders instead of a page full of zeros
  if (loading && !data && !error) {
    return (
      <AdminLayout
        title="Operations & Performance Analytics"
        subtitle="Loading live metrics"
      >
        <div className="space-y-6" aria-busy="true">
          <KpiSkeletonGrid count={4} />
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <PanelSkeleton rows={6} />
            <PanelSkeleton rows={6} />
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title="Operations & Performance Analytics"
      subtitle="MongoDB-persisted metrics, real-time revenue breakdowns & stock intelligence"
    >
      {/* Date Range Toolbar */}
      <div className="bg-[#17191C] border border-white/10 p-4 rounded-sm mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Calendar size={18} className="text-ice" />
          <span className="text-xs uppercase tracking-wider text-silver">Filter Window:</span>
          {['7d', '30d', '90d', 'custom'].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 text-xs uppercase tracking-wider rounded transition ${
                period === p
                  ? 'bg-burgundy text-snow font-medium'
                  : 'bg-white/5 text-silver hover:text-snow hover:bg-white/10'
              }`}
            >
              {p === '7d' ? '7 Days' : p === '30d' ? '30 Days' : p === '90d' ? '90 Days' : 'Custom'}
            </button>
          ))}
        </div>

        {period === 'custom' && (
          <div className="flex items-center gap-2 text-xs">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="bg-[#1F2226] border border-white/10 text-snow px-2.5 py-1 rounded text-xs focus:outline-none focus:border-ice"
            />
            <span className="text-silver">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="bg-[#1F2226] border border-white/10 text-snow px-2.5 py-1 rounded text-xs focus:outline-none focus:border-ice"
            />
            <button
              onClick={fetchAnalytics}
              className="px-3 py-1 bg-burgundy hover:bg-burgundy/90 text-snow text-xs rounded transition"
            >
              Apply
            </button>
          </div>
        )}

        <button
          onClick={fetchAnalytics}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-ice border border-white/10 rounded text-xs tracking-wider transition ml-auto"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Refresh Real-time</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-300 p-4 rounded mb-6 text-xs">
          {error}
        </div>
      )}

      {/* KPI Highlight Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Gross Sales */}
        <div className="bg-[#17191C] border border-white/10 p-5 rounded-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-silver text-xs mb-2">
            <span>Gross Sales (Pre-Discount)</span>
            <DollarSign size={18} className="text-ice" />
          </div>
          <div className="text-xl lg:text-2xl font-serif text-snow tracking-wide">
            {formatPKR(kpis.grossSales)}
          </div>
          <div className="text-[11px] text-silver/70 mt-1 flex items-center justify-between">
            <span>Discounts: {formatPKR(kpis.totalDiscounts)}</span>
            <span className="text-ice">Tax: {formatPKR(kpis.totalTax)}</span>
          </div>
        </div>

        {/* Net Realized Revenue */}
        <div className="bg-[#17191C] border border-emerald-500/30 p-5 rounded-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-emerald-400 text-xs mb-2">
            <span>Net Realized Revenue</span>
            <TrendingUp size={18} />
          </div>
          <div className="text-xl lg:text-2xl font-serif text-emerald-400 tracking-wide font-medium">
            {formatPKR(kpis.netRevenue)}
          </div>
          <div className="text-[11px] text-silver/70 mt-1 flex items-center justify-between">
            <span>Refunds: {formatPKR(kpis.totalRefunds)}</span>
            <span className="text-emerald-400/80">{kpis.paidOrdersCount || 0} Paid</span>
          </div>
        </div>

        {/* Total Orders & AOV */}
        <div className="bg-[#17191C] border border-white/10 p-5 rounded-sm">
          <div className="flex items-center justify-between text-silver text-xs mb-2">
            <span>Orders & AOV</span>
            <ShoppingCart size={18} className="text-ice" />
          </div>
          <div className="text-xl lg:text-2xl font-serif text-snow tracking-wide">
            {kpis.totalOrders || 0}
          </div>
          <div className="text-[11px] text-silver/70 mt-1 flex items-center justify-between">
            <span>AOV: {formatPKR(kpis.averageOrderValue)}</span>
            <span className="text-amber-400">{formatPKR(kpis.codPendingAmount)} COD Unsettled</span>
          </div>
        </div>

        {/* Customer Base & Low Stock */}
        <div className="bg-[#17191C] border border-white/10 p-5 rounded-sm">
          <div className="flex items-center justify-between text-silver text-xs mb-2">
            <span>Customer Base & Stock</span>
            <Users size={18} className="text-ice" />
          </div>
          <div className="text-xl lg:text-2xl font-serif text-snow tracking-wide">
            {kpis.totalCustomers || 0}
          </div>
          <div className="text-[11px] text-silver/70 mt-1 flex items-center justify-between">
            <span className="text-emerald-400">+{kpis.newCustomers || 0} in window</span>
            {kpis.lowStockCount > 0 ? (
              <span className="text-amber-400 flex items-center gap-1 font-medium">
                <AlertTriangle size={12} /> {kpis.lowStockCount} Low Stock
              </span>
            ) : (
              <span className="text-emerald-400">Inventory Healthy</span>
            )}
          </div>
        </div>
      </div>

      {/* Primary Analytics Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Sales & Revenue Trend Chart (2 columns) */}
        <div className="lg:col-span-2 bg-[#17191C] border border-white/10 p-5 rounded-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-serif text-snow tracking-wider uppercase">
                Sales & Revenue Progression
              </h3>
              <p className="text-xs text-silver/70">
                Daily Gross Sales vs. Realized Paid Revenue (PKR)
              </p>
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1 text-ice">
                <span className="w-2.5 h-2.5 rounded-sm bg-ice"></span> Gross Sales
              </span>
              <span className="flex items-center gap-1 text-burgundy">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#762B3D]"></span> Paid Revenue
              </span>
            </div>
          </div>

          <div className="h-72 w-full">
            {dailyTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorGross" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#C9DDE8" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#C9DDE8" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorPaid" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#762B3D" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#762B3D" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#262A2E" />
                  <XAxis
                    dataKey="date"
                    stroke="#A9ADB3"
                    fontSize={11}
                    tickFormatter={(val) => val.slice(5)}
                  />
                  <YAxis
                    stroke="#A9ADB3"
                    fontSize={11}
                    tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1F2226',
                      borderColor: '#383D43',
                      borderRadius: '4px',
                      color: '#F8F7F4',
                      fontSize: '12px',
                    }}
                    formatter={(value) => [formatPKR(value)]}
                  />
                  <Area
                    type="monotone"
                    dataKey="grossSales"
                    name="Gross Sales"
                    stroke="#C9DDE8"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorGross)"
                  />
                  <Area
                    type="monotone"
                    dataKey="paidRevenue"
                    name="Paid Revenue"
                    stroke="#762B3D"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorPaid)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-silver/60 text-xs">
                No orders recorded in this date range.
              </div>
            )}
          </div>
        </div>

        {/* Order Status Distribution (1 column) */}
        <div className="bg-[#17191C] border border-white/10 p-5 rounded-sm flex flex-col">
          <h3 className="text-sm font-serif text-snow tracking-wider uppercase mb-1">
            Order Lifecycle Distribution
          </h3>
          <p className="text-xs text-silver/70 mb-3">Live status breakdown</p>

          <div className="h-56 w-full flex-1">
            {statusDist.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusDist}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                  >
                    {statusDist.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={STATUS_COLORS[entry.status] || '#A9ADB3'}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1F2226',
                      borderColor: '#383D43',
                      borderRadius: '4px',
                      color: '#F8F7F4',
                      fontSize: '11px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-silver/60 text-xs">
                No orders recorded.
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-white/5 text-[11px]">
            {statusDist.slice(0, 6).map((s) => (
              <div key={s.status} className="flex items-center justify-between text-silver">
                <span className="flex items-center gap-1.5 truncate">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: STATUS_COLORS[s.status] || '#A9ADB3' }}
                  ></span>
                  <span className="capitalize">{s.status.replace(/_/g, ' ')}</span>
                </span>
                <span className="text-snow font-medium ml-1">{s.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Category Performance & Rider Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Category Performance BarChart (2 columns) */}
        <div className="lg:col-span-2 bg-[#17191C] border border-white/10 p-5 rounded-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-serif text-snow tracking-wider uppercase">
                Category Sales & Volume
              </h3>
              <p className="text-xs text-silver/70">
                Revenue contribution and units dispatched by garment collection
              </p>
            </div>
            <Layers size={18} className="text-ice" />
          </div>

          <div className="h-64 w-full">
            {categories.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categories} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#262A2E" vertical={false} />
                  <XAxis
                    dataKey="category"
                    stroke="#A9ADB3"
                    fontSize={11}
                    angle={-15}
                    textAnchor="end"
                  />
                  <YAxis
                    stroke="#A9ADB3"
                    fontSize={11}
                    tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1F2226',
                      borderColor: '#383D43',
                      borderRadius: '4px',
                      color: '#F8F7F4',
                      fontSize: '12px',
                    }}
                    formatter={(val, name) => [
                      name === 'Revenue' ? formatPKR(val) : `${val} units`,
                      name,
                    ]}
                  />
                  <Bar dataKey="revenue" name="Revenue" fill="#762B3D" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="unitsSold" name="Units Sold" fill="#C9DDE8" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-silver/60 text-xs">
                No category sales recorded yet.
              </div>
            )}
          </div>
        </div>

        {/* Courier & Rider Performance (1 column) */}
        <div className="bg-[#17191C] border border-white/10 p-5 rounded-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-serif text-snow tracking-wider uppercase">
                Rider & Delivery Metrics
              </h3>
              <Truck size={18} className="text-ice" />
            </div>
            <p className="text-xs text-silver/70 mb-4">
              Real-time dispatch fulfillment & COD collection efficiency
            </p>

            <div className="space-y-3">
              <div className="p-3 bg-[#1F2226] border border-white/5 rounded flex items-center justify-between">
                <span className="text-xs text-silver">Total Delivery Runs</span>
                <span className="text-sm font-semibold text-snow">{rider.totalAssignments || 0}</span>
              </div>
              <div className="p-3 bg-[#1F2226] border border-white/5 rounded flex items-center justify-between">
                <span className="text-xs text-silver">Delivered Safely</span>
                <span className="text-sm font-semibold text-emerald-400">{rider.delivered || 0}</span>
              </div>
              <div className="p-3 bg-[#1F2226] border border-white/5 rounded flex items-center justify-between">
                <span className="text-xs text-silver">In Transit Courier</span>
                <span className="text-sm font-semibold text-ice">{rider.inTransit || 0}</span>
              </div>
              <div className="p-3 bg-[#1F2226] border border-white/5 rounded flex items-center justify-between">
                <span className="text-xs text-silver">Failed Deliveries</span>
                <span className="text-sm font-semibold text-red-400">{rider.failed || 0}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-white/10">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-silver">Delivery Success Rate</span>
              <span className="text-emerald-400 font-semibold">{rider.successRate || 0}%</span>
            </div>
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-400 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, rider.successRate || 0)}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Tables: Top Selling Products & Low Stock Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Selling Products */}
        <div className="bg-[#17191C] border border-white/10 p-5 rounded-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-serif text-snow tracking-wider uppercase">
              Top Selling Garments
            </h3>
            <Package size={16} className="text-ice" />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[10px] uppercase tracking-wider text-silver border-b border-white/10">
                <tr>
                  <th className="pb-2">Piece</th>
                  <th className="pb-2">SKU</th>
                  <th className="pb-2 text-right">Units</th>
                  <th className="pb-2 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-silver">
                {topProducts.length > 0 ? (
                  topProducts.map((p, idx) => (
                    <tr key={idx} className="hover:bg-white/5">
                      <td className="py-2.5 flex items-center gap-2.5 text-snow">
                        {p.image ? (
                          <img
                            src={p.image}
                            alt={p.name}
                            className="w-7 h-7 object-cover rounded bg-white/5"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded bg-white/5 flex items-center justify-center text-[10px] text-ice">
                            W
                          </div>
                        )}
                        <span className="truncate max-w-[160px] font-medium">{p.name}</span>
                      </td>
                      <td className="py-2.5 font-mono text-[11px] text-ice">{p.sku}</td>
                      <td className="py-2.5 text-right font-medium text-snow">{p.unitsSold}</td>
                      <td className="py-2.5 text-right font-medium text-emerald-400">
                        {formatPKR(p.revenue)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-silver/60">
                      No sales recorded in this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-[#17191C] border border-white/10 p-5 rounded-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-serif text-snow tracking-wider uppercase">
                Low Inventory Alerts
              </h3>
              <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[10px] uppercase font-semibold">
                &lt; 10 Units
              </span>
            </div>
            <AlertTriangle size={16} className="text-amber-400" />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[10px] uppercase tracking-wider text-silver border-b border-white/10">
                <tr>
                  <th className="pb-2">Piece</th>
                  <th className="pb-2">SKU</th>
                  <th className="pb-2 text-center">Remaining</th>
                  <th className="pb-2 text-right">Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-silver">
                {lowStock.length > 0 ? (
                  lowStock.map((item) => (
                    <tr key={item._id} className="hover:bg-white/5">
                      <td className="py-2.5 text-snow font-medium truncate max-w-[160px]">
                        {item.name}
                      </td>
                      <td className="py-2.5 font-mono text-[11px] text-ice">{item.sku}</td>
                      <td className="py-2.5 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            item.stockQuantity === 0
                              ? 'bg-red-500/20 text-red-400'
                              : 'bg-amber-500/20 text-amber-400'
                          }`}
                        >
                          {item.stockQuantity} remaining
                        </span>
                      </td>
                      <td className="py-2.5 text-right font-medium text-snow">
                        {formatPKR(item.salePrice || item.regularPrice)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-emerald-400/80">
                      All pieces are adequately stocked above alert thresholds.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
