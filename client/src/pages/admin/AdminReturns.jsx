import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { adminApi } from '../../services/api';
import {
  RotateCcw,
  Search,
  Filter,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Eye,
  FileCheck,
  X,
  DollarSign,
  User,
} from 'lucide-react';

const AdminReturns = () => {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [toastMessage, setToastMessage] = useState('');

  // Review Modal State
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [reviewStatus, setReviewStatus] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [issueRefund, setIssueRefund] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const fetchReturns = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: 15,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      };
      if (search) params.search = search;

      const res = await adminApi.getReturns(params);
      setReturns(res.data?.data || []);
      setTotalPages(res.data?.meta?.pages || 1);
    } catch (err) {
      console.error('[Returns Fetch Error]', err);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search]);

  useEffect(() => {
    fetchReturns();
  }, [fetchReturns]);

  const openReviewModal = (ret) => {
    setSelectedReturn(ret);
    setReviewStatus(ret.status || 'under_review');
    setReviewNotes(ret.reviewNotes || '');
    setIssueRefund(ret.status === 'inspected_passed');
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!selectedReturn) return;
    setSubmittingReview(true);
    try {
      await adminApi.reviewReturn(selectedReturn._id, {
        status: reviewStatus,
        reviewNotes,
        issueRefund,
      });
      showToast(`Return request updated to ${reviewStatus.replace(/_/g, ' ')}`);
      setSelectedReturn(null);
      fetchReturns();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update return request');
    } finally {
      setSubmittingReview(false);
    }
  };

  const formatPKR = (val) => `PKR ${Number(val || 0).toLocaleString('en-PK')}`;

  const STATUS_TAGS = {
    requested: 'bg-amber-500/20 text-amber-400',
    under_review: 'bg-blue-500/20 text-blue-400',
    approved_for_return: 'bg-indigo-500/20 text-indigo-400',
    item_received_at_warehouse: 'bg-purple-500/20 text-purple-400',
    inspected_passed: 'bg-teal-500/20 text-teal-400',
    inspected_failed: 'bg-red-500/20 text-red-400',
    refund_issued: 'bg-emerald-500/20 text-emerald-400',
    rejected: 'bg-red-500/20 text-red-400',
  };

  return (
    <AdminLayout
      title="Returns & Customer Support Verification"
      subtitle="Examine customer return requests, warehouse garment inspections and refund triggers"
    >
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-burgundy border border-white/20 text-snow px-4 py-2.5 rounded shadow-lg text-xs flex items-center gap-2">
          <CheckCircle size={14} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Status Filter Tabs */}
      <div className="bg-[#17191C] border border-white/10 p-2 rounded-sm mb-4 flex flex-wrap gap-1 text-xs">
        {[
          { id: 'all', label: 'All Requests' },
          { id: 'requested', label: 'Requested' },
          { id: 'under_review', label: 'Under Review' },
          { id: 'approved_for_return', label: 'Approved Return' },
          { id: 'item_received_at_warehouse', label: 'Received at Hub' },
          { id: 'inspected_passed', label: 'Inspected Passed' },
          { id: 'refund_issued', label: 'Refund Issued' },
          { id: 'rejected', label: 'Rejected' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setStatusFilter(tab.id);
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded uppercase tracking-wider text-[11px] transition ${
              statusFilter === tab.id
                ? 'bg-burgundy text-snow font-medium'
                : 'text-silver hover:text-snow hover:bg-white/5'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Control Bar */}
      <div className="bg-[#17191C] border border-white/10 p-3 rounded-sm mb-6 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-silver" />
          <input
            type="text"
            placeholder="Search by order number or reason..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#1F2226] border border-white/10 rounded pl-9 pr-3 py-1.5 text-snow focus:outline-none focus:border-ice"
          />
        </div>

        <button
          onClick={fetchReturns}
          className="p-1.5 bg-white/5 hover:bg-white/10 text-silver hover:text-snow border border-white/10 rounded flex items-center gap-1.5"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Returns Table */}
      <div className="bg-[#17191C] border border-white/10 rounded-sm overflow-hidden text-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#1F2226] text-[10px] uppercase tracking-wider text-silver border-b border-white/10">
              <tr>
                <th className="py-3 px-4">Order #</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Reason</th>
                <th className="py-3 px-4">Requested On</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4">Reviewed By</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-silver">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-silver/60">
                    <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-ice" />
                    Fetching returns queue...
                  </td>
                </tr>
              ) : returns.length > 0 ? (
                returns.map((ret) => (
                  <tr key={ret._id} className="hover:bg-white/5 transition">
                    <td className="py-3 px-4 font-mono font-medium text-snow">
                      {ret.orderNumber}
                    </td>
                    <td className="py-3 px-4 text-snow">
                      {ret.customer?.name || 'Customer'}
                      <span className="block text-[10px] text-silver/70">
                        {ret.customer?.email}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-amber-400 font-medium block">
                        {ret.items?.[0]?.reason || 'Return Requested'}
                      </span>
                      {ret.customerNotes && (
                        <span className="text-[10px] text-silver/70 block truncate max-w-[180px]">
                          "{ret.customerNotes}"
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-silver/80">
                      {new Date(ret.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] uppercase font-semibold ${
                          STATUS_TAGS[ret.status] || 'bg-white/5 text-silver'
                        }`}
                      >
                        {ret.status?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-silver">
                      {ret.reviewedBy ? ret.reviewedBy.name : 'Pending Review'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => openReviewModal(ret)}
                        className="px-3 py-1 bg-white/5 hover:bg-white/10 text-ice hover:text-snow border border-white/10 rounded transition"
                      >
                        Inspect & Review
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-silver/60">
                    No return requests matching this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* INSPECT & REVIEW MODAL */}
      {selectedReturn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#17191C] border border-white/15 rounded-sm max-w-xl w-full shadow-2xl text-xs">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-sm font-serif text-snow uppercase tracking-wider">
                Review Return Request &bull; {selectedReturn.orderNumber}
              </h3>
              <button
                onClick={() => setSelectedReturn(null)}
                className="text-silver hover:text-snow"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleReviewSubmit} className="p-5 space-y-4">
              <div className="p-3 bg-[#1F2226] border border-white/5 rounded space-y-1 text-silver">
                <p>
                  Customer: <strong className="text-snow">{selectedReturn.customer?.name}</strong> (
                  {selectedReturn.customer?.email})
                </p>
                <p>
                  Reason Category:{' '}
                  <strong className="text-amber-400">
                    {selectedReturn.items?.[0]?.reason || 'Not specified'}
                  </strong>
                </p>
                {selectedReturn.customerNotes && (
                  <p>
                    Customer Notes: <em>"{selectedReturn.customerNotes}"</em>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-silver mb-1">Update Status *</label>
                <select
                  required
                  value={reviewStatus}
                  onChange={(e) => setReviewStatus(e.target.value)}
                  className="w-full bg-[#1F2226] border border-white/10 rounded px-3 py-2 text-snow focus:outline-none focus:border-ice"
                >
                  <option value="under_review">Under Review</option>
                  <option value="approved_for_return">Approve Return (Send Rider to Pickup)</option>
                  <option value="item_received_at_warehouse">Received at Warehouse Hub</option>
                  <option value="inspected_passed">Inspection Passed (Ready for Refund)</option>
                  <option value="inspected_failed">Inspection Failed (Damaged by User)</option>
                  <option value="refund_issued">Issue Full Refund Now</option>
                  <option value="rejected">Reject Return Request</option>
                </select>
              </div>

              <div>
                <label className="block text-silver mb-1">Staff Review Notes / Inspection Log</label>
                <textarea
                  rows={2}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Fabric verified intact with atelier tags attached..."
                  className="w-full bg-[#1F2226] border border-white/10 rounded px-3 py-2 text-snow focus:outline-none focus:border-ice"
                />
              </div>

              {(reviewStatus === 'inspected_passed' || reviewStatus === 'refund_issued') && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded flex items-center justify-between">
                  <div className="text-emerald-300">
                    <span className="font-semibold block">Issue Financial Refund</span>
                    <span className="text-[11px] text-emerald-400/80">
                      Auto-creates refund record of{' '}
                      {formatPKR(selectedReturn.order?.totalAmount)}
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={issueRefund}
                    onChange={(e) => setIssueRefund(e.target.checked)}
                    className="w-4 h-4 rounded text-burgundy cursor-pointer"
                  />
                </div>
              )}

              <div className="pt-3 border-t border-white/10 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedReturn(null)}
                  className="px-4 py-2 border border-white/20 text-snow rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="px-5 py-2 bg-burgundy hover:bg-burgundy/90 text-snow uppercase tracking-wider text-[11px] font-medium rounded transition"
                >
                  {submittingReview ? 'Updating...' : 'Save Decision'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminReturns;
