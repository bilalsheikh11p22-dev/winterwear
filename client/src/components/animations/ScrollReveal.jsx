import React, { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGsapContext } from '../../hooks/useGsapContext';

gsap.registerPlugin(ScrollTrigger);

/**
 * ScrollReveal Component
 * Reusable wrapper to trigger staggered or single entrance reveals on scroll.
 */
export const ScrollReveal = ({
  children,
  className = '',
  animation = 'fade-up', // 'fade-up', 'clip-reveal', 'scale-in', 'stagger'
  stagger = 0.1,
  duration = 0.8,
  delay = 0,
  start = 'top 85%',
  scrub = false,
}) => {
  const containerRef = useRef(null);

  useGsapContext(
    ({ prefersReducedMotion }) => {
      if (!containerRef.current) return;

      if (prefersReducedMotion) {
        gsap.set(containerRef.current, { opacity: 1, y: 0, scale: 1 });
        return;
      }

      let fromProps = { opacity: 0 };
      let toProps = {
        opacity: 1,
        duration,
        delay,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: containerRef.current,
          start,
          toggleActions: scrub ? undefined : 'play none none none',
          scrub: scrub ? 1 : false,
        },
      };

      if (animation === 'fade-up') {
        fromProps.y = 30;
        toProps.y = 0;
      } else if (animation === 'scale-in') {
        fromProps.scale = 0.95;
        fromProps.y = 20;
        toProps.scale = 1;
        toProps.y = 0;
      } else if (animation === 'clip-reveal') {
        fromProps.clipPath = 'polygon(0 100%, 100% 100%, 100% 100%, 0% 100%)';
        toProps.clipPath = 'polygon(0 0%, 100% 0%, 100% 100%, 0% 100%)';
        toProps.ease = 'power4.inOut';
      } else if (animation === 'stagger') {
        const targets = containerRef.current.children;
        gsap.fromTo(
          targets,
          { opacity: 0, y: 25 },
          {
            opacity: 1,
            y: 0,
            duration,
            stagger,
            delay,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: containerRef.current,
              start,
              toggleActions: 'play none none none',
            },
          }
        );
        return;
      }

      gsap.fromTo(containerRef.current, fromProps, toProps);
    },
    containerRef,
    [animation, stagger, duration, delay, start, scrub]
  );

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  );
};

export default ScrollReveal;
