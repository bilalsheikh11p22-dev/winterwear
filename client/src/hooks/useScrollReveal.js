import { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGsapContext } from './useGsapContext';

gsap.registerPlugin(ScrollTrigger);

/**
 * Reusable hook for scroll-triggered entrance animations.
 *
 * @param {Object} options
 * @param {string} options.selector - Target child selector (e.g., '.reveal-item')
 * @param {string} options.type - 'fade-up' | 'clip-reveal' | 'scale-up' | 'stagger-fade'
 * @param {number} options.stagger - Stagger delay between items
 * @param {number} options.duration - Duration in seconds
 * @param {string} options.start - ScrollTrigger start position
 */
export const useScrollReveal = ({
  selector = '.reveal-item',
  type = 'fade-up',
  stagger = 0.15,
  duration = 1.0,
  start = 'top 85%',
  scrub = false,
} = {}) => {
  const containerRef = useRef(null);

  useGsapContext(
    ({ prefersReducedMotion }) => {
      if (!containerRef.current) return;
      const elements = containerRef.current.querySelectorAll(selector);

      if (!elements || elements.length === 0) return;

      if (prefersReducedMotion) {
        // Reduced motion: ensure all elements are immediately visible
        gsap.set(elements, { opacity: 1, y: 0, scale: 1, clipPath: 'none' });
        return;
      }

      let fromVars = { opacity: 0 };
      let toVars = {
        opacity: 1,
        duration,
        stagger,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: containerRef.current,
          start,
          toggleActions: scrub ? undefined : 'play none none none',
          scrub: scrub ? 1 : false,
        },
      };

      if (type === 'fade-up') {
        fromVars.y = 40;
        toVars.y = 0;
      } else if (type === 'scale-up') {
        fromVars.scale = 0.94;
        fromVars.y = 20;
        toVars.scale = 1;
        toVars.y = 0;
      } else if (type === 'clip-reveal') {
        fromVars.clipPath = 'polygon(0 100%, 100% 100%, 100% 100%, 0% 100%)';
        toVars.clipPath = 'polygon(0 0%, 100% 0%, 100% 100%, 0% 100%)';
        toVars.ease = 'power4.inOut';
      }

      gsap.fromTo(elements, fromVars, toVars);
    },
    containerRef,
    [selector, type, stagger, duration, start, scrub]
  );

  return containerRef;
};

export default useScrollReveal;
