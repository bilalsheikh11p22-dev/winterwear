import React from 'react';
import { Star, CheckCircle, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

const REVIEWS_DATA = [
  {
    id: 'rev-1',
    author: 'Astrid Lindqvist',
    location: 'Stockholm, Sweden',
    product: 'Glacier Peak Down Parka',
    productSlug: 'glacier-peak-down-parka',
    rating: 5,
    title: 'Warmest coat I have owned in 10 years of Nordic winters.',
    comment: 'Wore this during a -22°C blizzard in northern Sweden. Kept completely warm with only a light cashmere knit underneath. The matte shell looks sleek and does not make swishing noises.',
    fit: 'True to Size',
    verified: true,
    date: 'February 2026',
  },
  {
    id: 'rev-2',
    author: 'Julian Vance',
    location: 'Zurich, Switzerland',
    product: 'Sartorial Double-Breasted Cashmere Overcoat',
    productSlug: 'sartorial-double-breasted-cashmere-overcoat',
    rating: 5,
    title: 'Exquisite drape and immaculate Biella wool hand-feel.',
    comment: 'The shoulder construction is on par with Savile Row bespoke overcoats. Incredibly warm without being unwieldy or boxy. Received countless compliments in Geneva.',
    fit: 'True to Size',
    verified: true,
    date: 'January 2026',
  },
  {
    id: 'rev-3',
    author: 'Camille Moreau',
    location: 'Montreal, Canada',
    product: 'Nordic Shearling B-3 Aviator Jacket',
    productSlug: 'nordic-shearling-b3-aviator-jacket',
    rating: 5,
    title: 'Heavyweight heritage masterwork.',
    comment: 'Substantial, dense Merino fleece and authentic leather aroma. The antiqued brass buckles are rock solid. Worth every cent for a piece that will last a lifetime.',
    fit: 'Runs Slightly Large (Room for Knits)',
    verified: true,
    date: 'December 2025',
  },
];

const TestimonialsSection = () => {
  return (
    <section className="py-24 bg-charcoal border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full glass-panel text-xs text-cream uppercase tracking-widest font-semibold mb-3">
            <ShieldCheck className="w-3.5 h-3.5 text-cream" />
            <span>Verified Customer Feedback</span>
          </div>
          <h2 className="font-editorial-serif text-3xl sm:text-5xl text-snow font-light">
            Patron Reflections
          </h2>
          <p className="text-silver text-xs sm:text-sm mt-3 leading-relaxed">
            Real feedback from discerning clients wearing WinterWear pieces through severe Arctic cold and metropolitan winters.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {REVIEWS_DATA.map((rev) => (
            <div
              key={rev.id}
              className="glass-panel p-8 rounded-sm border border-white/5 flex flex-col justify-between hover:border-white/20 transition-all duration-300"
            >
              <div>
                {/* Rating & Verified Badge */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-1">
                    {[...Array(rev.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  {rev.verified && (
                    <span className="flex items-center gap-1 text-[10px] text-cream font-semibold tracking-wider uppercase">
                      <CheckCircle className="w-3 h-3 text-cream" />
                      <span>Verified Order</span>
                    </span>
                  )}
                </div>

                <h3 className="font-editorial-serif text-lg text-snow font-medium mb-2">
                  "{rev.title}"
                </h3>
                <p className="text-xs text-silver leading-relaxed font-light">
                  {rev.comment}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-white/5">
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <strong className="text-snow block font-medium">{rev.author}</strong>
                    <span className="text-silver-dark text-[11px]">{rev.location}</span>
                  </div>
                  <span className="text-[10px] text-silver-dark">{rev.date}</span>
                </div>
                <div className="mt-3 flex items-center justify-between text-[11px]">
                  <Link
                    to={`/product/${rev.productSlug}`}
                    className="text-ice hover:text-white underline underline-offset-2 line-clamp-1"
                  >
                    {rev.product}
                  </Link>
                  <span className="text-cream text-[10px] shrink-0 ml-2">Fit: {rev.fit}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
