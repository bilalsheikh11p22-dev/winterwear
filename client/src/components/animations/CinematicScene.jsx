import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Compass, Shield, Snowflake } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGsapContext } from '../../hooks/useGsapContext';
import { CAMPAIGN_MEDIA } from '../../config/cloudinary';

gsap.registerPlugin(ScrollTrigger);

export const CinematicScene = () => {
  const containerRef = useRef(null);
  const pinWrapperRef = useRef(null);

  useGsapContext(
    ({ prefersReducedMotion }) => {
      // If mobile screen or reduced motion, skip complex pinning to ensure smooth, natural touch scrolling
      const isMobile = window.innerWidth < 1024;
      if (prefersReducedMotion || isMobile) return;

      const slides = gsap.utils.toArray('.story-slide');
      const texts = gsap.utils.toArray('.story-text');

      // Set initial states
      gsap.set(slides.slice(1), { opacity: 0, scale: 1.08 });
      gsap.set(texts.slice(1), { opacity: 0, y: 30 });

      // Build pinned scrub timeline
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: pinWrapperRef.current,
          start: 'top top',
          end: '+=160%',
          pin: true,
          scrub: 1,
          anticipatePin: 1,
        },
      });

      // Transition Scene 1 -> Scene 2
      tl.to(slides[0], { opacity: 0, scale: 1.05, duration: 1 })
        .to(texts[0], { opacity: 0, y: -25, duration: 0.8 }, '<')
        .to(slides[1], { opacity: 1, scale: 1, duration: 1 }, '<+=0.2')
        .to(texts[1], { opacity: 1, y: 0, duration: 0.8 }, '<+=0.2')

        // Transition Scene 2 -> Scene 3
        .to(slides[1], { opacity: 0, scale: 1.05, duration: 1 }, '+=0.5')
        .to(texts[1], { opacity: 0, y: -25, duration: 0.8 }, '<')
        .to(slides[2], { opacity: 1, scale: 1, duration: 1 }, '<+=0.2')
        .to(texts[2], { opacity: 1, y: 0, duration: 0.8 }, '<+=0.2');
    },
    containerRef
  );

  return (
    <section ref={containerRef} className="relative bg-charcoal text-snow overflow-hidden border-y border-white/5">
      {/* Desktop Pinned Interactive View */}
      <div ref={pinWrapperRef} className="hidden lg:block relative h-screen w-full overflow-hidden">
        {/* Layered Background Slides */}
        {CAMPAIGN_MEDIA.pinnedStory.map((scene, idx) => (
          <div
            key={scene.id}
            className="story-slide absolute inset-0 z-0 overflow-hidden"
          >
            <img
              src={scene.imageUrl}
              alt={scene.alt}
              className="w-full h-full object-cover object-center filter brightness-[0.4] contrast-105"
            />
            {/* Editorial Vignette Overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-charcoal via-transparent to-charcoal/80" />
            <div className="absolute inset-0 bg-gradient-to-r from-charcoal/90 via-transparent to-charcoal/60" />
          </div>
        ))}

        {/* Floating Story Content Panel */}
        <div className="relative z-10 h-full max-w-7xl mx-auto px-8 flex items-center">
          <div className="max-w-xl space-y-6">
            {/* Story 1 */}
            <div className="story-text space-y-4">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-panel text-[11px] uppercase tracking-widest text-ice font-bold">
                <Compass className="w-3.5 h-3.5" />
                <span>Phase 01 • Alpine Genesis</span>
              </span>
              <h2 className="font-editorial-serif text-5xl xl:text-6xl text-snow font-light leading-tight">
                Forged in <br />
                <span className="italic font-normal text-cream">Sub-Zero Squalls</span>
              </h2>
              <p className="text-sm text-silver leading-relaxed font-light">
                Every silhouette begins its journey confronting gale-force blizzards in the Lyngen ridge. Engineered to repel driving sleet and seal in critical core heat without excess bulk.
              </p>
              <div className="text-xs text-silver-dark font-mono pt-2">
                TEST SPEC: -30°C / 80 KM/H WIND LOAD
              </div>
            </div>

            {/* Story 2 */}
            <div className="story-text absolute top-1/2 -translate-y-1/2 space-y-4 pointer-events-none">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-panel text-[11px] uppercase tracking-widest text-cream font-bold">
                <Snowflake className="w-3.5 h-3.5" />
                <span>Phase 02 • Thermal Architecture</span>
              </span>
              <h2 className="font-editorial-serif text-5xl xl:text-6xl text-snow font-light leading-tight">
                850-Fill Power <br />
                <span className="italic font-normal text-cream">Certified European Down</span>
              </h2>
              <p className="text-sm text-silver leading-relaxed font-light">
                Encased inside proprietary water-resistant matte micro-ripstop. High-loft down clusters expand within welded internal baffles to create an impenetrable heat retaining envelope.
              </p>
              <div className="text-xs text-silver-dark font-mono pt-2">
                TRACEABILITY: RDS CERTIFIED ETHICAL HARVEST
              </div>
            </div>

            {/* Story 3 */}
            <div className="story-text absolute top-1/2 -translate-y-1/2 space-y-4">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-panel text-[11px] uppercase tracking-widest text-burgundy-light font-bold">
                <Shield className="w-3.5 h-3.5" />
                <span>Phase 03 • Sartorial Masterwork</span>
              </span>
              <h2 className="font-editorial-serif text-5xl xl:text-6xl text-snow font-light leading-tight">
                Piedmont Virgin Wool & <br />
                <span className="italic font-normal text-cream">Mongolian Cashmere</span>
              </h2>
              <p className="text-sm text-silver leading-relaxed font-light">
                Finished with bespoke interior stitching by historic mills in Biella. Enduring outerwear cut with mathematical proportion to drape effortlessly over evening tailoring.
              </p>
              <div className="pt-4 flex items-center gap-4">
                <Link
                  to="/shop"
                  className="inline-flex items-center gap-2 px-7 py-3.5 bg-cream hover:bg-snow text-charcoal font-bold text-xs uppercase tracking-widest rounded transition-all duration-300 shadow-xl"
                >
                  <span>Shop The Collection</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/about"
                  className="px-6 py-3.5 glass-panel text-snow hover:text-cream text-xs uppercase tracking-widest font-semibold rounded border border-white/10 transition-colors"
                >
                  Atelier Heritage
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Minimal Scroll Progress Track indicator */}
        <div className="absolute right-8 top-1/2 -translate-y-1/2 flex flex-col items-center gap-3 z-20">
          <span className="text-[10px] font-mono text-silver-dark">01</span>
          <div className="w-0.5 h-16 bg-white/10 rounded-full overflow-hidden">
            <div className="w-full bg-cream h-full transition-all duration-300" />
          </div>
          <span className="text-[10px] font-mono text-silver-dark">03</span>
        </div>
      </div>

      {/* Mobile & Touch Responsive Fallback Presentation */}
      <div className="lg:hidden py-16 px-4 sm:px-6 space-y-12">
        <div className="text-center space-y-2">
          <span className="text-xs uppercase tracking-editorial text-ice font-bold">
            The Craftsmanship Chronicle
          </span>
          <h2 className="font-editorial-serif text-3xl sm:text-4xl text-snow font-light">
            Architectural Poise in Severe Cold
          </h2>
        </div>

        <div className="space-y-8">
          {CAMPAIGN_MEDIA.pinnedStory.map((scene, idx) => (
            <div
              key={scene.id}
              className="glass-panel rounded-sm border border-white/5 overflow-hidden flex flex-col"
            >
              <div className="relative aspect-[16/10] w-full">
                <img
                  src={scene.imageUrl}
                  alt={scene.alt}
                  className="w-full h-full object-cover filter brightness-[0.7]"
                />
                <span className="absolute top-3 left-3 bg-charcoal/80 backdrop-blur-sm text-[10px] font-bold uppercase tracking-widest text-cream px-2 py-0.5 border border-white/10">
                  {scene.tag}
                </span>
              </div>
              <div className="p-6 space-y-2">
                <h3 className="font-editorial-serif text-2xl text-snow font-medium">
                  {scene.title}
                </h3>
                <p className="text-xs text-silver leading-relaxed font-light">
                  {scene.subtitle}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center pt-4">
          <Link
            to="/shop"
            className="inline-flex items-center gap-2 px-8 py-4 bg-cream text-charcoal font-bold text-xs uppercase tracking-widest rounded shadow-xl"
          >
            <span>Explore Outerwear Archive</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default CinematicScene;
