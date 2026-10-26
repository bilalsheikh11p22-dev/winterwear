import React, { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGsapContext } from '../../hooks/useGsapContext';

gsap.registerPlugin(ScrollTrigger);

/**
 * ParallaxImage Component
 * Displays an image with subtle, performant scrub parallax inside an overflow-hidden wrapper.
 */
export const ParallaxImage = ({
  src,
  alt = '',
  className = '',
  aspectRatio = 'aspect-[3/4]',
  speed = 35,
  overlay = true,
  children,
}) => {
  const containerRef = useRef(null);
  const imgRef = useRef(null);

  useGsapContext(
    ({ prefersReducedMotion }) => {
      if (!containerRef.current || !imgRef.current || prefersReducedMotion) return;

      gsap.fromTo(
        imgRef.current,
        { y: -speed / 2, scale: 1.08 },
        {
          y: speed / 2,
          scale: 1.04,
          ease: 'none',
          scrollTrigger: {
            trigger: containerRef.current,
            start: 'top bottom',
            end: 'bottom top',
            scrub: 1.2,
          },
        }
      );
    },
    containerRef,
    [speed]
  );

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${aspectRatio} ${className} bg-charcoal-surface`}
    >
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        loading="lazy"
        className="w-full h-full object-cover object-center transform-gpu will-change-transform"
      />
      {overlay && (
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal-dark/70 via-transparent to-transparent pointer-events-none" />
      )}
      {children}
    </div>
  );
};

export default ParallaxImage;
