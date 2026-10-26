import React, { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGsapContext } from '../../hooks/useGsapContext';
import { bannerApi } from '../../services/api';

gsap.registerPlugin(ScrollTrigger);

const FALLBACK_CAMPAIGNS = [
  {
    id: 'camp-1',
    title: 'The Alpine Summit Capsule',
    subtitle: 'High-Altitude 850 Down & Micro-Ripstop',
    link: '/shop?category=puffer-jackets',
    image: 'https://images.unsplash.com/photo-1544923246-77307dd654cb?q=80&w=1000&auto=format&fit=crop',
    tag: 'Extreme Cold Edition',
  },
  {
    id: 'camp-2',
    title: 'The Sartorial Metropole',
    subtitle: 'Italian Double-Faced Cashmere Overcoats',
    link: '/shop?category=wool-coats',
    image: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=1000&auto=format&fit=crop',
    tag: 'Biella Mill Weaves',
  },
  {
    id: 'camp-3',
    title: 'Nordic Shearling Archive',
    subtitle: 'Merino Sheepskin & Rugged Leather Bomber Silhouettes',
    link: '/shop?category=leather-jackets',
    image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?q=80&w=1000&auto=format&fit=crop',
    tag: 'Limited Handcraft',
  },
];

const CampaignBanners = () => {
  const containerRef = useRef(null);
  const [campaigns, setCampaigns] = useState(FALLBACK_CAMPAIGNS);

  useEffect(() => {
    let isMounted = true;
    bannerApi
      .getPublicBanners({ placement: 'seasonal_sale' })
      .then((res) => {
        if (!isMounted) return;
        const banners = res.data.data;
        if (banners && banners.length > 0) {
          const mapped = banners.slice(0, 3).map((b, idx) => ({
            id: b._id || `banner-${idx}`,
            title: b.headline || b.title,
            subtitle: b.description || 'Exclusive Winterwear Capsule',
            link: b.ctaLink || '/shop',
            image: b.desktopMedia?.url || b.mediaUrl || FALLBACK_CAMPAIGNS[idx % 3].image,
            tag: b.placement?.replace('_', ' ').toUpperCase() || 'Seasonal Edition',
          }));
          setCampaigns(mapped);
          setTimeout(() => {
            ScrollTrigger.refresh();
          }, 150);
        }
      })
      .catch(() => {
        // Fallback maintained
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useGsapContext(
    ({ prefersReducedMotion }) => {
      if (!containerRef.current) return;
      const cards = containerRef.current.querySelectorAll('.campaign-card');

      if (prefersReducedMotion) {
        gsap.set(cards, { opacity: 1, y: 0, clipPath: 'none' });
        return;
      }

      gsap.fromTo(
        cards,
        {
          opacity: 0,
          y: 40,
          clipPath: 'polygon(0 100%, 100% 100%, 100% 100%, 0% 100%)',
        },
        {
          opacity: 1,
          y: 0,
          clipPath: 'polygon(0 0%, 100% 0%, 100% 100%, 0% 100%)',
          stagger: 0.18,
          duration: 1.2,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: containerRef.current,
            start: 'top 80%',
            toggleActions: 'play none none none',
          },
        }
      );
    },
    containerRef,
    [campaigns]
  );

  return (
    <section ref={containerRef} className="py-24 bg-charcoal border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
          <div>
            <span className="text-xs uppercase tracking-editorial text-ice font-bold">
              Winter 2026 Capsules
            </span>
            <h2 className="font-editorial-serif text-3xl sm:text-5xl text-snow font-light mt-2">
              Curated Seasonal Editions
            </h2>
          </div>
          <p className="text-silver text-xs max-w-sm mt-4 md:mt-0 leading-relaxed">
            Distinct design directions tailored for different cold environments—from icy city avenues to jagged sub-zero mountain peaks.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {campaigns.map((camp) => (
            <Link
              key={camp.id}
              to={camp.link}
              className="campaign-card group relative h-[480px] overflow-hidden rounded-sm flex flex-col justify-end p-8 border border-white/5"
            >
              {/* Background Image */}
              <div className="absolute inset-0 z-0 overflow-hidden">
                <img
                  src={camp.image}
                  alt={camp.title}
                  loading="lazy"
                  className="w-full h-full object-cover object-center transition-transform duration-1000 ease-out group-hover:scale-110 filter brightness-[0.55] group-hover:brightness-[0.68]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-charcoal-dark via-charcoal-dark/40 to-transparent" />
              </div>

              {/* Foreground content */}
              <div className="relative z-10 space-y-2">
                <span className="inline-block text-[10px] font-bold uppercase tracking-widest text-cream px-2 py-0.5 bg-black/40 backdrop-blur-sm border border-white/10 rounded-sm">
                  {camp.tag}
                </span>
                <h3 className="font-editorial-serif text-2xl text-snow font-medium group-hover:text-cream transition-colors">
                  {camp.title}
                </h3>
                <p className="text-xs text-silver-light font-light">{camp.subtitle}</p>
                <div className="pt-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ice group-hover:text-snow transition-colors">
                  <span>Explore Capsule</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1.5 transition-transform" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CampaignBanners;
