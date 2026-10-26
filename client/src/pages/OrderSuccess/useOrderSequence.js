import { useCallback, useEffect, useState } from 'react';
import { STAGES, STAGE_ORDER, STAGE_DURATION } from './animations/orderAnimations';

const LAST = STAGE_ORDER.length - 1;

/**
 * Single centralized state machine for the cinematic sequence.
 * Exactly one timer exists at any time; it advances PREPARING → … → SUCCESS.
 *
 *  - enabled:  the order has been confirmed by the backend (never start before that)
 *  - instant:  reduced-motion users jump straight to SUCCESS
 */
export const useOrderSequence = ({ enabled, instant }) => {
  const [index, setIndex] = useState(0);
  const [runId, setRunId] = useState(0);

  useEffect(() => {
    if (!enabled) return undefined;
    if (instant) {
      setIndex(LAST);
      return undefined;
    }
    if (index >= LAST) return undefined;

    const timer = setTimeout(() => setIndex((i) => Math.min(i + 1, LAST)), STAGE_DURATION[STAGE_ORDER[index]]);
    return () => clearTimeout(timer);
  }, [enabled, instant, index, runId]);

  const skip = useCallback(() => setIndex(LAST), []);
  const replay = useCallback(() => {
    setIndex(0);
    setRunId((n) => n + 1);
  }, []);

  const stage = enabled ? STAGE_ORDER[index] : STAGES.PREPARING;
  return { stage, isDone: enabled && index === LAST, skip, replay, runId };
};
