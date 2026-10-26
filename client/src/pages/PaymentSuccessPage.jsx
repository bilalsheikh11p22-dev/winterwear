import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { checkoutApi } from '../services/api';
import { CheckCircle2, PackageCheck, ArrowRight, Home, Clock, AlertCircle } from 'lucide-react';

const PaymentSuccessPage = () => {
  const [searchParams] = useSearchParams();
  const orderNumber = searchParams.get('order');
  const sessionId = searchParams.get('session_id');
  const method = searchParams.get('method');

  const { clearCart, currency } = useCart();
  const [verifying, setVerifying] = useState(!!sessionId);
  const [verificationResult, setVerificationResult] = useState(null);

  useEffect(() => {
    // Clear cart on mount
    clearCart();

    // If Stripe session ID is present, verify status
    if (sessionId) {
      setVerifying(true);
      checkoutApi
        .getPaymentStatus(sessionId)
        .then((res) => {
          setVerificationResult(res.data?.data);
        })
        .catch((err) => {
          console.warn('[PaymentSuccessPage] Payment verification check:', err.message);
        })
        .finally(() => {
          setVerifying(false);
        });
    }
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-charcoal text-snow py-16 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="max-w-xl w-full glass-panel p-8 sm:p-10 rounded-lg border border-white/10 text-center space-y-6 shadow-2xl">
        {/* Animated Icon */}
        <div className="w-16 h-16 rounded-full bg-cream/10 border border-cream/30 text-cream flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-9 h-9 stroke-[2] text-cream" />
        </div>

        <div>
          <span className="text-xs uppercase tracking-editorial text-ice font-bold block mb-1">
            Order Placed Successfully
          </span>
          <h1 className="font-editorial-serif text-3xl sm:text-4xl text-snow font-light">
            Thank You For Your Order
          </h1>
          {orderNumber && (
            <div className="mt-3 inline-block px-3 py-1.5 bg-white/5 border border-white/10 rounded font-mono text-sm text-cream font-bold">
              {orderNumber}
            </div>
          )}
        </div>

        <div className="p-4 bg-charcoal-dark/70 rounded border border-white/5 text-xs text-silver leading-relaxed space-y-2 text-left">
          {method === 'cod' ? (
            <p>
              Your order has been recorded for <strong className="text-snow">Cash on Delivery</strong>. Our courier partner will collect payment upon physical delivery to your doorstep.
            </p>
          ) : (
            <p>
              Your payment has been authorized. Our logistics team in Lahore is now reserving, packing, and preparing your order for insured dispatch.
            </p>
          )}
          <div className="flex items-center gap-2 pt-2 text-ice font-semibold">
            <Clock className="w-4 h-4" />
            <span>Estimated Delivery: 3 to 5 business days nationwide</span>
          </div>
        </div>

        {/* Action CTAs */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/my-orders"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-burgundy hover:bg-burgundy-hover text-snow font-bold text-xs uppercase tracking-widest rounded transition-all duration-300"
          >
            <PackageCheck className="w-4 h-4" />
            <span>Track My Order</span>
          </Link>
          <Link
            to="/shop"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 border border-white/10 hover:border-white/30 text-snow hover:text-cream text-xs uppercase tracking-widest font-semibold rounded transition-colors"
          >
            <span>Continue Shopping</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccessPage;
