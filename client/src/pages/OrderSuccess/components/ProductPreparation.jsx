import React from 'react';
import { motion } from 'framer-motion';
import { EASE } from '../animations/orderAnimations';

/** Phase 1 — the purchased product appears, gently floating with a soft glow. */
const ProductPreparation = ({ image, name }) => (
  <motion.div
    className="absolute inset-0 flex items-center justify-center"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0, transition: { duration: 0.25 } }}
  >
    <div className="relative">
      <motion.div
        aria-hidden
        className="absolute -inset-10 rounded-full bg-burgundy/30 blur-3xl"
        animate={{ opacity: [0.35, 0.7, 0.35], scale: [0.95, 1.05, 0.95] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.82, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.9, ease: EASE }}
      >
        <motion.img
          src={image}
          alt={name}
          draggable={false}
          className="relative w-36 h-44 sm:w-48 sm:h-56 object-cover rounded-md border border-white/10 shadow-2xl shadow-black/60"
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        />
      </motion.div>
    </div>
  </motion.div>
);

export default ProductPreparation;
