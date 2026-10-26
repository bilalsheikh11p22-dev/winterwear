import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { orderApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import {
  Package,
  Clock,
  ArrowRight,
  Loader2,
  Calendar,
  AlertCircle,
  ExternalLink,
  ShoppingBag,
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

const MyOrdersPage = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { currency } = useCart();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');

  const fetchOrders = async (pageNum = 1, status = '') => {
    setLoading(true);
    setError('');
    try {
      const params = { page: pageNum, limit: 10 };
      if (status) params.status = status;
      const res = await orderApi.getMyOrders(params);
      const data = res.data?.data || [];
      const meta = res.data?.meta;

      setOrders(data);
      if (meta) {
        setPage(meta.page);
        setTotalPages(meta.pages || 1);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load your orders.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        navigate('/login?redirect=/my-orders');
      } else {
        fetchOrders(page, statusFilter);
      }
    }
  }, [isAuthenticated, authLoading, page, statusFilter, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-charcoal flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-cream" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-charcoal text-snow py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="border-b border-white/10 pb-6 mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="text-xs uppercase tracking-editorial text-ice font-bold">
              Customer Account
            </span>
            <h1 className="font-editorial-serif text-3xl sm:text-5xl text-snow font-light mt-1">
              Atelier Order Archive
            </h1>
          </div>

          {/* Quick Filter */}
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="bg-charcoal-dark text-xs text-snow px-3 py-2 rounded border border-white/10 focus:outline-none focus:border-cream"
            >
              <option value="">All Statuses</option>
              <option value="confirmed">Confirmed</option>
              <option value="processing">Processing</option>
              <option value="out_for_delivery">Out for Delivery</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="py-24 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-ice" />
          </div>
        ) : error ? (
          <div className="glass-panel p-6 rounded border border-red-500/20 text-center max-w-lg mx-auto">
            <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
            <p className="text-xs text-red-200">{error}</p>
            <button
              onClick={() => fetchOrders(page, statusFilter)}
              className="mt-4 px-4 py-2 bg-cream text-charcoal text-xs font-bold uppercase rounded"
            >
              Retry
            </button>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20 glass-panel rounded max-w-md mx-auto p-8 border border-white/10">
            <Package className="w-12 h-12 text-silver-dark mx-auto mb-3" />
            <h3 className="font-editorial-serif text-xl text-snow font-medium">No Orders Found</h3>
            <p className="text-xs text-silver mt-2 leading-relaxed">
              You haven't placed any orders yet. Discover our curated winter outerwear collection.
            </p>
            <Link
              to="/shop"
              className="mt-6 inline-flex items-center gap-2 px-6 py-2.5 bg-cream hover:bg-snow text-charcoal font-bold text-xs uppercase tracking-widest rounded transition-all"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Explore Collection</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const badge = STATUS_BADGES[order.orderStatus] || {
                label: order.orderStatus,
                bg: 'bg-white/10 text-snow border-white/20',
              };

              return (
                <div
                  key={order._id}
                  className="glass-panel p-6 rounded border border-white/10 hover:border-white/20 transition-all flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6"
                >
                  <div className="space-y-3 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-mono text-sm font-bold text-cream tracking-wide">
                        {order.orderNumber}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded border ${badge.bg}`}
                      >
                        {badge.label}
                      </span>
                      <span className="text-[11px] text-silver-dark flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(order.createdAt).toLocaleDateString('en-PK', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>

                    {/* Thumbnail previews */}
                    <div className="flex items-center gap-2 overflow-x-auto py-1">
                      {(order.items || []).slice(0, 4).map((item, idx) => (
                        <div
                          key={idx}
                          className="w-12 h-14 rounded overflow-hidden bg-charcoal border border-white/10 shrink-0"
                          title={`${item.name} (${item.size})`}
                        >
                          <img
                            src={item.image || 'https://images.unsplash.com/photo-1544923246-77307dd654cb?q=80&w=200'}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                      {(order.items?.length || 0) > 4 && (
                        <span className="text-xs text-silver pl-1 font-mono">
                          +{order.items.length - 4} more
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Financial & Action Info */}
                  <div className="flex items-center justify-between lg:justify-end gap-6 w-full lg:w-auto border-t lg:border-t-0 pt-4 lg:pt-0 border-white/5">
                    <div className="text-left lg:text-right">
                      <span className="text-[10px] uppercase text-silver-dark block">
                        Payment ({order.paymentMethod})
                      </span>
                      <span className="text-base font-bold text-snow font-mono">
                        {order.currency || currency}{' '}
                        {Math.round(order.totalAmount).toLocaleString()}
                      </span>
                    </div>

                    <Link
                      to={`/my-orders/${order._id}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-white/5 hover:bg-cream text-snow hover:text-charcoal text-xs font-semibold uppercase tracking-wider rounded border border-white/10 transition-colors"
                    >
                      <span>View Details</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="pt-8 flex items-center justify-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  className="px-3.5 py-1.5 bg-charcoal border border-white/10 rounded text-xs text-silver hover:text-snow disabled:opacity-30"
                >
                  Previous
                </button>
                <span className="text-xs text-silver px-3 font-mono">
                  Page {page} of {totalPages}
                </span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                  className="px-3.5 py-1.5 bg-charcoal border border-white/10 rounded text-xs text-silver hover:text-snow disabled:opacity-30"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyOrdersPage;
