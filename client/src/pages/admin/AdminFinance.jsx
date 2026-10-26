import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { adminApi } from '../../services/api';
import {
  DollarSign,
  TrendingUp,
  RotateCcw,
  RefreshCw,
  CheckCircle2,
  FileText,
  AlertCircle,
  CreditCard,
  Banknote,
  ShieldCheck,
} from 'lucide-react';

const AdminFinance = () => {
  const [data, setData] = useState(null);
  const [codOrders, setCodOrders] = useState([]);
  const [selectedCodIds, setSelectedCodIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reconciling, setReconciling] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const fetchFinanceData = useCallback(async () => {
    setLoading(true);
    try {
      const [reconRes, ordersRes] = await Promise.all([
        adminApi.getFinanceReconciliation(),
        adminApi.getAdminOrders({
          paymentMethod: 'COD',
          limit: 25,
        }),
      ]);
      setData(reconRes.data?.data || null);
      setCodOrders(ordersRes.data?.data || []);
      setSelectedCodIds([]);
    } catch (err) {
      console.error('[Finance Fetch Error]', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFinanceData();
  }, [fetchFinanceData]);

  const handleToggleSelectCod = (id) => {
    setSelectedCodIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllUnreconciled = () => {
    const unreconciled = codOrders
      .filter((o) => o.codCollected && !o.codReconciled)
      .map((o) => o._id);
    setSelectedCodIds(unreconciled);
  };

  const handleReconcileSelected = async () => {
    if (selectedCodIds.length === 0) return;
    setReconciling(true);
    try {
      await adminApi.reconcileCOD({ orderIds: selectedCodIds });
      showToast(
        `Reconciled ${selectedCodIds.length} COD cash collections. Deposited to accounts.`
      );
      fetchFinanceData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reconcile COD collections');
    } finally {
      setReconciling(false);
    }
  };

  const formatPKR = (val) => `PKR ${Number(val || 0).toLocaleString('en-PK')}`;

  const summary = data?.summary || {};
  const recentPayments = data?.recentPayments || [];
  const recentRefunds = data?.recentRefunds || [];

  return (
    <AdminLayout
      title="Financial Operations & Payment Reconciliation"
      subtitle="Audit Stripe/Safepay online settlements, COD rider collections and refund ledgers"
    >
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-burgundy border border-white/20 text-snow px-4 py-2.5 rounded shadow-lg text-xs flex items-center gap-2">
          <CheckCircle2 size={14} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Control Bar */}
      <div className="flex justify-end mb-4">
        <button
          onClick={fetchFinanceData}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 bg-[#17191C] border border-white/10 hover:bg-white/5 text-ice rounded text-xs transition"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          <span>Refresh Ledger</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-[#17191C] border border-white/10 p-5 rounded-sm">
          <div className="flex items-center justify-between text-xs text-silver mb-1">
            <span>Online Settled Revenue</span>
            <CreditCard size={16} className="text-ice" />
          </div>
          <div className="text-xl lg:text-2xl font-serif text-snow font-bold">
            {formatPKR(summary.onlineSettledRevenue)}
          </div>
          <p className="text-[11px] text-silver/70 mt-1">
            {summary.onlineTransactionsCount || 0} Stripe &amp; Card Transactions
          </p>
        </div>

        <div className="bg-[#17191C] border border-emerald-500/30 p-5 rounded-sm">
          <div className="flex items-center justify-between text-xs text-emerald-400 mb-1">
            <span>COD Cash Collected</span>
            <Banknote size={16} />
          </div>
          <div className="text-xl lg:text-2xl font-serif text-emerald-400 font-bold">
            {formatPKR(summary.codCollectedAmount)}
          </div>
          <p className="text-[11px] text-silver/70 mt-1">
            Reconciled: {formatPKR(summary.codReconciledAmount)}
          </p>
        </div>

        <div className="bg-[#17191C] border border-white/10 p-5 rounded-sm">
          <div className="flex items-center justify-between text-xs text-silver mb-1">
            <span>Pending COD in Transit</span>
            <DollarSign size={16} className="text-amber-400" />
          </div>
          <div className="text-xl lg:text-2xl font-serif text-amber-400 font-bold">
            {formatPKR(summary.codPendingAmount)}
          </div>
          <p className="text-[11px] text-silver/70 mt-1">Pending physical handover</p>
        </div>

        <div className="bg-[#17191C] border border-white/10 p-5 rounded-sm">
          <div className="flex items-center justify-between text-xs text-silver mb-1">
            <span>Total Processed Refunds</span>
            <RotateCcw size={16} className="text-red-400" />
          </div>
          <div className="text-xl lg:text-2xl font-serif text-red-400 font-bold">
            {formatPKR(summary.totalRefundsProcessed)}
          </div>
          <p className="text-[11px] text-silver/70 mt-1">
            {summary.refundsCount || 0} customer returns reimbursed
          </p>
        </div>
      </div>

      {/* COD Reconciliation Ledger Table */}
      <div className="bg-[#17191C] border border-white/10 rounded-sm mb-6 overflow-hidden text-xs">
        <div className="p-4 border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-serif text-snow tracking-wider uppercase font-medium">
              Cash on Delivery (COD) Reconciliation Ledger
            </h3>
            <p className="text-xs text-silver/70">
              Verify physical cash received from riders and deposit into bank accounts
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSelectAllUnreconciled}
              className="px-3 py-1 bg-white/5 hover:bg-white/10 text-silver hover:text-snow border border-white/10 rounded transition text-[11px]"
            >
              Select Unreconciled
            </button>
            <button
              onClick={handleReconcileSelected}
              disabled={selectedCodIds.length === 0 || reconciling}
              className="px-4 py-1 bg-burgundy hover:bg-burgundy/90 disabled:opacity-40 text-snow uppercase tracking-wider text-[11px] font-medium rounded transition"
            >
              {reconciling
                ? 'Processing...'
                : `Reconcile Selected (${selectedCodIds.length})`}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#1F2226] text-[10px] uppercase tracking-wider text-silver border-b border-white/10">
              <tr>
                <th className="py-3 px-4 w-10 text-center">
                  <span className="sr-only">Select</span>
                </th>
                <th className="py-3 px-4">Order #</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Courier / Rider</th>
                <th className="py-3 px-4 text-right">Cash Amount</th>
                <th className="py-3 px-4 text-center">Courier Collected</th>
                <th className="py-3 px-4 text-center">Audit Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-silver">
              {codOrders.length > 0 ? (
                codOrders.map((o) => {
                  const isSelectable = o.codCollected && !o.codReconciled;
                  const isChecked = selectedCodIds.includes(o._id);

                  return (
                    <tr
                      key={o._id}
                      className={`hover:bg-white/5 transition ${
                        isChecked ? 'bg-white/5' : ''
                      }`}
                    >
                      <td className="py-3 px-4 text-center">
                        <input
                          type="checkbox"
                          disabled={!isSelectable}
                          checked={isChecked}
                          onChange={() => handleToggleSelectCod(o._id)}
                          className="w-4 h-4 rounded text-burgundy cursor-pointer disabled:opacity-20"
                        />
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-snow">
                        {o.orderNumber}
                      </td>
                      <td className="py-3 px-4 text-snow">
                        {o.shippingAddress?.fullName || 'Customer'}
                      </td>
                      <td className="py-3 px-4 text-ice">
                        {o.assignedRider?.name || 'Assigned Courier'}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-snow">
                        {formatPKR(o.totalAmount)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {o.codCollected ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-400">
                            Cash In Hand
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-400">
                            In Transit
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {o.codReconciled ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400 text-[11px]">
                            <CheckCircle2 size={13} /> Reconciled
                          </span>
                        ) : (
                          <span className="text-silver/60 text-[11px]">Pending Ledger Lock</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-silver/60">
                    No COD orders in current ledger window.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Two columns: Recent Settled Payments & Recent Refunds */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
        {/* Recent Settled Payments */}
        <div className="bg-[#17191C] border border-white/10 p-5 rounded-sm">
          <h4 className="text-sm font-serif text-snow tracking-wider uppercase mb-3 flex items-center gap-2">
            <CreditCard size={16} className="text-ice" /> Recent Settled Transactions
          </h4>
          <div className="divide-y divide-white/5">
            {recentPayments.length > 0 ? (
              recentPayments.map((p) => (
                <div key={p._id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <span className="font-mono text-snow font-medium block">
                      {p.orderNumber}
                    </span>
                    <span className="text-[10px] text-silver">
                      {p.paymentMethod} &bull; {new Date(p.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-medium text-emerald-400 block">
                      +{formatPKR(p.totalAmount)}
                    </span>
                    <span className="text-[10px] text-emerald-400/70 capitalize">
                      {p.paymentStatus}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="py-4 text-silver/60 text-center">No recent settlements.</p>
            )}
          </div>
        </div>

        {/* Recent Processed Refunds */}
        <div className="bg-[#17191C] border border-white/10 p-5 rounded-sm">
          <h4 className="text-sm font-serif text-snow tracking-wider uppercase mb-3 flex items-center gap-2">
            <RotateCcw size={16} className="text-red-400" /> Recent Customer Refunds
          </h4>
          <div className="divide-y divide-white/5">
            {recentRefunds.length > 0 ? (
              recentRefunds.map((r) => (
                <div key={r._id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <span className="font-mono text-snow font-medium block">
                      {r.order?.orderNumber || 'Refund'}
                    </span>
                    <span className="text-[10px] text-silver truncate max-w-[180px] block">
                      {r.reason}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-medium text-red-400 block">
                      -{formatPKR(r.amount)}
                    </span>
                    <span className="text-[10px] text-silver/80">
                      Approved by {r.approvedBy?.name || 'Staff'}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="py-4 text-silver/60 text-center">No refunds issued.</p>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminFinance;
