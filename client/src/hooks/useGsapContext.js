import { useLayoutEffect, useEffect, useRef } from 'react';
import gsap from 'gsap';

// Use isomorphic layout effect for SSR safety
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/**
 * Custom hook to safely manage GSAP animation contexts within React components.
 * Automatically wraps animations in gsap.context() and reverts on unmount to avoid
 * memory leaks, dangling triggers, and duplicate animations in React Strict Mode.
 *
 * @param {Function} animationCallback - Callback containing GSAP animations
 * @param {React.RefObject} scopeRef - Ref pointing to the scope container DOM node
 * @param {Array} dependencies - Dependency array to trigger re-creation
 */
export const useGsapContext = (animationCallback, scopeRef, dependencies = []) => {
  const contextRef = useRef(null);

  useIsomorphicLayoutEffect(() => {
    // Check if user prefers reduced motion
    const prefersReducedMotion = typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!scopeRef?.current) return;

    // Create scoped context
    contextRef.current = gsap.context(() => {
      animationCallback({ prefersReducedMotion });
    }, scopeRef);

    return () => {
      contextRef.current?.revert();
      contextRef.current = null;
    };
  }, dependencies);

  return contextRef;
};

export default useGsapContext;
