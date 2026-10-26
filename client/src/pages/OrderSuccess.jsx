import React, { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { AlertTriangle, Clock, Lock, SearchX, WifiOff } from 'lucide-react';
import { orderApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { BrandLoader } from '../../components/common/Loader';
import ProductPreparation from './components/ProductPreparation';
import PackageAnimation from './components/PackageAnimation';
import DeliveryScene from './components/DeliveryScene';
import SuccessState from './components/SuccessState';
import OrderSummary from './components/OrderSummary';
import { STAGES, STAGE_CAPTION, useOrderSequence } from './animations/orderAnimations';

const addBusinessDays = (from, days) => {
  const d = new Date(from);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) added += 1;
  }
  return d;
};

// Same shape as the /confirmation endpoint, built from the regular order-details response.
const fromOrderDoc = (o) => ({
  id: o._id,
  orderNumber: o.orderNumber,
  items: (o.items || []).map((i) => ({
    product: i.product?._id || i.product,
    slug: i.product?.slug,
    name: i.name || i.product?.name,
    image: i.image || i.product?.images?.[0]?.url,
    size: i.size,
    color: i.color,
    quantity: i.quantity,
    price: i.price,
    totalItemPrice: i.totalItemPrice,
  })),
  subtotal: o.subtotal,
  discountAmount: o.discountAmount,
  shippingFee: o.shippingFee,
  totalAmount: o.totalAmount,
  currency: o.currency,
  status: o.orderStatus,
  paymentMethod: o.paymentMethod,
  paymentStatus: o.paymentStatus,
  shippingAddress: o.shippingAddress,
  createdAt: o.createdAt,
  estimatedDelivery: { from: addBusinessDays(o.createdAt, 3), to: addBusinessDays(o.createdAt, 5) },
});

const StatePanel = ({ icon: Icon, title, text, children }) => (
  <div className="flex min-h-[70vh] items-center justify-center px-4">
    <div className="w-full max-w-md rounded-lg border border-white/10 bg-charcoal-surface/80 p-8 text-center shadow-2xl">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/5 text-cream">
        <Icon size={26} />
      </div>
      <h1 className="font-serif text-3xl text-snow">{title}</h1>
      <p className="mt-2 text-sm text-silver">{text}</p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">{children}</div>
    </div>
  </div>
);

const btnPrimary =
  'rounded bg-burgundy px-5 py-3 text-xs font-bold uppercase tracking-widest text-snow transition hover:bg-burgundy-hover';
const btnGhost =
  'rounded border border-white/20 px-5 py-3 text-xs font-bold uppercase tracking-widest text-snow transition hover:border-cream hover:text-cream';

const OrderSuccess = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion();
  const { user, loading: authLoading } = useAuth();

  const [order, setOrder] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ready | notfound | forbidden | error

  const loadOrder = useCallback(async () => {
    setStatus('loading');
    const fail = (err) => {
      const code = err.response?.status;
      if (code === 404) setStatus('notfound');
      else if (code === 403) setStatus('forbidden');
      else setStatus('error');
    };
    try {
      // The regular order-details API exists on every backend version, so use it first
      // (no 404 noise in the console even if the server has no /confirmation route).
      const res = await orderApi.getOrderById(orderId);
      const doc = res.data?.data;
      setOrder(doc ? fromOrderDoc(doc) : null);
      setStatus(doc ? 'ready' : 'notfound');
    } catch (err) {
      fail(err);
    }
  }, [orderId]);

  useEffect(() => {
    if (!authLoading && user) loadOrder();
  }, [authLoading, user, loadOrder]);

  // The celebration only ever represents what the backend has confirmed:
  // COD orders, or card orders whose payment is recorded as paid.
  const orderFailed = !!order && ['failed', 'cancelled'].includes(String(order.status));
  const confirmed =
    !!order &&
    !orderFailed &&
    (order.paymentMethod === 'COD' || ['paid', 'completed'].includes(String(order.paymentStatus)));

  const { stage, play, skip, isDone } = useOrderSequence({
    enabled: status === 'ready' && confirmed,
    reducedMotion: !!reducedMotion,
  });

  if (authLoading) return <BrandLoader fullScreen label="Loading your order" />;
  if (!user) return <Navigate to={`/login?redirect=/order-success/${orderId}`} replace />;

  return (
    <main className="min-h-screen bg-charcoal text-snow">
      <div className="mx-auto max-w-3xl px-4 pb-20 pt-10 sm:px-6">
        {status === 'loading' && <BrandLoader label="Loading your order…" />}

        {status === 'notfound' && (
          <StatePanel icon={SearchX} title="Order Not Found" text="We couldn't find this order.">
            <Link to="/shop" className={btnPrimary}>Return to Shop</Link>
            <Link to="/my-orders" className={btnGhost}>My Orders</Link>
          </StatePanel>
        )}

        {status === 'forbidden' && (
          <StatePanel icon={Lock} title="Access Denied" text="You don't have permission to view this order.">
            <Link to="/my-orders" className={btnPrimary}>My Orders</Link>
            <Link to="/shop" className={btnGhost}>Return to Shop</Link>
          </StatePanel>
        )}

        {status === 'error' && (
          <StatePanel icon={WifiOff} title="Something went wrong." text="Please try again.">
            <button type="button" onClick={loadOrder} className={btnPrimary}>Retry</button>
            <button type="button" onClick={() => navigate('/my-orders')} className={btnGhost}>My Orders</button>
          </StatePanel>
        )}

        {status === 'ready' && order && orderFailed && (
          <StatePanel
            icon={AlertTriangle}
            title="Order Not Placed"
            text={`Order #${order.orderNumber} could not be completed (${String(order.status)}), usually because an item went out of stock. Nothing was charged.`}
          >
            <Link to="/cart" className={btnPrimary}>Back to Cart</Link>
            <Link to="/shop" className={btnGhost}>Return to Shop</Link>
          </StatePanel>
        )}

        {status === 'ready' && order && !orderFailed && !confirmed && (
          <StatePanel
            icon={String(order.paymentStatus) === 'failed' ? AlertTriangle : Clock}
            title={String(order.paymentStatus) === 'failed' ? 'Payment Failed' : 'Payment Pending'}
            text={`Order #${order.orderNumber} is saved, but its payment has not been confirmed yet, so we can't mark it as placed.`}
          >
            <button type="button" onClick={loadOrder} className={btnPrimary}>Check Again</button>
            <Link to={`/my-orders/${order.id}`} className={btnGhost}>View Order</Link>
          </StatePanel>
        )}

        {status === 'ready' && order && confirmed && (
          <>
            {/* Cinematic stage */}
            {!isDone && (
              <section aria-live="polite" className="relative">
                <div className="relative h-[340px] overflow-hidden rounded-lg border border-white/10 bg-charcoal-dark sm:h-[400px]">
                  <AnimatePresence mode="wait">
                    {stage === STAGES.PREPARING && (
                      <ProductPreparation key="prep" image={order.items[0]?.image} name={order.items[0]?.name} />
                    )}
                    {stage === STAGES.PACKING && (
                      <PackageAnimation key="pack" image={order.items[0]?.image} name={order.items[0]?.name} />
                    )}
                    {[STAGES.LOADING, STAGES.SHIPPING, STAGES.DELIVERED].includes(stage) && (
                      <DeliveryScene key="scene" stage={stage} />
                    )}
                  </AnimatePresence>

                  <AnimatePresence mode="wait">
                    <motion.p
                      key={stage}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="absolute inset-x-0 top-4 text-center text-[11px] uppercase tracking-editorial text-ice"
                    >
                      {STAGE_CAPTION[stage]}
                    </motion.p>
                  </AnimatePresence>
                </div>

                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={skip}
                    className="text-[11px] uppercase tracking-widest text-silver transition hover:text-cream"
                  >
                    Skip animation
                  </button>
                </div>
              </section>
            )}

            {/* Final state + summary */}
            {isDone && (
              <>
                <div className="pt-6">
                  <SuccessState orderNumber={order.orderNumber} instant={!!reducedMotion} />
                </div>
                <OrderSummary order={order} instant={!!reducedMotion} onReplay={play} canReplay={!reducedMotion} />
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
};

export default OrderSuccess;
