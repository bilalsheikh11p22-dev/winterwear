import React, { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGsapContext } from '../../hooks/useGsapContext';

gsap.registerPlugin(ScrollTrigger);

/**
 * AnimatedText Component
 * Splits text into staggered words/lines and reveals them with a smooth mask or slide.
 */
export const AnimatedText = ({
  children,
  as: Component = 'h2',
  className = '',
  delay = 0,
  stagger = 0.04,
  duration = 0.9,
  triggerOnScroll = true,
}) => {
  const containerRef = useRef(null);

  useGsapContext(
    ({ prefersReducedMotion }) => {
      if (!containerRef.current) return;
      const words = containerRef.current.querySelectorAll('.word-token');

      if (prefersReducedMotion) {
        gsap.set(words, { opacity: 1, y: 0 });
        return;
      }

      const animation = gsap.fromTo(
        words,
        { opacity: 0, y: 35, rotateX: 10 },
        {
          opacity: 1,
          y: 0,
          rotateX: 0,
          duration,
          stagger,
          delay,
          ease: 'power3.out',
          scrollTrigger: triggerOnScroll
            ? {
                trigger: containerRef.current,
                start: 'top 88%',
                toggleActions: 'play none none none',
              }
            : undefined,
        }
      );

      return () => animation.kill();
    },
    containerRef,
    [children, delay, stagger, duration, triggerOnScroll]
  );

  // If children is a string, split into word tokens
  if (typeof children === 'string') {
    const words = children.split(' ');
    return (
      <Component ref={containerRef} className={`${className} perspective-1000`}>
        {words.map((word, idx) => (
          <span key={idx} className="inline-block overflow-hidden mr-[0.28em] align-top">
            <span className="word-token inline-block transform-gpu will-change-transform">
              {word}
            </span>
          </span>
        ))}
      </Component>
    );
  }

  return (
    <Component ref={containerRef} className={className}>
      {children}
    </Component>
  );
};

export default AnimatedText;
