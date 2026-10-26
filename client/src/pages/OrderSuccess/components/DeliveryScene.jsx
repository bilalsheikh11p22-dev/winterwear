import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import DeliveryTruck, { ParcelIcon } from './DeliveryTruck';
import { EASE, EASE_IN_OUT, STAGES, stageIndex } from '../animations/orderAnimations';

const ROAD_H = 44;
const DASH_PERIOD = 80;

const KEYFRAMES = `
@keyframes ww-spin { to { transform: rotate(360deg); } }
@keyframes ww-road { to { transform: translate3d(-${DASH_PERIOD}px,0,0); } }
@keyframes ww-hills { to { transform: translate3d(-50%,0,0); } }
@keyframes ww-cloud { from { transform: translate3d(0,0,0); } to { transform: translate3d(-140vw,0,0); } }
@keyframes ww-bob { 0%,100% { transform: translate3d(0,0,0); } 50% { transform: translate3d(0,-1.5px,0); } }
`;

const useContainerWidth = (ref) => {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const update = () => setWidth(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return width;
};

const Cloud = ({ top, left, scale, duration, delay }) => (
  <svg
    aria-hidden
    viewBox="0 0 120 40"
    width={110 * scale}
    className="absolute"
    style={{
      top,
      left,
      opacity: 0.16,
      animation: `ww-cloud ${duration}s linear ${delay}s infinite`,
    }}
  >
    <path
      d="M20 34c-9 0-16-6-16-13s6-12 14-12c2-6 8-9 15-9 9 0 15 5 17 12 2-1 4-2 7-2 9 0 16 5 16 12s-6 12-14 12z"
      fill="#C9DDE8"
    />
  </svg>
);

const House = ({ width, visible }) => (
  <motion.svg
    aria-hidden
    viewBox="0 0 90 100"
    width={width}
    height={(width * 100) / 90}
    className="absolute"
    style={{ right: 10, bottom: ROAD_H - 4 }}
    initial={{ opacity: 0, x: 40 }}
    animate={visible ? { opacity: 1, x: 0 } : { opacity: 0, x: 40 }}
    transition={{ duration: 1, ease: EASE }}
  >
    <rect x="8" y="38" width="74" height="60" rx="2" fill="#25292E" stroke="#363B42" />
    <path d="M2 40 45 8l43 32z" fill="#4D1623" stroke="#000" strokeOpacity="0.25" />
    <rect x="36" y="62" width="18" height="36" rx="2" fill="#17191C" />
    <circle cx="50" cy="82" r="1.5" fill="#EDE7DC" />
    <rect x="14" y="50" width="16" height="16" rx="1.5" fill="#F5D98A" opacity="0.85" />
    <rect x="60" y="50" width="16" height="16" rx="1.5" fill="#F5D98A" opacity="0.85" />
  </motion.svg>
);

/**
 * Phases 3-5 — loading the parcel, driving across a quiet winter-dusk road and arriving.
 * Everything is positioned from the measured container width, so it re-flows on phones.
 * All movement uses transform / opacity only.
 */
const DeliveryScene = ({ stage }) => {
  const ref = useRef(null);
  const w = useContainerWidth(ref);

  const idx = stageIndex(stage);
  const moving = stage === STAGES.SHIPPING;
  const arrived = idx >= stageIndex(STAGES.DELIVERED);
  const shippingStarted = idx >= stageIndex(STAGES.SHIPPING);

  const truckW = Math.max(112, Math.min(190, w * 0.3));
  const houseW = Math.max(54, Math.min(96, w * 0.15));
  const parcelW = Math.max(36, truckW * 0.3);
  const loadX = w * 0.12;
  const destX = Math.max(loadX, w - truckW - houseW - 22);

  const truckTarget = shippingStarted ? destX : loadX;
  const truckTransition = moving
    ? { duration: 2.55, ease: EASE_IN_OUT }
    : stage === STAGES.LOADING
    ? { duration: 0.85, ease: EASE }
    : { duration: 0.01 };

  const running = moving ? 'running' : 'paused';

  return (
    <motion.div
      ref={ref}
      className="absolute inset-0 overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.2 } }}
    >
      <style>{KEYFRAMES}</style>

      {/* sky glow + clouds (slow parallax) */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ background: 'radial-gradient(70% 60% at 70% 30%, rgba(143,57,76,0.22), transparent 70%)' }}
      />
      <Cloud top="8%" left="85%" scale={1} duration={70} delay={0} />
      <Cloud top="22%" left="105%" scale={0.7} duration={95} delay={-30} />
      <Cloud top="4%" left="120%" scale={0.55} duration={120} delay={-70} />

      {/* distant hills (mid parallax) */}
      <div className="absolute left-0 right-0" style={{ bottom: ROAD_H, height: 70 }} aria-hidden>
        <div
          className="h-full"
          style={{
            width: '200%',
            animation: 'ww-hills 18s linear infinite',
            animationPlayState: running,
          }}
        >
          <svg viewBox="0 0 1000 70" preserveAspectRatio="none" width="100%" height="100%">
            <path
              d="M0 70V40q60-28 120-6t110-10q70-30 140 4t120-8q60-22 130 6t120-10q60-24 130 6t130-8V70z"
              fill="#1E2125"
            />
          </svg>
        </div>
      </div>

      {/* destination */}
      <House width={houseW} visible={shippingStarted} />

      {/* road */}
      <div
        className="absolute left-0 right-0 bottom-0 border-t border-white/10"
        style={{ height: ROAD_H, background: 'linear-gradient(#25292E,#1B1E22)' }}
      >
        <div className="absolute left-0 top-1/2 h-[3px] -translate-y-1/2 overflow-hidden" style={{ width: '100%' }}>
          <div
            style={{
              width: `calc(100% + ${DASH_PERIOD}px)`,
              height: 3,
              backgroundImage: `repeating-linear-gradient(90deg, rgba(237,231,220,0.55) 0 36px, transparent 36px ${DASH_PERIOD}px)`,
              animation: 'ww-road 0.45s linear infinite',
              animationPlayState: running,
            }}
          />
        </div>
      </div>

      {w > 0 && (
        <>
          {/* truck */}
          <motion.div
            className="absolute"
            style={{ bottom: ROAD_H - 12, left: 0 }}
            initial={{ x: -truckW - 20 }}
            animate={{ x: truckTarget }}
            transition={truckTransition}
          >
            <div style={{ animation: 'ww-bob 0.35s ease-in-out infinite', animationPlayState: running }}>
              <DeliveryTruck width={truckW} moving={moving} />
            </div>
          </motion.div>

          {/* parcel being loaded: floats forward, then shrinks into the cargo bay */}
          {stage === STAGES.LOADING && (
            <motion.div
              className="absolute"
              style={{ bottom: ROAD_H - 8, left: 0 }}
              initial={{ x: w * 0.5 - parcelW / 2, y: 0, scale: 1, opacity: 1 }}
              animate={{
                x: [w * 0.5 - parcelW / 2, w * 0.5 - parcelW / 2, loadX + truckW * 0.3],
                y: [0, 0, -truckW * 0.2],
                scale: [1, 1, 0.55],
                opacity: [1, 1, 0],
              }}
              transition={{ duration: 1.4, delay: 0.5, times: [0, 0.2, 1], ease: EASE_IN_OUT }}
            >
              <ParcelIcon size={parcelW} />
            </motion.div>
          )}

          {/* parcel handed over at the destination */}
          {arrived && (
            <motion.div
              className="absolute"
              style={{ bottom: ROAD_H - 6, left: 0, x: w - houseW * 0.5 - 10 - parcelW / 2 }}
              initial={{ scale: 0, y: -20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.1 }}
            >
              <ParcelIcon size={parcelW} />
            </motion.div>
          )}
        </>
      )}
    </motion.div>
  );
};

export default DeliveryScene;
