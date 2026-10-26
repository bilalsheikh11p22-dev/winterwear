import React from 'react';
import { ShieldCheck, Award, Leaf, Compass } from 'lucide-react';

const About = () => {
  return (
    <div className="min-h-screen bg-charcoal text-snow py-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <span className="text-xs uppercase tracking-editorial text-ice font-bold">
            The Winterwear Heritage
          </span>
          <h1 className="font-editorial-serif text-4xl sm:text-6xl text-snow font-light">
            Architectural Poise. <br />
            <span className="italic text-cream">Sub-Zero Engineering.</span>
          </h1>
          <p className="text-sm sm:text-base text-silver leading-relaxed font-light pt-2">
            Founded with a singular commitment: to construct cold-weather garments of uncompromising luxury that triumph in the planet's harshest winter climates.
          </p>
        </div>

        {/* Hero Photo */}
        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-sm border border-white/10">
          <img
            src="https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=1600&auto=format&fit=crop"
            alt="Winterwear tailoring craftsmanship"
            className="w-full h-full object-cover object-center filter brightness-75 contrast-105"
          />
        </div>

        {/* Core Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8">
          <div className="glass-panel p-8 rounded-sm border border-white/5 space-y-3">
            <Award className="w-6 h-6 text-cream" />
            <h3 className="font-editorial-serif text-xl text-snow font-medium">Biella Wool & Cashmere</h3>
            <p className="text-xs text-silver leading-relaxed">
              We partner exclusively with multi-generational Italian mills in Piedmont, sourcing virgin wools spun with Mongolian grade-A cashmere fibers.
            </p>
          </div>
          <div className="glass-panel p-8 rounded-sm border border-white/5 space-y-3">
            <ShieldCheck className="w-6 h-6 text-ice" />
            <h3 className="font-editorial-serif text-xl text-snow font-medium">850-Fill Power Goose Down</h3>
            <p className="text-xs text-silver leading-relaxed">
              Certified under the Responsible Down Standard (RDS), ensuring ethical waterfowl treatment, exceptional thermal loft, and maximum warmth-to-weight ratio.
            </p>
          </div>
          <div className="glass-panel p-8 rounded-sm border border-white/5 space-y-3">
            <Leaf className="w-6 h-6 text-burgundy-light" />
            <h3 className="font-editorial-serif text-xl text-snow font-medium">Circular Longevity</h3>
            <p className="text-xs text-silver leading-relaxed">
              Fast fashion has no place in severe winters. Every seam is engineered for decades of wear, backed by our lifetime repair commitment.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;
