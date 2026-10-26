import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { CalendarClock, CreditCard, MapPin, RotateCcw } from 'lucide-react';
import { EASE } from '../animations/orderAnimations';

const money = (currency, value) => `${currency || 'PKR'} ${Number(value || 0).toLocaleString('en-PK')}`;
const fmtDate = (d) =>
  new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

const PAYMENT_LABEL = { COD: 'Cash on delivery', Stripe: 'Card (Stripe)' };

/** Real order data only — everything here comes from the confirmation endpoint. */
const OrderSummary = ({ order, instant, onReplay, canReplay }) => {
  const addr = order.shippingAddress || {};
  const eta = order.estimatedDelivery;

  return (
    <motion.section
      initial={{ opacity: instant ? 1 : 0, y: instant ? 0 : 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: instant ? 0 : 0.7, delay: instant ? 0 : 0.35, ease: EASE }}
      className="mx-auto mt-10 w-full max-w-2xl rounded-lg border border-white/10 bg-charcoal-surface/80 p-5 text-left shadow-2xl sm:p-8"
      aria-label="Order summary"
    >
      <ul className="divide-y divide-white/5">
        {order.items.map((item, i) => (
          <li key={`${item.product}-${item.size}-${i}`} className="flex gap-4 py-4 first:pt-0">
            {item.image ? (
              <img
                src={item.image}
                alt={item.name}
                loading="lazy"
                className="h-20 w-16 flex-shrink-0 rounded border border-white/10 object-cover"
              />
            ) : (
              <div className="h-20 w-16 flex-shrink-0 rounded border border-white/10 bg-charcoal" />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate font-serif text-lg text-snow">{item.name}</p>
              <p className="mt-0.5 text-xs text-silver">
                Qty: {item.quantity}
                {item.size ? ` · Size: ${item.size}` : ''}
                {item.color?.name ? ` · ${item.color.name}` : ''}
              </p>
            </div>
            <p className="whitespace-nowrap text-sm text-snow">
              {money(order.currency, item.totalItemPrice ?? item.price * item.quantity)}
            </p>
          </li>
        ))}
      </ul>

      <dl className="mt-2 space-y-1.5 border-t border-white/10 pt-4 text-sm">
        <div className="flex justify-between text-silver">
          <dt>Subtotal</dt>
          <dd>{money(order.currency, order.subtotal)}</dd>
        </div>
        {order.discountAmount > 0 && (
          <div className="flex justify-between text-silver">
            <dt>Discount</dt>
            <dd>− {money(order.currency, order.discountAmount)}</dd>
          </div>
        )}
        <div className="flex justify-between text-silver">
          <dt>Shipping</dt>
          <dd>{order.shippingFee > 0 ? money(order.currency, order.shippingFee) : 'Free'}</dd>
        </div>
        <div className="flex justify-between pt-2 text-base font-semibold text-snow">
          <dt>Total</dt>
          <dd>{money(order.currency, order.totalAmount)}</dd>
        </div>
      </dl>

      <div className="mt-6 grid gap-4 text-xs text-silver sm:grid-cols-3">
        <div className="flex gap-2.5">
          <MapPin size={15} className="mt-0.5 flex-shrink-0 text-cream" />
          <div>
            <p className="mb-0.5 uppercase tracking-widest text-silver/70">Deliver to</p>
            <p className="text-snow">{addr.fullName}</p>
            <p>{[addr.street, addr.apartment, addr.city].filter(Boolean).join(', ')}</p>
          </div>
        </div>
        <div className="flex gap-2.5">
          <CreditCard size={15} className="mt-0.5 flex-shrink-0 text-cream" />
          <div>
            <p className="mb-0.5 uppercase tracking-widest text-silver/70">Payment</p>
            <p className="text-snow">{PAYMENT_LABEL[order.paymentMethod] || order.paymentMethod}</p>
            <p className="capitalize">{String(order.paymentStatus || '').replace(/_/g, ' ')}</p>
          </div>
        </div>
        {eta?.from && (
          <div className="flex gap-2.5">
            <CalendarClock size={15} className="mt-0.5 flex-shrink-0 text-cream" />
            <div>
              <p className="mb-0.5 uppercase tracking-widest text-silver/70">Estimated delivery</p>
              <p className="text-snow">
                {fmtDate(eta.from)} – {fmtDate(eta.to)}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          to={`/my-orders/${order.id}`}
          className="flex-1 rounded bg-burgundy py-3.5 text-center text-xs font-bold uppercase tracking-widest text-snow transition hover:bg-burgundy-hover"
        >
          Track Order
        </Link>
        <Link
          to="/shop"
          className="flex-1 rounded border border-white/20 py-3.5 text-center text-xs font-bold uppercase tracking-widest text-snow transition hover:border-cream hover:text-cream"
        >
          Continue Shopping
        </Link>
      </div>

      {canReplay && (
        <button
          type="button"
          onClick={onReplay}
          className="mx-auto mt-5 flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-silver transition hover:text-cream"
        >
          <RotateCcw size={12} /> Replay animation
        </button>
      )}
    </motion.section>
  );
};

export default OrderSummary;
