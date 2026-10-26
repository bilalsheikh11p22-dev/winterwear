import { useCallback, useEffect, useRef, useState } from 'react';

/** Ordered animation stages. The order of this object IS the playback order. */
export const STAGES = {
  PREPARING: 'preparing',
  PACKING: 'packing',
  LOADING: 'loading',
  SHIPPING: 'shipping',
  DELIVERED: 'delivered',
  SUCCESS: 'success',
};

const ORDER = [
  STAGES.PREPARING,
  STAGES.PACKING,
  STAGES.LOADING,
  STAGES.SHIPPING,
  STAGES.DELIVERED,
  STAGES.SUCCESS,
];

/** How long each stage lasts (ms). Total ≈ 9.2s before the final state. */
export const STAGE_DURATION = {
  [STAGES.PREPARING]: 1700,
  [STAGES.PACKING]: 2300,
  [STAGES.LOADING]: 2200,
  [STAGES.SHIPPING]: 2700,
  [STAGES.DELIVERED]: 900,
};

export const STAGE_CAPTION = {
  [STAGES.PREPARING]: 'Preparing your order…',
  [STAGES.PACKING]: 'Packing your order…',
  [STAGES.LOADING]: 'Handing it to our courier…',
  [STAGES.SHIPPING]: 'Your order is on the way…',
  [STAGES.DELIVERED]: 'Arrived at its destination',
};

export const stageIndex = (stage) => ORDER.indexOf(stage);

/**
 * Single, centralised controller for the whole sequence.
 * One timer at a time, no timers scattered across components.
 *
 *  - `play()`   (re)starts from PREPARING
 *  - `skip()`   jumps straight to SUCCESS
 *  - when `reducedMotion` is true the sequence is skipped entirely.
 */
export const useOrderSequence = ({ enabled, reducedMotion }) => {
  const [stage, setStage] = useState(STAGES.PREPARING);
  const [runId, setRunId] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    clearTimeout(timerRef.current);
    if (!enabled) return undefined;

    if (reducedMotion) {
      setStage(STAGES.SUCCESS);
      return undefined;
    }

    let cancelled = false;
    setStage(STAGES.PREPARING);

    const advance = (index) => {
      const current = ORDER[index];
      if (current === STAGES.SUCCESS) return;
      timerRef.current = setTimeout(() => {
        if (cancelled) return;
        setStage(ORDER[index + 1]);
        advance(index + 1);
      }, STAGE_DURATION[current]);
    };
    advance(0);

    return () => {
      cancelled = true;
      clearTimeout(timerRef.current);
    };
  }, [enabled, reducedMotion, runId]);

  const play = useCallback(() => setRunId((n) => n + 1), []);
  const skip = useCallback(() => {
    clearTimeout(timerRef.current);
    setStage(STAGES.SUCCESS);
  }, []);

  return { stage, play, skip, isDone: stage === STAGES.SUCCESS };
};

export const EASE = [0.22, 1, 0.36, 1];
export const EASE_IN_OUT = [0.65, 0, 0.35, 1];
