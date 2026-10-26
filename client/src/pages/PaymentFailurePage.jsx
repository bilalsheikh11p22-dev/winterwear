import React from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { XCircle, ArrowRight, RefreshCw, MessageSquare } from 'lucide-react';

const PaymentFailurePage = () => {
  const [searchParams] = useSearchParams();
  const orderNumber = searchParams.get('order');

  return (
    <div className="min-h-screen bg-charcoal text-snow py-16 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="max-w-xl w-full glass-panel p-8 sm:p-10 rounded-lg border border-red-500/20 text-center space-y-6 shadow-2xl">
        <div className="w-16 h-16 rounded-full bg-red-950/40 border border-red-500/30 text-red-400 flex items-center justify-center mx-auto">
          <XCircle className="w-9 h-9 stroke-[2]" />
        </div>

        <div>
          <span className="text-xs uppercase tracking-editorial text-red-400 font-bold block mb-1">
            Payment Not Completed
          </span>
          <h1 className="font-editorial-serif text-3xl sm:text-4xl text-snow font-light">
            Payment Authorization Failed
          </h1>
          {orderNumber && (
            <div className="mt-3 inline-block px-3 py-1.5 bg-white/5 border border-white/10 rounded font-mono text-xs text-silver">
              Reference: {orderNumber}
            </div>
          )}
        </div>

        <p className="text-xs text-silver leading-relaxed max-w-md mx-auto">
          The transaction could not be authorized by your card issuer or gateway. Your order items remain reserved temporarily in our atelier system.
        </p>

        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/checkout"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-cream hover:bg-snow text-charcoal font-bold text-xs uppercase tracking-widest rounded transition-all duration-300"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Retry Checkout</span>
          </Link>
          <Link
            to="/contact"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 border border-white/10 hover:border-white/30 text-snow hover:text-cream text-xs uppercase tracking-widest font-semibold rounded transition-colors"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Atelier Concierge</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PaymentFailurePage;
