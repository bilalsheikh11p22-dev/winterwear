import React, { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownRight, Compass, Shield, ChevronDown, Volume2, VolumeX } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGsapContext } from '../../hooks/useGsapContext';
import { CAMPAIGN_MEDIA, getOptimizedMediaUrl } from '../../config/cloudinary';
import { bannerApi } from '../../services/api';

gsap.registerPlugin(ScrollTrigger);

const CinematicHero = () => {
  const heroRef = useRef(null);
  const mediaRef = useRef(null);
  const videoRef = useRef(null);
  const contentRef = useRef(null);
  const headlineRef = useRef(null);
  const subtextRef = useRef(null);
  const ctaGroupRef = useRef(null);
  const badgeRef = useRef(null);
  const scrollIndicatorRef = useRef(null);

  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [heroData, setHeroData] = useState({
    videoUrl: CAMPAIGN_MEDIA.hero.videoUrl,
    posterUrl: CAMPAIGN_MEDIA.hero.posterUrl,
    headline: 'Sculpted for the Cold. Tailored for Eternity.',
    subtext: 'Engineered for extreme sub-zero resilience with architectural goose down, virgin wool, and Italian cashmere. Handcrafted in limited editions.',
    ctaText: 'Explore Winter 2026',
    ctaLink: '/shop',
  });

  useEffect(() => {
    let isMounted = true;
    bannerApi
      .getPublicBanners({ placement: 'hero' })
      .then((res) => {
        if (!isMounted) return;
        const banner = res.data.data?.[0];
        if (banner) {
          const videoUrl = banner.backgroundVideo?.url || (banner.mediaType === 'video' ? banner.mediaUrl : null);
          const posterUrl =
            banner.backgroundVideo?.posterUrl ||
            banner.desktopMedia?.url ||
            banner.mediaUrl ||
            CAMPAIGN_MEDIA.hero.posterUrl;

          setHeroData((prev) => ({
            ...prev,
            videoUrl: videoUrl || prev.videoUrl,
            posterUrl: posterUrl || prev.posterUrl,
            headline: banner.headline || banner.title || prev.headline,
            subtext: banner.description || prev.subtext,
            ctaText: banner.ctaText || prev.ctaText,
            ctaLink: banner.ctaLink || prev.ctaLink,
          }));

          // Trigger ScrollTrigger recalculation
          setTimeout(() => {
            ScrollTrigger.refresh();
          }, 100);
        }
      })
      .catch(() => {
        // Retain verified fallback on any network standby
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useGsapContext(
    ({ prefersReducedMotion }) => {
      if (prefersReducedMotion) {
        gsap.set(
          [badgeRef.current, headlineRef.current, subtextRef.current, ctaGroupRef.current, scrollIndicatorRef.current],
          { opacity: 1, y: 0 }
        );
        return;
      }

      // Entrance animation timeline
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      tl.fromTo(
        badgeRef.current,
        { opacity: 0, y: -20, filter: 'blur(6px)' },
        { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.8, delay: 0.1 }
      )
        .fromTo(
          headlineRef.current?.querySelectorAll('.hero-word'),
          { opacity: 0, y: 40, rotateX: 12 },
          { opacity: 1, y: 0, rotateX: 0, stagger: 0.05, duration: 1.1 },
          '-=0.4'
        )
        .fromTo(
          subtextRef.current,
          { opacity: 0, y: 25 },
          { opacity: 1, y: 0, duration: 0.9 },
          '-=0.7'
        )
        .fromTo(
          ctaGroupRef.current?.children,
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, stagger: 0.15, duration: 0.8 },
          '-=0.6'
        )
        .fromTo(
          scrollIndicatorRef.current,
          { opacity: 0 },
          { opacity: 1, duration: 0.8 },
          '-=0.4'
        );

      // Background Video / Media Parallax scrub
      gsap.fromTo(
        mediaRef.current,
        { y: 0, scale: 1 },
        {
          y: 120,
          scale: 1.08,
          ease: 'none',
          scrollTrigger: {
            trigger: heroRef.current,
            start: 'top top',
            end: 'bottom top',
            scrub: 1,
          },
        }
      );

      // Continuous subtle bobbing for the scroll indicator
      gsap.to(scrollIndicatorRef.current?.querySelector('.scroll-chevron'), {
        y: 6,
        repeat: -1,
        yoyo: true,
        duration: 1.4,
        ease: 'power1.inOut',
      });
    },
    heroRef
  );

  const toggleSound = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const words = (heroData.headline || 'Sculpted for the Cold. Tailored for Eternity.').split(' ');

  return (
    <section
      ref={heroRef}
      className="relative min-h-[95vh] flex items-center justify-center overflow-hidden bg-charcoal"
    >
      {/* Background Media with Parallax Scrub */}
      <div
        ref={mediaRef}
        className="absolute inset-0 z-0 transform-gpu will-change-transform"
      >
        <video
          ref={videoRef}
          src={heroData.videoUrl}
          poster={heroData.posterUrl}
          autoPlay
          loop
          muted={isMuted}
          playsInline
          onLoadedData={() => setIsVideoLoaded(true)}
          className={`w-full h-full object-cover object-center filter brightness-[0.42] contrast-[1.08] transition-opacity duration-1000 ${
            isVideoLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Fallback poster while video loads or if autoplay fails */}
        <img
          src={heroData.posterUrl}
          alt={CAMPAIGN_MEDIA.hero.alt}
          className={`absolute inset-0 w-full h-full object-cover object-center filter brightness-[0.42] contrast-[1.08] transition-opacity duration-1000 ${
            isVideoLoaded ? 'opacity-0' : 'opacity-100'
          }`}
        />

        {/* Dark Vignette Gradients for High Text Legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal via-charcoal/40 to-charcoal/70" />
        <div className="absolute inset-0 bg-gradient-to-r from-charcoal/80 via-transparent to-charcoal/70" />
      </div>

      {/* Hero Sound Control Overlay */}
      <button
        onClick={toggleSound}
        className="absolute top-8 right-8 z-20 p-2.5 rounded-full glass-panel text-snow/80 hover:text-snow transition-all hover:scale-105 border border-white/10 hidden sm:flex items-center gap-2 text-xs"
        aria-label={isMuted ? 'Unmute hero campaign audio' : 'Mute hero campaign audio'}
      >
        {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
        <span className="text-[10px] tracking-wider uppercase font-mono">
          {isMuted ? 'Sound Off' : 'Sound On'}
        </span>
      </button>

      {/* Hero Content */}
      <div
        ref={contentRef}
        className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center py-24 sm:py-28"
      >
        {/* Edition Pill */}
        <div
          ref={badgeRef}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-panel border border-white/10 text-xs font-semibold uppercase tracking-widest text-ice mb-6"
        >
          <Compass className="w-3.5 h-3.5 text-ice animate-spin duration-3000" />
          <span>Autumn / Winter 2026 Archive</span>
        </div>

        {/* Editorial Headline with Word-by-Word Reveal */}
        <h1
          ref={headlineRef}
          className="font-editorial-serif text-4xl sm:text-6xl md:text-7xl lg:text-8xl text-snow font-light tracking-tight leading-[1.08] max-w-4xl perspective-1000"
        >
          {words.slice(0, Math.ceil(words.length / 2)).map((word, i) => (
            <span key={i} className="inline-block overflow-hidden mr-[0.25em]">
              <span className="hero-word inline-block transform-gpu will-change-transform">
                {word}
              </span>
            </span>
          ))}
          <br className="hidden sm:inline" />
          <span className="italic font-normal text-cream">
            {words.slice(Math.ceil(words.length / 2)).map((word, i) => (
              <span key={i} className="inline-block overflow-hidden mr-[0.25em]">
                <span className="hero-word inline-block transform-gpu will-change-transform">
                  {word}
                </span>
              </span>
            ))}
          </span>
        </h1>

        {/* Supporting Copy */}
        <p
          ref={subtextRef}
          className="mt-6 text-sm sm:text-base md:text-lg text-silver max-w-2xl font-light leading-relaxed tracking-wide"
        >
          {heroData.subtext}
        </p>

        {/* CTAs */}
        <div
          ref={ctaGroupRef}
          className="mt-10 flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto"
        >
          <Link
            to={heroData.ctaLink}
            className="w-full sm:w-auto px-8 py-4 bg-cream hover:bg-snow text-charcoal font-bold text-xs uppercase tracking-widest rounded transition-all duration-300 flex items-center justify-center gap-2 shadow-2xl hover:scale-105"
          >
            <span>{heroData.ctaText}</span>
            <ArrowDownRight className="w-4 h-4" />
          </Link>
          <Link
            to="/shop?filter=new"
            className="w-full sm:w-auto px-8 py-4 glass-panel hover:bg-white/10 text-snow font-semibold text-xs uppercase tracking-widest rounded border border-white/20 transition-all duration-300 flex items-center justify-center gap-2"
          >
            <span>Explore New Arrivals</span>
          </Link>
        </div>

        {/* Bottom Feature Badges */}
        <div className="mt-14 pt-8 border-t border-white/10 grid grid-cols-2 md:grid-cols-3 gap-6 text-left max-w-2xl w-full">
          <div className="flex items-center gap-3">
            <Shield className="w-4 h-4 text-cream shrink-0" />
            <div>
              <p className="text-[10px] uppercase tracking-wider text-silver">Insulation</p>
              <p className="text-xs font-semibold text-snow">850+ Fill Goose Down</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Shield className="w-4 h-4 text-ice shrink-0" />
            <div>
              <p className="text-[10px] uppercase tracking-wider text-silver">Weather Shield</p>
              <p className="text-xs font-semibold text-snow">Sub-Zero -30°C Proof</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <Shield className="w-4 h-4 text-burgundy-light shrink-0" />
            <div>
              <p className="text-[10px] uppercase tracking-wider text-silver">Sartorial Origin</p>
              <p className="text-xs font-semibold text-snow">Hand-Finished in Biella</p>
            </div>
          </div>
        </div>
      </div>

      {/* Small Animated Scroll Indicator */}
      <div
        ref={scrollIndicatorRef}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1.5 text-silver text-[10px] uppercase tracking-widest pointer-events-none"
      >
        <span>Discover Archive</span>
        <ChevronDown className="scroll-chevron w-4 h-4 text-cream" />
      </div>
    </section>
  );
};

export default CinematicHero;
