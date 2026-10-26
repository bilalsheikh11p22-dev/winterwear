import React from 'react';
import { motion } from 'framer-motion';
import { EASE, EASE_IN_OUT } from '../animations/orderAnimations';

const BOX_W = 200;

/**
 * Phase 2 — the actual product travels into a shipping box, the lid drops and the
 * box is taped shut. Three stacked layers (box back → product → box front) make the
 * product genuinely disappear *into* the box.
 */
const PackageAnimation = ({ image, name }) => (
  <motion.div
    className="absolute inset-0 flex items-end justify-center pb-6 sm:pb-8"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0, transition: { duration: 0.25 } }}
  >
    <div className="relative" style={{ width: BOX_W, height: 230 }}>
      {/* soft contact shadow */}
      <motion.div
        aria-hidden
        className="absolute left-1/2 bottom-0 h-4 w-40 -translate-x-1/2 rounded-full bg-black/50 blur-md"
        initial={{ opacity: 0, scaleX: 0.6 }}
        animate={{ opacity: 1, scaleX: 1 }}
        transition={{ duration: 0.6 }}
      />

      {/* layer 1 — inside / back of the box */}
      <svg className="absolute inset-x-0 bottom-3" viewBox="0 0 200 120" width={BOX_W} aria-hidden>
        <rect x="14" y="14" width="172" height="26" rx="3" fill="#2B2420" />
        <rect x="14" y="14" width="172" height="26" rx="3" fill="url(#ww-inside)" />
        <defs>
          <linearGradient id="ww-inside" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#000" stopOpacity="0.55" />
            <stop offset="1" stopColor="#000" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>

      {/* layer 2 — the product itself */}
      <motion.img
        src={image}
        alt={name}
        draggable={false}
        className="absolute left-1/2 top-0 h-28 w-24 -ml-12 rounded object-cover shadow-xl shadow-black/50"
        initial={{ y: -10, scale: 1, opacity: 0 }}
        animate={{ y: [-10, 24, 112], scale: [1, 0.9, 0.55], opacity: [0, 1, 1] }}
        transition={{ duration: 1.25, delay: 0.1, times: [0, 0.4, 1], ease: EASE_IN_OUT }}
      />

      {/* layer 3 — front of the box, lid and tape */}
      <svg className="absolute inset-x-0 bottom-3" viewBox="0 0 200 120" width={BOX_W} aria-hidden>
        <defs>
          <linearGradient id="ww-cardboard" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#D8D0C2" />
            <stop offset="1" stopColor="#BDB3A2" />
          </linearGradient>
        </defs>
        {/* body */}
        <rect x="14" y="36" width="172" height="80" rx="3" fill="url(#ww-cardboard)" />
        <rect x="14" y="36" width="172" height="80" rx="3" fill="none" stroke="#000" strokeOpacity="0.12" />
        <rect x="14" y="104" width="172" height="12" fill="#000" opacity="0.08" />

        {/* lid drops onto the box */}
        <motion.g
          initial={{ y: -90, rotate: -8, opacity: 0 }}
          animate={{ y: 0, rotate: 0, opacity: 1 }}
          transition={{ delay: 1.35, duration: 0.55, ease: EASE }}
          style={{ transformOrigin: '100px 36px', transformBox: 'view-box' }}
        >
          <rect x="10" y="22" width="180" height="18" rx="3" fill="#E4DCCD" stroke="#000" strokeOpacity="0.12" />
        </motion.g>

        {/* sealing tape: draws across lid and down the front */}
        <motion.rect
          x="92"
          y="22"
          width="16"
          height="94"
          fill="#762B3D"
          opacity="0.92"
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ delay: 1.9, duration: 0.35, ease: 'easeOut' }}
          style={{ transformOrigin: '100px 22px', transformBox: 'view-box' }}
        />
        <motion.text
          x="100"
          y="82"
          textAnchor="middle"
          fontSize="9"
          fill="#F8F7F4"
          letterSpacing="2"
          fontFamily="Cinzel, serif"
          transform="rotate(-90 100 82)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.9 }}
          transition={{ delay: 2.1, duration: 0.2 }}
        >
          WINTERWEAR
        </motion.text>
      </svg>

      {/* little "sealed" pulse */}
      <motion.div
        aria-hidden
        className="absolute inset-x-6 bottom-3 h-[90px] rounded-md ring-2 ring-cream/60"
        initial={{ opacity: 0, scale: 1 }}
        animate={{ opacity: [0, 0.8, 0], scale: [1, 1.08, 1.12] }}
        transition={{ delay: 1.9, duration: 0.4 }}
      />
    </div>
  </motion.div>
);

export default PackageAnimation;
