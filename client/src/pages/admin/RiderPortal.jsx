import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { riderPortalApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  Truck,
  CheckCircle2,
  Clock,
  AlertCircle,
  Phone,
  MapPin,
  DollarSign,
  PackageCheck,
  RefreshCw,
  X,
  FileCheck,
} from 'lucide-react';

const RiderPortal = () => {
  const { user } = useAuth();
  const [deliveries, setDeliveries] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  // Proof Modal
  const [isProofModalOpen, setIsProofModalOpen] = useState(false);
  const [activeAssignment, setActiveAssignment] = useState(null);
  const [proofForm, setProofForm] = useState({
    otp: '',
    recipientName: '',
    photoUrl: '',
  });
  const [submittingProof, setSubmittingProof] = useState(false);
  const [proofError, setProofError] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const fetchSummary = async () => {
    try {
      const res = await riderPortalApi.getSummary();
      setSummary(res.data?.data || null);
    } catch (err) {
      console.error('[Rider Summary Error]', err);
    }
  };

  const fetchDeliveries = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const res = await riderPortalApi.getMyDeliveries(params);
      setDeliveries(res.data?.data || []);
    } catch (err) {
      console.error('[Rider Deliveries Error]', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchSummary();
    fetchDeliveries();
  }, [fetchDeliveries]);

  const handleUpdateStatus = async (assignmentId, status) => {
    try {
      await riderPortalApi.updateDeliveryStatus(assignmentId, { status });
      showToast(`Status updated to ${status.replace(/_/g, ' ')}`);
      fetchDeliveries();
      fetchSummary();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update status');
    }
  };

  const openProofModal = (assignment) => {
    setActiveAssignment(assignment);
    setProofForm({ otp: '', recipientName: '', photoUrl: '' });
    setProofError('');
    setIsProofModalOpen(true);
  };

  const handleProofSubmit = async (e) => {
    e.preventDefault();
    if (!activeAssignment) return;
    setSubmittingProof(true);
    setProofError('');
    try {
      await riderPortalApi.submitProof(activeAssignment._id, proofForm);
      showToast('Delivery completed! Proof of delivery verified & COD settled.');
      setIsProofModalOpen(false);
      fetchDeliveries();
      fetchSummary();
    } catch (err) {
      setProofError(err.response?.data?.message || 'Failed to submit proof');
    } finally {
      setSubmittingProof(false);
    }
  };

  const formatPKR = (val) => `PKR ${Number(val || 0).toLocaleString('en-PK')}`;

  return (
    <AdminLayout
      title="Rider Delivery Console & COD Ledger"
      subtitle="Assigned runs, GPS address navigation, proof verification and cash collection"
    >
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-burgundy border border-white/20 text-snow px-4 py-2.5 rounded shadow-lg text-xs flex items-center gap-2">
          <CheckCircle2 size={14} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-[#17191C] border border-white/10 p-4 rounded-sm">
          <div className="flex items-center justify-between text-xs text-silver mb-1">
            <span>Today's Total Runs</span>
            <Truck size={16} className="text-ice" />
          </div>
          <div className="text-2xl font-serif text-snow font-bold">
            {summary?.totalToday || 0}
          </div>
        </div>

        <div className="bg-[#17191C] border border-emerald-500/30 p-4 rounded-sm">
          <div className="flex items-center justify-between text-xs text-emerald-400 mb-1">
            <span>Delivered Today</span>
            <CheckCircle2 size={16} />
          </div>
          <div className="text-2xl font-serif text-emerald-400 font-bold">
            {summary?.deliveredToday || 0}
          </div>
        </div>

        <div className="bg-[#17191C] border border-white/10 p-4 rounded-sm">
          <div className="flex items-center justify-between text-xs text-silver mb-1">
            <span>Pending Runs</span>
            <Clock size={16} className="text-amber-400" />
          </div>
          <div className="text-2xl font-serif text-amber-400 font-bold">
            {summary?.pendingToday || 0}
          </div>
        </div>

        <div className="bg-[#17191C] border border-white/10 p-4 rounded-sm">
          <div className="flex items-center justify-between text-xs text-silver mb-1">
            <span>COD Cash Collected</span>
            <DollarSign size={16} className="text-emerald-400" />
          </div>
          <div className="text-xl font-serif text-snow font-bold">
            {formatPKR(summary?.codCollectedToday)}
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-[#17191C] border border-white/10 p-3 rounded-sm mb-6 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          {['', 'pending_pickup', 'in_transit', 'delivered', 'failed'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded uppercase tracking-wider text-[11px] transition ${
                statusFilter === st
                  ? 'bg-burgundy text-snow font-medium'
                  : 'bg-white/5 text-silver hover:text-snow'
              }`}
            >
              {st === '' ? 'All Runs' : st.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        <button
          onClick={() => {
            fetchDeliveries();
            fetchSummary();
          }}
          className="p-1.5 bg-white/5 hover:bg-white/10 text-silver border border-white/10 rounded flex items-center gap-1.5"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          <span>Refresh Runs</span>
        </button>
      </div>

      {/* Deliveries Cards List */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center text-silver/60 bg-[#17191C] border border-white/10 rounded">
            <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-ice" />
            Loading assigned delivery schedule...
          </div>
        ) : deliveries.length > 0 ? (
          deliveries.map((assignment) => {
            const order = assignment.order || {};
            const address = order.shippingAddress || {};
            const isDelivered = assignment.status === 'delivered';

            return (
              <div
                key={assignment._id}
                className="bg-[#17191C] border border-white/10 p-5 rounded-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-bold text-snow">
                      {order.orderNumber}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] uppercase font-semibold ${
                        isDelivered
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : assignment.status === 'in_transit'
                          ? 'bg-ice/20 text-ice'
                          : 'bg-amber-500/20 text-amber-400'
                      }`}
                    >
                      {assignment.status?.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider bg-white/5 px-2 py-0.5 rounded text-silver">
                      {assignment.priority || 'Express'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-silver">
                    <p className="flex items-center gap-1.5 text-snow">
                      <MapPin size={13} className="text-ice" />
                      {address.fullName} &bull; {address.phone}
                    </p>
                    <p className="text-silver/80">
                      {address.street}, {address.city}
                    </p>
                  </div>

                  {order.deliveryNotes && (
                    <p className="text-[11px] text-amber-400 bg-amber-500/10 p-2 rounded border border-amber-500/20">
                      Note: {order.deliveryNotes}
                    </p>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 border-t md:border-t-0 md:border-l border-white/10 pt-3 md:pt-0 md:pl-5">
                  <div className="text-right">
                    <span className="text-[10px] text-silver block uppercase">Payment Mode</span>
                    <span className="text-xs font-semibold text-snow">{order.paymentMethod}</span>
                    <div className="text-sm font-bold text-emerald-400">
                      {order.paymentMethod === 'COD' ? formatPKR(order.totalAmount) : 'Paid Online'}
                    </div>
                  </div>

                  {!isDelivered && (
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleUpdateStatus(assignment._id, 'picked_up')}
                        className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-silver hover:text-snow border border-white/10 rounded text-xs transition"
                      >
                        Picked Up
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(assignment._id, 'out_for_delivery')}
                        className="px-3 py-1.5 bg-ice/20 hover:bg-ice/30 text-ice border border-ice/30 rounded text-xs transition"
                      >
                        Out for Delivery
                      </button>
                      <button
                        onClick={() => openProofModal(assignment)}
                        className="px-4 py-1.5 bg-burgundy hover:bg-burgundy/90 text-snow text-xs uppercase tracking-wider font-medium rounded transition flex items-center gap-1.5"
                      >
                        <PackageCheck size={14} /> Deliver & Collect
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-12 text-center text-silver/60 bg-[#17191C] border border-white/10 rounded">
            No delivery runs assigned currently.
          </div>
        )}
      </div>

      {/* PROOF OF DELIVERY & COD COLLECTION MODAL */}
      {isProofModalOpen && activeAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#17191C] border border-white/15 rounded-sm max-w-md w-full shadow-2xl text-xs">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-sm font-serif text-snow uppercase tracking-wider">
                Proof of Delivery & COD Confirmation
              </h3>
              <button
                onClick={() => setIsProofModalOpen(false)}
                className="text-silver hover:text-snow"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleProofSubmit} className="p-5 space-y-3">
              {proofError && (
                <div className="p-2.5 bg-red-500/10 border border-red-500/30 text-red-300 rounded text-xs">
                  {proofError}
                </div>
              )}

              <div className="p-3 bg-[#1F2226] border border-white/5 rounded text-silver">
                <p>
                  Order:{' '}
                  <strong className="text-snow">{activeAssignment.order?.orderNumber}</strong>
                </p>
                <p>
                  Amount to Collect:{' '}
                  <strong className="text-emerald-400">
                    {activeAssignment.order?.paymentMethod === 'COD'
                      ? formatPKR(activeAssignment.order?.totalAmount)
                      : 'N/A (Pre-Paid)'}
                  </strong>
                </p>
              </div>

              <div>
                <label className="block text-silver mb-1">Recipient Name / Signature *</label>
                <input
                  type="text"
                  required
                  value={proofForm.recipientName}
                  onChange={(e) => setProofForm({ ...proofForm, recipientName: e.target.value })}
                  placeholder="e.g. Asad Khan (Self or Family Member)"
                  className="w-full bg-[#1F2226] border border-white/10 rounded px-3 py-2 text-snow focus:outline-none focus:border-ice"
                />
              </div>

              <div>
                <label className="block text-silver mb-1">Customer Delivery OTP (Optional)</label>
                <input
                  type="text"
                  value={proofForm.otp}
                  onChange={(e) => setProofForm({ ...proofForm, otp: e.target.value })}
                  placeholder="4-digit OTP provided to customer"
                  className="w-full bg-[#1F2226] border border-white/10 rounded px-3 py-2 text-snow font-mono focus:outline-none focus:border-ice"
                />
              </div>

              <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded flex items-center gap-2">
                <FileCheck size={16} />
                <span>
                  Confirming delivery automatically marks Cash on Delivery collected and locks
                  run status.
                </span>
              </div>

              <div className="pt-3 border-t border-white/10 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsProofModalOpen(false)}
                  className="px-4 py-2 border border-white/20 text-snow rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingProof}
                  className="px-5 py-2 bg-burgundy hover:bg-burgundy/90 text-snow uppercase tracking-wider text-[11px] font-medium rounded transition"
                >
                  {submittingProof ? 'Verifying...' : 'Confirm Delivery'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default RiderPortal;
