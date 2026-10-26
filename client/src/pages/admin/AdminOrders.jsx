import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { adminApi } from '../../services/api';
import {
  ShoppingCart,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Truck,
  CheckCircle,
  Clock,
  Printer,
  X,
  FileText,
  User,
  MapPin,
  DollarSign,
  AlertCircle,
} from 'lucide-react';

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [riders, setRiders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusTab, setStatusTab] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isSlipOpen, setIsSlipOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Status Transition & Rider Assignment Form State
  const [targetStatus, setTargetStatus] = useState('');
  const [statusComment, setStatusComment] = useState('');
  const [selectedRiderId, setSelectedRiderId] = useState('');
  const [riderNotes, setRiderNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const fetchRiders = async () => {
    try {
      const res = await adminApi.getUsers({ role: 'rider' });
      setRiders(
        (res.data?.data || []).filter((r) => !['pending', 'rejected'].includes(r.approvalStatus))
      );
    } catch (err) {
      console.error('[Riders Fetch Error]', err);
    }
  };

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: 15,
        status: statusTab !== 'all' ? statusTab : undefined,
      };
      if (search) params.search = search;

      const res = await adminApi.getAdminOrders(params);
      setOrders(res.data?.data || []);
      setTotalPages(res.data?.meta?.pages || 1);
    } catch (err) {
      console.error('[Orders Fetch Error]', err);
    } finally {
      setLoading(false);
    }
  }, [page, statusTab, search]);

  useEffect(() => {
    fetchRiders();
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const openOrderDetail = async (orderId) => {
    setActionLoading(true);
    try {
      const res = await adminApi.getAdminOrderById(orderId);
      setSelectedOrder(res.data?.data || null);
      setTargetStatus('');
      setStatusComment('');
      setSelectedRiderId(res.data?.data?.assignedRider?._id || '');
      setRiderNotes(res.data?.data?.deliveryNotes || '');
      setIsDetailOpen(true);
    } catch (err) {
      alert('Failed to load order details');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusTransition = async (e) => {
    e.preventDefault();
    if (!targetStatus || !selectedOrder) return;
    setActionLoading(true);
    try {
      await adminApi.updateOrderStatus(selectedOrder._id, {
        status: targetStatus,
        comment: statusComment,
      });
      showToast(`Order transitioned to ${targetStatus}`);
      await openOrderDetail(selectedOrder._id);
      fetchOrders();
    } catch (err) {
      alert(err.response?.data?.message || 'Status transition rejected');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssignRider = async (e) => {
    e.preventDefault();
    if (!selectedRiderId || !selectedOrder) return;
    setActionLoading(true);
    try {
      await adminApi.assignRider(selectedOrder._id, {
        riderId: selectedRiderId,
        notes: riderNotes,
        priority: 'express',
      });
      showToast('Delivery courier assigned to order.');
      await openOrderDetail(selectedOrder._id);
      fetchOrders();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to assign rider');
    } finally {
      setActionLoading(false);
    }
  };

  const formatPKR = (amount) => {
    return `PKR ${Number(amount || 0).toLocaleString('en-PK')}`;
  };

  const STATUS_BADGES = {
    pending_payment: 'bg-white/10 text-silver',
    confirmed: 'bg-blue-500/20 text-blue-400',
    processing: 'bg-indigo-500/20 text-indigo-400',
    packing: 'bg-purple-500/20 text-purple-400',
    ready_for_dispatch: 'bg-pink-500/20 text-pink-400',
    assigned_to_rider: 'bg-amber-500/20 text-amber-400',
    out_for_delivery: 'bg-teal-500/20 text-teal-400',
    delivered: 'bg-emerald-500/20 text-emerald-400',
    cancelled: 'bg-red-500/20 text-red-400',
    return_requested: 'bg-orange-500/20 text-orange-400',
  };

  return (
    <AdminLayout
      title="Orders Fulfillment & Dispatch Queue"
      subtitle="Dispatch orders, assign delivery riders, and generate fulfillment slips"
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
          { id: 'all', label: 'All Orders' },
          { id: 'confirmed', label: 'Confirmed' },
          { id: 'processing', label: 'Processing' },
          { id: 'packing', label: 'Packing' },
          { id: 'ready_for_dispatch', label: 'Ready Dispatch' },
          { id: 'assigned_to_rider', label: 'With Rider' },
          { id: 'out_for_delivery', label: 'Out for Delivery' },
          { id: 'delivered', label: 'Delivered' },
          { id: 'return_requested', label: 'Return Req' },
          { id: 'cancelled', label: 'Cancelled' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setStatusTab(tab.id);
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded transition uppercase tracking-wider text-[11px] ${
              statusTab === tab.id
                ? 'bg-burgundy text-snow font-medium'
                : 'text-silver hover:text-snow hover:bg-white/5'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search & Actions Bar */}
      <div className="bg-[#17191C] border border-white/10 p-3 rounded-sm mb-6 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-silver" />
          <input
            type="text"
            placeholder="Search order number (e.g. WW-2026-...), phone, customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#1F2226] border border-white/10 rounded pl-9 pr-3 py-1.5 text-snow focus:outline-none focus:border-ice"
          />
        </div>

        <button
          onClick={fetchOrders}
          className="p-1.5 bg-white/5 hover:bg-white/10 text-silver hover:text-snow border border-white/10 rounded flex items-center gap-1.5"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Orders Table */}
      <div className="bg-[#17191C] border border-white/10 rounded-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#1F2226] text-[10px] uppercase tracking-wider text-silver border-b border-white/10">
              <tr>
                <th className="py-3 px-4">Order #</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Payment</th>
                <th className="py-3 px-4">Total</th>
                <th className="py-3 px-4 text-center">Fulfillment Status</th>
                <th className="py-3 px-4">Rider</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-silver">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-silver/60">
                    <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-ice" />
                    Querying orders database...
                  </td>
                </tr>
              ) : orders.length > 0 ? (
                orders.map((o) => (
                  <tr key={o._id} className="hover:bg-white/5 transition">
                    <td className="py-3 px-4 font-mono font-medium text-snow">
                      {o.orderNumber}
                    </td>
                    <td className="py-3 px-4 text-silver/80">
                      {new Date(o.createdAt).toLocaleDateString('en-PK', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-snow font-medium block truncate max-w-[140px]">
                        {o.shippingAddress?.fullName || o.customer?.name || 'Customer'}
                      </span>
                      <span className="text-[10px] text-silver/70 block">
                        {o.shippingAddress?.city || 'Pakistan'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-snow block">{o.paymentMethod}</span>
                      <span
                        className={`text-[10px] capitalize ${
                          o.paymentStatus === 'paid' ? 'text-emerald-400' : 'text-amber-400'
                        }`}
                      >
                        {o.paymentStatus}
                        {o.paymentMethod === 'COD' && o.codCollected && ' (Collected)'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-snow">
                      {formatPKR(o.totalAmount)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] uppercase font-semibold ${
                          STATUS_BADGES[o.orderStatus] || 'bg-white/5 text-silver'
                        }`}
                      >
                        {o.orderStatus?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {o.assignedRider ? (
                        <span className="text-ice text-xs flex items-center gap-1">
                          <Truck size={12} /> {o.assignedRider.name}
                        </span>
                      ) : (
                        <span className="text-silver/40 text-[11px]">Unassigned</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => openOrderDetail(o._id)}
                        className="px-3 py-1 bg-white/5 hover:bg-white/10 text-ice hover:text-snow border border-white/10 rounded transition"
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-silver/60">
                    No orders matching this status filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-white/10 flex items-center justify-between text-xs text-silver">
            <span>
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 bg-white/5 hover:bg-white/10 disabled:opacity-30 rounded transition"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1 bg-white/5 hover:bg-white/10 disabled:opacity-30 rounded transition"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ORDER DETAILS & DISPATCH MODAL */}
      {isDetailOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#17191C] border border-white/15 rounded-sm max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl text-xs">
            {/* Modal Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-base font-serif text-snow tracking-wide font-medium">
                    Order {selectedOrder.orderNumber}
                  </h3>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] uppercase font-semibold ${
                      STATUS_BADGES[selectedOrder.orderStatus] || 'bg-white/5 text-silver'
                    }`}
                  >
                    {selectedOrder.orderStatus?.replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="text-[11px] text-silver/70 mt-0.5">
                  Placed on{' '}
                  {new Date(selectedOrder.createdAt).toLocaleString('en-PK', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsSlipOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-snow border border-white/10 rounded transition"
                >
                  <Printer size={13} /> Packing Slip
                </button>
                <button
                  onClick={() => setIsDetailOpen(false)}
                  className="text-silver hover:text-snow p-1"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-5 flex-1">
              {/* Customer & Address Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3.5 bg-[#1F2226] border border-white/5 rounded">
                <div>
                  <h4 className="font-serif text-snow font-medium mb-1 flex items-center gap-1.5">
                    <User size={13} className="text-ice" /> Customer Information
                  </h4>
                  <p className="text-silver">
                    {selectedOrder.shippingAddress?.fullName || selectedOrder.customer?.name}
                  </p>
                  <p className="text-silver/80">{selectedOrder.customer?.email}</p>
                  <p className="text-ice font-mono text-[11px]">
                    {selectedOrder.shippingAddress?.phone}
                  </p>
                </div>
                <div>
                  <h4 className="font-serif text-snow font-medium mb-1 flex items-center gap-1.5">
                    <MapPin size={13} className="text-ice" /> Delivery Destination
                  </h4>
                  <p className="text-silver">{selectedOrder.shippingAddress?.street}</p>
                  {selectedOrder.shippingAddress?.apartment && (
                    <p className="text-silver">{selectedOrder.shippingAddress?.apartment}</p>
                  )}
                  <p className="text-silver/80">
                    {selectedOrder.shippingAddress?.city}, {selectedOrder.shippingAddress?.state}{' '}
                    {selectedOrder.shippingAddress?.postalCode}
                  </p>
                </div>
              </div>

              {/* Order Items Table */}
              <div>
                <h4 className="font-serif text-snow font-medium mb-2 uppercase tracking-wider text-[11px]">
                  Garment Items ({selectedOrder.items?.length || 0})
                </h4>
                <div className="border border-white/10 rounded overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#1F2226] text-[10px] uppercase text-silver">
                      <tr>
                        <th className="py-2 px-3">Item</th>
                        <th className="py-2 px-3">SKU</th>
                        <th className="py-2 px-3">Size / Color</th>
                        <th className="py-2 px-3 text-right">Price</th>
                        <th className="py-2 px-3 text-center">Qty</th>
                        <th className="py-2 px-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-silver">
                      {selectedOrder.items?.map((item, idx) => (
                        <tr key={idx}>
                          <td className="py-2.5 px-3 flex items-center gap-2 text-snow">
                            {item.image && (
                              <img
                                src={item.image}
                                alt={item.name}
                                className="w-7 h-7 object-cover rounded bg-white/5"
                              />
                            )}
                            <span className="font-medium truncate max-w-[150px]">{item.name}</span>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-ice">{item.sku}</td>
                          <td className="py-2.5 px-3">
                            <span className="text-snow">{item.size}</span>
                            {item.color?.name && (
                              <span className="text-silver/70 block text-[10px]">
                                {item.color.name}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right">{formatPKR(item.price)}</td>
                          <td className="py-2.5 px-3 text-center font-medium text-snow">
                            {item.quantity}
                          </td>
                          <td className="py-2.5 px-3 text-right font-medium text-snow">
                            {formatPKR(item.totalItemPrice)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totals Summary */}
                <div className="p-3 bg-[#1F2226] border border-white/5 rounded mt-3 space-y-1 text-right">
                  <div className="text-silver">
                    Subtotal: <span className="text-snow">{formatPKR(selectedOrder.subtotal)}</span>
                  </div>
                  {selectedOrder.discountAmount > 0 && (
                    <div className="text-emerald-400">
                      Discount ({selectedOrder.couponCode || 'PROMO'}): -
                      {formatPKR(selectedOrder.discountAmount)}
                    </div>
                  )}
                  <div className="text-silver">
                    Shipping: <span className="text-snow">{formatPKR(selectedOrder.shippingFee)}</span>
                  </div>
                  <div className="text-sm font-serif font-bold text-snow pt-1 border-t border-white/10">
                    Grand Total: {formatPKR(selectedOrder.totalAmount)}
                  </div>
                </div>
              </div>

              {/* Status Transition Control */}
              <div className="p-4 bg-[#1F2226] border border-white/10 rounded">
                <h4 className="font-serif text-snow font-medium mb-2 uppercase tracking-wider text-[11px]">
                  Fulfillment Status Transition
                </h4>
                <form onSubmit={handleStatusTransition} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-silver mb-1">Target Status</label>
                      <select
                        value={targetStatus}
                        onChange={(e) => setTargetStatus(e.target.value)}
                        className="w-full bg-[#17191C] border border-white/10 rounded px-3 py-1.5 text-snow focus:outline-none focus:border-ice"
                      >
                        <option value="">Select Next Status</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="processing">Processing in Atelier</option>
                        <option value="packing">Packing</option>
                        <option value="ready_for_dispatch">Ready for Dispatch</option>
                        <option value="assigned_to_rider">Assigned to Rider</option>
                        <option value="out_for_delivery">Out for Delivery</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancel Order</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-silver mb-1">Audit Comment / Reason</label>
                      <input
                        type="text"
                        value={statusComment}
                        onChange={(e) => setStatusComment(e.target.value)}
                        placeholder="e.g. Garment verified and packed into luxury box"
                        className="w-full bg-[#17191C] border border-white/10 rounded px-3 py-1.5 text-snow focus:outline-none focus:border-ice"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={!targetStatus || actionLoading}
                    className="px-4 py-1.5 bg-burgundy hover:bg-burgundy/90 disabled:opacity-40 text-snow uppercase tracking-wider text-[10px] font-medium rounded transition"
                  >
                    Commit Status Transition
                  </button>
                </form>
              </div>

              {/* Courier / Rider Assignment */}
              <div className="p-4 bg-[#1F2226] border border-white/10 rounded">
                <h4 className="font-serif text-snow font-medium mb-2 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Truck size={14} className="text-ice" /> Dispatch & Courier Assignment
                </h4>
                <form onSubmit={handleAssignRider} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-silver mb-1">Assign Rider</label>
                      <select
                        value={selectedRiderId}
                        onChange={(e) => setSelectedRiderId(e.target.value)}
                        className="w-full bg-[#17191C] border border-white/10 rounded px-3 py-1.5 text-snow focus:outline-none focus:border-ice"
                      >
                        <option value="">Select Operational Rider</option>
                        {riders.map((r) => (
                          <option key={r._id} value={r._id}>
                            {r.name} ({r.phone || r.email})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-silver mb-1">Delivery Dispatch Notes</label>
                      <input
                        type="text"
                        value={riderNotes}
                        onChange={(e) => setRiderNotes(e.target.value)}
                        placeholder="Urgent evening delivery, collect exact COD cash"
                        className="w-full bg-[#17191C] border border-white/10 rounded px-3 py-1.5 text-snow focus:outline-none focus:border-ice"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={!selectedRiderId || actionLoading}
                    className="px-4 py-1.5 bg-ice/20 hover:bg-ice/30 text-ice border border-ice/30 uppercase tracking-wider text-[10px] font-medium rounded transition"
                  >
                    Assign Delivery Courier
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PRINTABLE PACKING SLIP VIEW */}
      {isSlipOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="bg-white text-black p-8 rounded max-w-2xl w-full max-h-[90vh] overflow-y-auto font-sans shadow-2xl">
            <div className="flex justify-between items-start border-b border-black pb-4 mb-4">
              <div>
                <h2 className="text-2xl font-serif font-bold tracking-widest uppercase">
                  WINTERWEAR
                </h2>
                <p className="text-xs uppercase tracking-widest text-neutral-600">
                  Luxury Atelier &bull; Packaging Slip
                </p>
              </div>
              <div className="text-right text-xs">
                <p className="font-mono font-bold text-sm">{selectedOrder.orderNumber}</p>
                <p>{new Date(selectedOrder.createdAt).toLocaleDateString()}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs mb-6">
              <div>
                <h5 className="font-bold uppercase text-neutral-500 mb-1">Customer / Recipient</h5>
                <p className="font-bold">
                  {selectedOrder.shippingAddress?.fullName || selectedOrder.customer?.name}
                </p>
                <p>{selectedOrder.shippingAddress?.phone}</p>
                <p>{selectedOrder.customer?.email}</p>
              </div>
              <div>
                <h5 className="font-bold uppercase text-neutral-500 mb-1">Delivery Address</h5>
                <p>{selectedOrder.shippingAddress?.street}</p>
                <p>
                  {selectedOrder.shippingAddress?.city}, {selectedOrder.shippingAddress?.state}{' '}
                  {selectedOrder.shippingAddress?.postalCode}
                </p>
              </div>
            </div>

            <table className="w-full text-left text-xs mb-6 border border-neutral-300">
              <thead className="bg-neutral-100 uppercase text-[10px] border-b border-neutral-300">
                <tr>
                  <th className="p-2">Piece Description</th>
                  <th className="p-2">SKU</th>
                  <th className="p-2">Variant</th>
                  <th className="p-2 text-center">Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {selectedOrder.items?.map((item, idx) => (
                  <tr key={idx}>
                    <td className="p-2 font-medium">{item.name}</td>
                    <td className="p-2 font-mono">{item.sku}</td>
                    <td className="p-2">
                      {item.size} {item.color?.name && `/ ${item.color.name}`}
                    </td>
                    <td className="p-2 text-center font-bold">{item.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="p-3 bg-neutral-100 rounded text-xs mb-6 flex justify-between items-center">
              <div>
                <span className="font-bold uppercase">Payment Mode: </span>
                <span>{selectedOrder.paymentMethod}</span>
              </div>
              <div className="text-base font-bold">
                Amount to Collect: {selectedOrder.paymentMethod === 'COD' ? formatPKR(selectedOrder.totalAmount) : 'PAID IN FULL'}
              </div>
            </div>

            <div className="flex justify-end gap-3 print:hidden">
              <button
                onClick={() => window.print()}
                className="px-5 py-2 bg-black text-white text-xs uppercase tracking-wider rounded"
              >
                Print Slip
              </button>
              <button
                onClick={() => setIsSlipOpen(false)}
                className="px-4 py-2 border border-neutral-300 text-xs uppercase tracking-wider rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminOrders;
