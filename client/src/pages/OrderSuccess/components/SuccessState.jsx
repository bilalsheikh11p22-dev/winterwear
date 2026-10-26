import React from 'react';
import { motion } from 'framer-motion';
import { EASE } from '../animations/orderAnimations';

/** Phase 5 — circle reveal + check mark drawing + headline. Understated, no confetti. */
const SuccessState = ({ orderNumber, instant }) => {
  const d = instant ? 0 : 1;
  return (
    <div className="text-center">
      <motion.svg
        viewBox="0 0 96 96"
        className="mx-auto h-20 w-20 sm:h-24 sm:w-24"
        role="img"
        aria-label="Order confirmed"
        initial={{ scale: instant ? 1 : 0.6, opacity: instant ? 1 : 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 * d, ease: EASE }}
      >
        <motion.circle
          cx="48"
          cy="48"
          r="44"
          fill="rgba(237,231,220,0.06)"
          stroke="#EDE7DC"
          strokeWidth="2.5"
          initial={{ pathLength: instant ? 1 : 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.7 * d, ease: 'easeInOut' }}
        />
        <motion.path
          d="M28 50l14 14 27-30"
          fill="none"
          stroke="#EDE7DC"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: instant ? 1 : 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.5 * d, delay: 0.55 * d, ease: 'easeOut' }}
        />
      </motion.svg>

      <motion.div
        initial={{ opacity: instant ? 1 : 0, y: instant ? 0 : 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 * d, delay: 0.9 * d, ease: EASE }}
        className="mt-6"
      >
        <p className="text-[11px] uppercase tracking-editorial text-ice font-semibold">Order confirmed</p>
        <h1 className="mt-2 font-serif text-3xl sm:text-5xl text-snow font-light">Order Successfully Placed</h1>
        <p className="mt-4 text-sm text-silver">Thank you for your order.</p>
        <p className="mt-3 inline-block rounded border border-white/10 bg-white/5 px-3 py-1.5 font-mono text-sm font-bold text-cream">
          Order #{orderNumber}
        </p>
        <p className="mx-auto mt-3 max-w-md text-sm text-silver/90">
          Your order has been confirmed and is being prepared for delivery.
        </p>
      </motion.div>
    </div>
  );
};

export default SuccessState;
