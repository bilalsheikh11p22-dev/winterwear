import React, { useRef, useEffect } from 'react';
import { ShieldCheck, Compass, Snowflake } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const EditorialStory = () => {
  const containerRef = useRef(null);
  const textColRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.story-reveal',
        { opacity: 0, y: 50 },
        {
          opacity: 1,
          y: 0,
          duration: 1.2,
          stagger: 0.2,
          scrollTrigger: {
            trigger: containerRef.current,
            start: 'top 75%',
            toggleActions: 'play none none none',
          },
        }
      );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={containerRef}
      className="py-28 bg-charcoal-dark border-y border-white/5 relative overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          {/* Images Grid */}
          <div className="lg:col-span-6 grid grid-cols-2 gap-4 relative">
            <div className="space-y-4">
              <div className="story-reveal overflow-hidden rounded-sm aspect-[3/4] border border-white/10">
                <img
                  src="https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=800&auto=format&fit=crop"
                  alt="Alpine expedition model in down parka"
                  className="w-full h-full object-cover object-center filter contrast-[1.05] hover:scale-105 transition-transform duration-700"
                />
              </div>
              <div className="story-reveal p-6 glass-panel rounded-sm border border-white/10">
                <Snowflake className="w-6 h-6 text-ice mb-3" />
                <h4 className="font-editorial-serif text-xl text-snow font-medium">RDS Goose Down</h4>
                <p className="text-xs text-silver mt-1 leading-relaxed">
                  Every gram of fill is traceable to ethical European farms, certified under the Responsible Down Standard.
                </p>
              </div>
            </div>

            <div className="space-y-4 pt-10">
              <div className="story-reveal p-6 glass-panel rounded-sm border border-white/10">
                <Compass className="w-6 h-6 text-cream mb-3" />
                <h4 className="font-editorial-serif text-xl text-snow font-medium">Bespoke Precision</h4>
                <p className="text-xs text-silver mt-1 leading-relaxed">
                  Tailored double-faced wool constructed with invisible interior seams and reinforced storm stress-points.
                </p>
              </div>
              <div className="story-reveal overflow-hidden rounded-sm aspect-[3/4] border border-white/10">
                <img
                  src="https://images.unsplash.com/photo-1508427953056-b00b8d78ebf5?q=80&w=800&auto=format&fit=crop"
                  alt="Sartorial wool texture and tailoring"
                  className="w-full h-full object-cover object-center filter contrast-[1.05] hover:scale-105 transition-transform duration-700"
                />
              </div>
            </div>
          </div>

          {/* Editorial Brand Narrative */}
          <div ref={textColRef} className="lg:col-span-6 space-y-6">
            <span className="story-reveal inline-block text-xs uppercase tracking-editorial text-ice font-bold">
              The Architecture of Warmth
            </span>
            <h2 className="story-reveal font-editorial-serif text-3xl sm:text-5xl lg:text-6xl text-snow font-light leading-[1.1]">
              Born in Sub-Zero Squalls. <br />
              <span className="italic text-cream">Refined for the World's Capitals.</span>
            </h2>
            <p className="story-reveal text-sm text-silver-light leading-relaxed font-light">
              WinterWear was conceived at the intersection of extreme alpine survival and uncompromising sartorial elegance. Traditional winter clothing often forces an impossible choice: technical utility without poise, or tailored luxury that surrenders in sub-zero blizzards.
            </p>
            <p className="story-reveal text-sm text-silver leading-relaxed font-light">
              We dismantle this compromise. By pairing historic Biella virgin wool mills with ultralight Japanese micro-ripstop, ultrasonic seam-welding, and 850-fill power down, our pieces safeguard you through gale-force freezing winds while maintaining clean, sculptural silhouette lines.
            </p>

            {/* Credibility badges */}
            <div className="story-reveal pt-4 border-t border-white/10 grid grid-cols-3 gap-4">
              <div>
                <span className="font-editorial-serif text-3xl font-light text-cream block">-30°C</span>
                <span className="text-[10px] uppercase tracking-wider text-silver">Tested Tolerance</span>
              </div>
              <div>
                <span className="font-editorial-serif text-3xl font-light text-ice block">850+</span>
                <span className="text-[10px] uppercase tracking-wider text-silver">Fill Power Down</span>
              </div>
              <div>
                <span className="font-editorial-serif text-3xl font-light text-burgundy-light block">100%</span>
                <span className="text-[10px] uppercase tracking-wider text-silver">Traceable Fiber</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default EditorialStory;
