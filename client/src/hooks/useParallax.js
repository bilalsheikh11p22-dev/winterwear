import { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGsapContext } from './useGsapContext';

gsap.registerPlugin(ScrollTrigger);

/**
 * Reusable hook for smooth scroll-driven parallax movement.
 *
 * @param {Object} options
 * @param {number} options.speed - Parallax intensity (e.g. -40 to 60 pixels)
 * @param {string} options.targetSelector - Optional sub-element to animate instead of container
 */
export const useParallax = ({ speed = 40, targetSelector = null } = {}) => {
  const containerRef = useRef(null);

  useGsapContext(
    ({ prefersReducedMotion }) => {
      if (!containerRef.current || prefersReducedMotion) return;

      const target = targetSelector
        ? containerRef.current.querySelector(targetSelector)
        : containerRef.current;

      if (!target) return;

      gsap.fromTo(
        target,
        { y: -speed / 2 },
        {
          y: speed / 2,
          ease: 'none',
          scrollTrigger: {
            trigger: containerRef.current,
            start: 'top bottom',
            end: 'bottom top',
            scrub: 1,
          },
        }
      );
    },
    containerRef,
    [speed, targetSelector]
  );

  return containerRef;
};

export default useParallax;
