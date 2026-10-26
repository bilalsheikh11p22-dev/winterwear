import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { orderApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import {
  ArrowLeft,
  Calendar,
  Truck,
  MapPin,
  CreditCard,
  ShieldCheck,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  X,
} from 'lucide-react';

const STATUS_BADGES = {
  pending_payment: { label: 'Pending Payment', bg: 'bg-amber-950/40 text-amber-300 border-amber-500/30' },
  confirmed: { label: 'Confirmed', bg: 'bg-blue-950/40 text-blue-300 border-blue-500/30' },
  processing: { label: 'Atelier Processing', bg: 'bg-indigo-950/40 text-indigo-300 border-indigo-500/30' },
  packing: { label: 'Packing', bg: 'bg-purple-950/40 text-purple-300 border-purple-500/30' },
  ready_for_dispatch: { label: 'Ready for Dispatch', bg: 'bg-cyan-950/40 text-cyan-300 border-cyan-500/30' },
  assigned_to_rider: { label: 'Courier Assigned', bg: 'bg-cyan-950/40 text-cyan-300 border-cyan-500/30' },
  picked_up: { label: 'In Transit', bg: 'bg-sky-950/40 text-sky-300 border-sky-500/30' },
  out_for_delivery: { label: 'Out for Delivery', bg: 'bg-amber-950/40 text-amber-300 border-amber-500/30' },
  delivered: { label: 'Delivered', bg: 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30' },
  cancelled: { label: 'Cancelled', bg: 'bg-red-950/40 text-red-300 border-red-500/30' },
  return_requested: { label: 'Return Requested', bg: 'bg-orange-950/40 text-orange-300 border-orange-500/30' },
  returned: { label: 'Returned', bg: 'bg-zinc-800 text-zinc-300 border-zinc-700' },
  refunded: { label: 'Refunded', bg: 'bg-purple-950/40 text-purple-300 border-purple-500/30' },
};

const OrderDetailsPage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { currency } = useCart();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Cancel & Return Modal States
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [actionReason, setActionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionFeedback, setActionFeedback] = useState('');

  const fetchOrderDetail = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await orderApi.getOrderById(orderId);
      setOrder(res.data?.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load order details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        navigate(`/login?redirect=/my-orders/${orderId}`);
      } else {
        fetchOrderDetail();
      }
    }
  }, [orderId, isAuthenticated, authLoading, navigate]);

  const handleCancelOrder = async () => {
    setActionLoading(true);
    setActionFeedback('');
    try {
      const res = await orderApi.cancelOrder(orderId, { reason: actionReason });
      setOrder(res.data?.data);
      setIsCancelModalOpen(false);
      setActionReason('');
    } catch (err) {
      setActionFeedback(err.response?.data?.message || 'Failed to cancel order.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestReturn = async () => {
    setActionLoading(true);
    setActionFeedback('');
    try {
      const res = await orderApi.requestReturn(orderId, { reason: actionReason });
      setOrder(res.data?.data);
      setIsReturnModalOpen(false);
      setActionReason('');
    } catch (err) {
      setActionFeedback(err.response?.data?.message || 'Failed to request return.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-charcoal flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-ice" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-charcoal text-snow py-20 px-4 text-center">
        <div className="max-w-md mx-auto glass-panel p-8 rounded border border-white/10">
          <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
          <h2 className="font-editorial-serif text-xl font-medium">{error || 'Order Not Found'}</h2>
          <Link
            to="/my-orders"
            className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-cream text-charcoal font-bold text-xs uppercase tracking-wider rounded"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Orders</span>
          </Link>
        </div>
      </div>
    );
  }

  const badge = STATUS_BADGES[order.orderStatus] || {
    label: order.orderStatus,
    bg: 'bg-white/10 text-snow border-white/20',
  };

  const canCancel = ['pending_payment', 'confirmed', 'processing'].includes(order.orderStatus);
  const canReturn = order.orderStatus === 'delivered';

  return (
    <div className="min-h-screen bg-charcoal text-snow py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Back Nav */}
        <div className="mb-6">
          <Link
            to="/my-orders"
            className="inline-flex items-center gap-1.5 text-xs text-silver hover:text-cream transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Order Archive</span>
          </Link>
        </div>

        {/* Order Header */}
        <div className="border-b border-white/10 pb-6 mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-mono text-2xl sm:text-3xl text-snow font-bold">
                {order.orderNumber}
              </h1>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded border ${badge.bg}`}
              >
                {badge.label}
              </span>
            </div>
            <p className="text-xs text-silver mt-1 flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5" />
              <span>Placed on {new Date(order.createdAt).toLocaleString('en-PK')}</span>
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            {canCancel && (
              <button
                onClick={() => setIsCancelModalOpen(true)}
                className="px-4 py-2 border border-red-500/30 hover:border-red-500 text-red-300 text-xs font-semibold uppercase tracking-wider rounded transition-colors"
              >
                Cancel Order
              </button>
            )}
            {canReturn && (
              <button
                onClick={() => setIsReturnModalOpen(true)}
                className="px-4 py-2 border border-cream/30 hover:border-cream text-cream text-xs font-semibold uppercase tracking-wider rounded transition-colors"
              >
                Request Return
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Left Column: Items and Timeline */}
          <div className="lg:col-span-8 space-y-8">
            {/* Items Card */}
            <div className="glass-panel p-6 rounded border border-white/10 space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-ice border-b border-white/10 pb-3">
                Order Items ({order.items?.length || 0})
              </h3>
              <div className="divide-y divide-white/5">
                {(order.items || []).map((item, idx) => (
                  <div key={idx} className="py-4 first:pt-0 flex items-center gap-4">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-16 h-20 object-cover rounded bg-charcoal border border-white/5 shrink-0"
                    />
                    <div className="flex-1 min-w-0 text-xs">
                      <h4 className="font-medium text-snow text-sm truncate">{item.name}</h4>
                      <p className="text-silver-dark font-mono text-[11px] mt-0.5">SKU: {item.sku}</p>
                      <div className="mt-1 flex items-center gap-3 text-silver text-[11px]">
                        <span>Size: <strong className="text-snow">{item.size}</strong></span>
                        <span>Color: <strong className="text-snow">{item.color?.name}</strong></span>
                        <span>Qty: <strong className="text-snow">{item.quantity}</strong></span>
                      </div>
                    </div>
                    <div className="text-right text-sm font-bold text-snow font-mono shrink-0">
                      {order.currency || currency}{' '}
                      {(item.totalItemPrice || item.price * item.quantity).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Status History Timeline */}
            <div className="glass-panel p-6 rounded border border-white/10 space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-ice border-b border-white/10 pb-3">
                Transit &amp; Lifecycle Timeline
              </h3>
              <div className="space-y-4 relative before:absolute before:inset-0 before:left-3 before:w-0.5 before:bg-white/10">
                {(order.statusHistory || []).map((history, idx) => (
                  <div key={idx} className="relative flex items-start gap-4 pl-8">
                    <div className="absolute left-1.5 top-1.5 w-3.5 h-3.5 rounded-full bg-ice border-2 border-charcoal -translate-x-1/2" />
                    <div className="flex-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-snow uppercase tracking-wider">
                          {history.status.replace(/_/g, ' ')}
                        </span>
                        <span className="text-[11px] text-silver font-mono">
                          {new Date(history.timestamp).toLocaleString('en-PK')}
                        </span>
                      </div>
                      {history.comment && (
                        <p className="text-silver mt-1 text-[11px] italic">
                          "{history.comment}"
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Address and Price Summary */}
          <div className="lg:col-span-4 space-y-6">
            {/* Delivery Details */}
            <div className="glass-panel p-6 rounded border border-white/10 space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-ice flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span>Shipping Destination</span>
              </h4>
              <div className="text-xs text-silver space-y-1">
                <p className="text-snow font-medium">{order.shippingAddress?.fullName}</p>
                <p>{order.shippingAddress?.street}</p>
                {order.shippingAddress?.apartment && <p>{order.shippingAddress.apartment}</p>}
                <p>
                  {order.shippingAddress?.city}, {order.shippingAddress?.state}{' '}
                  {order.shippingAddress?.postalCode}
                </p>
                <p>{order.shippingAddress?.country || 'Pakistan'}</p>
                <p className="font-mono pt-1 text-snow">{order.shippingAddress?.phone}</p>
              </div>
            </div>

            {/* Payment Details */}
            <div className="glass-panel p-6 rounded border border-white/10 space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-ice flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                <span>Payment Information</span>
              </h4>
              <div className="text-xs text-silver space-y-1.5">
                <div className="flex justify-between">
                  <span>Method</span>
                  <strong className="text-snow uppercase">{order.paymentMethod}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Payment Status</span>
                  <strong className="text-cream uppercase">{order.paymentStatus}</strong>
                </div>
                {order.paymentDetails?.transactionId && (
                  <div className="flex justify-between font-mono text-[10px]">
                    <span>Transaction</span>
                    <span className="text-snow truncate max-w-[150px]">
                      {order.paymentDetails.transactionId}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Price Valuation Breakdown */}
            <div className="glass-panel p-6 rounded border border-white/10 space-y-3 text-xs text-silver">
              <h4 className="font-editorial-serif text-base text-snow font-medium border-b border-white/10 pb-2">
                Valuation Summary
              </h4>
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="text-snow">
                  {order.currency || currency} {order.subtotal?.toLocaleString()}
                </span>
              </div>
              {order.discountAmount > 0 && (
                <div className="flex justify-between text-cream">
                  <span>Discount ({order.couponCode || 'Promo'})</span>
                  <span>
                    - {order.currency || currency} {order.discountAmount?.toLocaleString()}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Shipping Fee</span>
                <span>
                  {order.shippingFee === 0 ? (
                    <strong className="text-ice">Complimentary</strong>
                  ) : (
                    `${order.currency || currency} ${order.shippingFee?.toLocaleString()}`
                  )}
                </span>
              </div>
              <div className="pt-2 border-t border-white/10 flex justify-between text-base font-bold text-snow">
                <span>Total Amount</span>
                <span className="font-editorial-serif text-xl text-cream font-mono">
                  {order.currency || currency} {Math.round(order.totalAmount)?.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Cancellation Modal */}
        {isCancelModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-dark/80 backdrop-blur-sm">
            <div className="relative glass-panel rounded-lg max-w-md w-full p-6 border border-white/20 shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-snow">
                  Confirm Cancellation
                </h3>
                <button onClick={() => setIsCancelModalOpen(false)}>
                  <X className="w-4 h-4 text-silver hover:text-white" />
                </button>
              </div>
              <p className="text-xs text-silver leading-relaxed mb-4">
                Are you sure you want to cancel order <strong>{order.orderNumber}</strong>? Reserved inventory will be released immediately.
              </p>
              <textarea
                rows={3}
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder="Reason for cancellation (optional)"
                className="w-full bg-charcoal text-snow text-xs p-3 rounded border border-white/10 focus:outline-none focus:border-ice mb-4"
              />
              {actionFeedback && <p className="text-xs text-red-300 mb-3">{actionFeedback}</p>}
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setIsCancelModalOpen(false)}
                  className="px-4 py-2 border border-white/10 text-silver hover:text-snow text-xs rounded"
                >
                  Close
                </button>
                <button
                  onClick={handleCancelOrder}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-snow text-xs font-bold uppercase rounded disabled:opacity-50"
                >
                  {actionLoading ? 'Cancelling...' : 'Confirm Cancel'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Return Request Modal */}
        {isReturnModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-dark/80 backdrop-blur-sm">
            <div className="relative glass-panel rounded-lg max-w-md w-full p-6 border border-white/20 shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-snow">
                  Request Item Return
                </h3>
                <button onClick={() => setIsReturnModalOpen(false)}>
                  <X className="w-4 h-4 text-silver hover:text-white" />
                </button>
              </div>
              <p className="text-xs text-silver leading-relaxed mb-4">
                Returns are accepted within 14 days of delivery. Please describe the reason for return (e.g. sizing issue, fit preference).
              </p>
              <textarea
                rows={3}
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder="Describe reason for return *"
                className="w-full bg-charcoal text-snow text-xs p-3 rounded border border-white/10 focus:outline-none focus:border-ice mb-4"
              />
              {actionFeedback && <p className="text-xs text-red-300 mb-3">{actionFeedback}</p>}
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setIsReturnModalOpen(false)}
                  className="px-4 py-2 border border-white/10 text-silver hover:text-snow text-xs rounded"
                >
                  Close
                </button>
                <button
                  onClick={handleRequestReturn}
                  disabled={actionLoading || !actionReason.trim()}
                  className="px-4 py-2 bg-cream text-charcoal hover:bg-white text-xs font-bold uppercase rounded disabled:opacity-50"
                >
                  {actionLoading ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderDetailsPage;
