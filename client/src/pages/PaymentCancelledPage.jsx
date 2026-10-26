import React from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft, ShoppingBag } from 'lucide-react';

const PaymentCancelledPage = () => {
  const [searchParams] = useSearchParams();
  const orderNumber = searchParams.get('order');

  return (
    <div className="min-h-screen bg-charcoal text-snow py-16 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="max-w-xl w-full glass-panel p-8 sm:p-10 rounded-lg border border-amber-500/20 text-center space-y-6 shadow-2xl">
        <div className="w-16 h-16 rounded-full bg-amber-950/40 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
          <AlertCircle className="w-9 h-9 stroke-[2]" />
        </div>

        <div>
          <span className="text-xs uppercase tracking-editorial text-amber-400 font-bold block mb-1">
            Checkout Window Closed
          </span>
          <h1 className="font-editorial-serif text-3xl sm:text-4xl text-snow font-light">
            Payment Cancelled
          </h1>
          {orderNumber && (
            <div className="mt-3 inline-block px-3 py-1.5 bg-white/5 border border-white/10 rounded font-mono text-xs text-silver">
              Reference: {orderNumber}
            </div>
          )}
        </div>

        <p className="text-xs text-silver leading-relaxed max-w-md mx-auto">
          You opted not to complete the online transaction. Your bag items have been preserved so you can proceed whenever you are ready, or choose Cash on Delivery at checkout.
        </p>

        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/checkout"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-cream hover:bg-snow text-charcoal font-bold text-xs uppercase tracking-widest rounded transition-all duration-300"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Checkout</span>
          </Link>
          <Link
            to="/cart"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 border border-white/10 hover:border-white/30 text-snow hover:text-cream text-xs uppercase tracking-widest font-semibold rounded transition-colors"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>View Bag</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PaymentCancelledPage;
