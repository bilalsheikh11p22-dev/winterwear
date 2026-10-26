import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { adminApi } from '../../services/api';
import {
  TrendingUp,
  Package,
  AlertTriangle,
  Users,
  Sparkles,
  Search,
  DollarSign,
  Truck,
  RotateCcw,
  CheckCircle,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  Send,
} from 'lucide-react';

export default function AdminAnalytics() {
  const [activeTab, setActiveTab] = useState('overview'); // overview | inventory | customers | bi_assistant

  // Analytics states
  const [loading, setLoading] = useState(true);
  const [productData, setProductData] = useState([]);
  const [customerData, setCustomerData] = useState({ totalCustomers: 0, repeatCustomers: 0, topCustomers: [] });
  const [inventoryDemand, setInventoryDemand] = useState({ inventoryVelocity: [] });
  const [deliveryStats, setDeliveryStats] = useState({ totalAssignments: 0, delivered: 0, codDiscrepancyCount: 0 });
  const [campaignStats, setCampaignStats] = useState({ coupons: [] });

  // AI BI Assistant states
  const [biQuery, setBiQuery] = useState('');
  const [biLoading, setBiLoading] = useState(false);
  const [biInsights, setBiInsights] = useState(null);

  useEffect(() => {
    fetchDashboardAnalytics();
  }, []);

  const fetchDashboardAnalytics = async () => {
    setLoading(true);
    try {
      const [prodRes, custRes, invRes, delivRes, campRes] = await Promise.allSettled([
        adminApi.getProductAnalytics(),
        adminApi.getCustomerAnalytics(),
        adminApi.getInventoryDemand(),
        adminApi.getDeliveryAnalytics(),
        adminApi.getCampaignAnalytics(),
      ]);

      if (prodRes.status === 'fulfilled') setProductData(prodRes.value.data.data.products || []);
      if (custRes.status === 'fulfilled') setCustomerData(custRes.value.data.data || {});
      if (invRes.status === 'fulfilled') setInventoryDemand(invRes.value.data.data || { inventoryVelocity: [] });
      if (delivRes.status === 'fulfilled') setDeliveryStats(delivRes.value.data.data || {});
      if (campRes.status === 'fulfilled') setCampaignStats(campRes.value.data.data || { coupons: [] });
    } catch (err) {
      console.error('Failed to load BI metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAskBIAssistant = async (e) => {
    e?.preventDefault();
    if (!biQuery.trim() || biLoading) return;

    setBiLoading(true);
    try {
      const res = await adminApi.getBusinessInsights({
        query: biQuery,
        timeframe: '30d',
      });
      setBiInsights(res.data.data);
    } catch (err) {
      console.error('BI Assistant error:', err);
    } finally {
      setBiLoading(false);
    }
  };

  return (
    <AdminLayout
      title="Business Intelligence & Predictive Analytics"
      subtitle="Verified telemetry, inventory demand velocity & AI executive advisory"
    >
      <div className="space-y-6">
        {/* Navigation Tabs */}
        <div className="flex border-b border-white/10 gap-6">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-3 text-xs uppercase tracking-wider font-medium transition relative ${
              activeTab === 'overview' ? 'text-ice' : 'text-silver hover:text-snow'
            }`}
          >
            Executive Summary
            {activeTab === 'overview' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-ice" />}
          </button>

          <button
            onClick={() => setActiveTab('inventory')}
            className={`pb-3 text-xs uppercase tracking-wider font-medium transition relative ${
              activeTab === 'inventory' ? 'text-ice' : 'text-silver hover:text-snow'
            }`}
          >
            Inventory Velocity & Demand
            {activeTab === 'inventory' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-ice" />}
          </button>

          <button
            onClick={() => setActiveTab('customers')}
            className={`pb-3 text-xs uppercase tracking-wider font-medium transition relative ${
              activeTab === 'customers' ? 'text-ice' : 'text-silver hover:text-snow'
            }`}
          >
            Customer LTV & Retention
            {activeTab === 'customers' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-ice" />}
          </button>

          <button
            onClick={() => setActiveTab('bi_assistant')}
            className={`pb-3 text-xs uppercase tracking-wider font-medium transition relative flex items-center gap-1.5 ${
              activeTab === 'bi_assistant' ? 'text-ice' : 'text-silver hover:text-snow'
            }`}
          >
            <Sparkles size={14} className="text-ice" />
            AI Business Insights
            {activeTab === 'bi_assistant' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-ice" />}
          </button>
        </div>

        {/* Tab 1: Executive Summary */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Top Stat KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[#1F2226] border border-white/10 p-5 rounded-sm">
                <div className="flex items-center justify-between text-silver mb-2">
                  <span className="text-xs uppercase tracking-wider">Catalogue Items</span>
                  <Package size={18} className="text-ice" />
                </div>
                <div className="text-2xl font-serif text-snow">{productData.length} Garments</div>
                <div className="text-[11px] text-silver/60 mt-1">Active in atelier store</div>
              </div>

              <div className="bg-[#1F2226] border border-white/10 p-5 rounded-sm">
                <div className="flex items-center justify-between text-silver mb-2">
                  <span className="text-xs uppercase tracking-wider">Repeat Customer Rate</span>
                  <Users size={18} className="text-emerald-400" />
                </div>
                <div className="text-2xl font-serif text-snow">
                  {customerData.totalCustomers > 0
                    ? Math.round((customerData.repeatCustomers / customerData.totalCustomers) * 100)
                    : 0}
                  %
                </div>
                <div className="text-[11px] text-emerald-400 mt-1">
                  {customerData.repeatCustomers} of {customerData.totalCustomers} registered
                </div>
              </div>

              <div className="bg-[#1F2226] border border-white/10 p-5 rounded-sm">
                <div className="flex items-center justify-between text-silver mb-2">
                  <span className="text-xs uppercase tracking-wider">Delivery Success Rate</span>
                  <Truck size={18} className="text-cream" />
                </div>
                <div className="text-2xl font-serif text-snow">
                  {deliveryStats.totalAssignments > 0
                    ? Math.round((deliveryStats.delivered / deliveryStats.totalAssignments) * 100)
                    : 100}
                  %
                </div>
                <div className="text-[11px] text-silver/60 mt-1">
                  {deliveryStats.delivered} delivered across routes
                </div>
              </div>

              <div className="bg-[#1F2226] border border-white/10 p-5 rounded-sm">
                <div className="flex items-center justify-between text-silver mb-2">
                  <span className="text-xs uppercase tracking-wider">COD Discrepancies</span>
                  <AlertTriangle size={18} className="text-amber-400" />
                </div>
                <div className="text-2xl font-serif text-snow">
                  {deliveryStats.codDiscrepancyCount || 0} Flags
                </div>
                <div className="text-[11px] text-amber-400 mt-1">Audit verified in finance</div>
              </div>
            </div>

            {/* Product Performance Table */}
            <div className="bg-[#1F2226] border border-white/10 rounded-sm overflow-hidden">
              <div className="p-4 bg-[#17191C] border-b border-white/10 flex items-center justify-between">
                <div>
                  <h3 className="text-xs uppercase tracking-widest text-snow font-medium">
                    Garment Revenue & Velocity Ranking
                  </h3>
                  <p className="text-[11px] text-silver/60">
                    Gross revenue, units sold and customer sentiment by SKU
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#151719] text-silver/70 border-b border-white/5 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Garment</th>
                      <th className="py-3 px-4">SKU</th>
                      <th className="py-3 px-4">Units Sold</th>
                      <th className="py-3 px-4">Gross Revenue</th>
                      <th className="py-3 px-4">Return Rate</th>
                      <th className="py-3 px-4">Avg Rating</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-snow/90">
                    {productData.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="py-8 text-center text-silver/60">
                          No order history recorded yet.
                        </td>
                      </tr>
                    ) : (
                      productData.map((item) => (
                        <tr key={item.productId} className="hover:bg-white/[0.02]">
                          <td className="py-3 px-4 font-medium">{item.name}</td>
                          <td className="py-3 px-4 text-silver/70">{item.sku}</td>
                          <td className="py-3 px-4">{item.unitsSold} pcs</td>
                          <td className="py-3 px-4 text-cream font-medium">
                            PKR {(item.revenue || 0).toLocaleString()}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] ${
                                item.returnRate > 15
                                  ? 'bg-rose-500/20 text-rose-300'
                                  : 'bg-emerald-500/20 text-emerald-300'
                              }`}
                            >
                              {item.returnRate}%
                            </span>
                          </td>
                          <td className="py-3 px-4 text-amber-300">★ {item.rating}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Inventory Velocity & Demand */}
        {activeTab === 'inventory' && (
          <div className="space-y-6">
            <div className="bg-[#1F2226] border border-white/10 rounded-sm overflow-hidden">
              <div className="p-4 bg-[#17191C] border-b border-white/10">
                <h3 className="text-xs uppercase tracking-widest text-snow font-medium">
                  30-Day Predictive Stock Depletion & Demand Velocity
                </h3>
                <p className="text-[11px] text-silver/60">
                  Calculated based on rolling 30-day sales velocity and warehouse reserves
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#151719] text-silver/70 border-b border-white/5 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Garment</th>
                      <th className="py-3 px-4">SKU</th>
                      <th className="py-3 px-4">Current Stock</th>
                      <th className="py-3 px-4">30d Velocity</th>
                      <th className="py-3 px-4">Stock Remaining</th>
                      <th className="py-3 px-4">Forecast Status</th>
                      <th className="py-3 px-4">Recommended Reorder</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-snow/90">
                    {inventoryDemand.inventoryVelocity?.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="py-8 text-center text-silver/60">
                          No inventory velocity data available.
                        </td>
                      </tr>
                    ) : (
                      inventoryDemand.inventoryVelocity.map((item) => (
                        <tr key={item.sku} className="hover:bg-white/[0.02]">
                          <td className="py-3 px-4 font-medium">{item.name}</td>
                          <td className="py-3 px-4 text-silver/70">{item.sku}</td>
                          <td className="py-3 px-4 font-mono">{item.currentStock}</td>
                          <td className="py-3 px-4">{item.dailySalesRate} units/day</td>
                          <td className="py-3 px-4">
                            {item.daysOfStockRemaining !== null ? (
                              <span className="font-medium text-snow">
                                {item.daysOfStockRemaining} days
                              </span>
                            ) : (
                              <span className="text-silver/50">Adequate</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {item.daysOfStockRemaining !== null && item.daysOfStockRemaining < 7 ? (
                              <span className="px-2 py-0.5 rounded text-[10px] bg-rose-500/20 text-rose-300 font-medium">
                                Critical Stockout Risk
                              </span>
                            ) : item.daysOfStockRemaining !== null && item.daysOfStockRemaining < 14 ? (
                              <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 font-medium">
                                Reorder Imminent
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300">
                                Healthy Stock
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-cream font-mono">
                            {item.suggestedReorderQty > 0 ? `+${item.suggestedReorderQty} pcs` : 'None required'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Customer Retention & LTV */}
        {activeTab === 'customers' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Top LTV Customers */}
              <div className="bg-[#1F2226] border border-white/10 rounded-sm p-5 space-y-4">
                <h3 className="text-xs uppercase tracking-widest text-snow font-medium">
                  Top Atelier Patrons by Lifetime Value
                </h3>
                <div className="space-y-3">
                  {customerData.topCustomers?.length === 0 ? (
                    <p className="text-xs text-silver/60">No patron spend recorded yet.</p>
                  ) : (
                    customerData.topCustomers.map((cust, idx) => (
                      <div
                        key={cust.id || idx}
                        className="flex items-center justify-between p-3 bg-[#17191C] border border-white/5 rounded"
                      >
                        <div className="truncate pr-2">
                          <p className="text-xs font-medium text-snow truncate">{cust.name}</p>
                          <p className="text-[10px] text-silver/60 truncate">{cust.email}</p>
                        </div>
                        <div className="text-right whitespace-nowrap">
                          <p className="text-xs font-medium text-cream">
                            PKR {(cust.totalSpend || 0).toLocaleString()}
                          </p>
                          <p className="text-[10px] text-silver/60">{cust.ordersCount} orders</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Marketing & Coupon Conversions */}
              <div className="bg-[#1F2226] border border-white/10 rounded-sm p-5 space-y-4">
                <h3 className="text-xs uppercase tracking-widest text-snow font-medium">
                  Active Coupon Attributed Revenue
                </h3>
                <div className="space-y-3">
                  {campaignStats.coupons?.length === 0 ? (
                    <p className="text-xs text-silver/60">No coupons active.</p>
                  ) : (
                    campaignStats.coupons.map((c) => (
                      <div
                        key={c.code}
                        className="flex items-center justify-between p-3 bg-[#17191C] border border-white/5 rounded"
                      >
                        <div>
                          <span className="text-xs font-mono text-ice px-2 py-0.5 bg-ice/10 rounded">
                            {c.code}
                          </span>
                          <p className="text-[10px] text-silver/60 mt-1">{c.discount}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-snow">{c.usedCount} Redemptions</p>
                          <p className="text-[10px] text-silver/60">Limit: {c.limit || 'Unlimited'}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: AI Business Insights Assistant */}
        {activeTab === 'bi_assistant' && (
          <div className="space-y-6">
            <div className="bg-[#1A1D20] border border-white/10 rounded-md p-6 space-y-4 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-burgundy/30 border border-burgundy flex items-center justify-center text-ice">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h3 className="text-sm uppercase tracking-widest text-snow font-medium">
                    Atelier AI Executive Intelligence
                  </h3>
                  <p className="text-xs text-silver/60">
                    Ask strategic questions grounded strictly in actual MongoDB orders, inventory, and logistics
                  </p>
                </div>
              </div>

              {/* Preset Staff Prompts */}
              <div className="flex gap-2 flex-wrap">
                {[
                  'Which winter garments require immediate factory reordering?',
                  'Analyze our return rate patterns and customer dissatisfaction drivers',
                  'Evaluate rider delivery performance and COD reconciliation',
                  'Provide a 30-day executive financial summary with discount impact',
                ].map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setBiQuery(prompt);
                    }}
                    className="text-xs px-3 py-1.5 bg-white/5 hover:bg-burgundy/30 text-silver hover:text-snow rounded-full border border-white/10 transition"
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              {/* Query Form */}
              <form onSubmit={handleAskBIAssistant} className="flex gap-3">
                <input
                  type="text"
                  value={biQuery}
                  onChange={(e) => setBiQuery(e.target.value)}
                  placeholder="Enter strategic business question for verified analysis..."
                  className="flex-1 bg-[#151719] border border-white/15 focus:border-ice text-snow placeholder:text-silver/50 text-xs px-4 py-3 rounded focus:outline-none transition"
                />
                <button
                  type="submit"
                  disabled={!biQuery.trim() || biLoading}
                  className="px-6 py-3 bg-burgundy hover:bg-burgundy/90 disabled:opacity-40 text-snow text-xs uppercase tracking-widest font-medium rounded transition flex items-center gap-2"
                >
                  <Send size={14} /> Analyze
                </button>
              </form>
            </div>

            {/* Generated BI Report Display */}
            {biLoading && (
              <div className="p-8 bg-[#1F2226] border border-white/10 rounded text-center text-xs text-silver/80 space-y-2">
                <Sparkles size={20} className="mx-auto text-ice animate-spin" />
                <p>Computing deterministic aggregates across orders, inventory, and delivery collections...</p>
              </div>
            )}

            {biInsights && !biLoading && (
              <div className="bg-[#1F2226] border border-white/10 rounded p-6 space-y-4 shadow-2xl">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <span className="text-xs uppercase tracking-widest text-ice font-medium flex items-center gap-1.5">
                    <ShieldCheck size={14} /> Grounded AI Analysis Result
                  </span>
                  <span className="text-[10px] text-silver/60">
                    Engine: {biInsights.provider || 'deterministic_fallback'}
                  </span>
                </div>

                <div className="text-xs sm:text-sm text-snow/90 leading-relaxed whitespace-pre-line bg-[#17191C] p-4 rounded border border-white/5">
                  {biInsights.insight}
                </div>

                {biInsights.verifiedMetrics && (
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <h4 className="text-[11px] uppercase tracking-wider text-silver mb-3">
                      Verified Data Inputs Used:
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div className="bg-[#17191C] p-3 rounded border border-white/5">
                        <span className="text-silver/60 text-[10px] block">Total Orders</span>
                        <span className="font-mono text-snow font-medium">
                          {biInsights.verifiedMetrics.totalOrders || 0}
                        </span>
                      </div>
                      <div className="bg-[#17191C] p-3 rounded border border-white/5">
                        <span className="text-silver/60 text-[10px] block">Gross Revenue</span>
                        <span className="font-mono text-cream font-medium">
                          PKR {(biInsights.verifiedMetrics.totalRevenue || 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="bg-[#17191C] p-3 rounded border border-white/5">
                        <span className="text-silver/60 text-[10px] block">Stock Depletion Risks</span>
                        <span className="font-mono text-rose-300 font-medium">
                          {biInsights.verifiedMetrics.stockDepletionRisks || 0} SKUs
                        </span>
                      </div>
                      <div className="bg-[#17191C] p-3 rounded border border-white/5">
                        <span className="text-silver/60 text-[10px] block">Delivery Rate</span>
                        <span className="font-mono text-emerald-300 font-medium">
                          {biInsights.verifiedMetrics.deliveryRate || 100}%
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
