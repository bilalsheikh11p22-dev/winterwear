import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { useCatalog } from '../../hooks/useCatalog';
import { ArrowRight, Eye, ShoppingBag, Star, Sparkles } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGsapContext } from '../../hooks/useGsapContext';

gsap.registerPlugin(ScrollTrigger);

export const HorizontalProductGallery = () => {
  const containerRef = useRef(null);
  const trackRef = useRef(null);
  const { addToCart } = useCart();

  // Selected winter collection pieces (puffer, wool coat, shearling, knitwear, muffler)
  const { products: catalogProducts } = useCatalog();
  const curatedItems = catalogProducts.slice(0, 6);

  useGsapContext(
    ({ prefersReducedMotion }) => {
      const isDesktop = window.innerWidth >= 1024;
      if (!isDesktop || prefersReducedMotion || !trackRef.current || !containerRef.current) return;

      const track = trackRef.current;
      // Calculate total horizontal scroll distance
      const scrollDistance = track.scrollWidth - window.innerWidth + 120;

      if (scrollDistance <= 0) return;

      gsap.to(track, {
        x: -scrollDistance,
        ease: 'none',
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top top',
          end: () => `+=${scrollDistance}`,
          pin: true,
          scrub: 1,
          invalidateOnRefresh: true,
        },
      });
    },
    containerRef,
    [curatedItems.length]
  );

  return (
    <section
      ref={containerRef}
      className="relative bg-charcoal-dark border-b border-white/5 overflow-hidden"
    >
      {/* Section Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-editorial text-ice font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Selected Runway Archive</span>
          </span>
          <h2 className="font-editorial-serif text-3xl sm:text-5xl text-snow font-light mt-2">
            The Winter Gallery
          </h2>
          <p className="text-xs text-silver mt-1 max-w-md">
            Architectural outerwear silhouettes designed to conquer high-altitude blizzards and city streets.
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs text-silver">
          <span className="hidden lg:inline text-[11px] font-mono tracking-wider uppercase">
            Scroll to Navigate Showcase →
          </span>
          <Link
            to="/shop"
            className="text-cream hover:text-white flex items-center gap-1 font-semibold underline underline-offset-4"
          >
            <span>View All Outerwear</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Horizontal Strip (Scrubbed on desktop, Native Touch-Swipe on mobile) */}
      <div className="w-full pb-20 pt-4 overflow-x-auto lg:overflow-visible no-scrollbar">
        <div
          ref={trackRef}
          className="flex gap-6 px-4 sm:px-6 lg:px-12 w-max items-stretch"
        >
          {curatedItems.map((product, idx) => (
            <div
              key={product.id}
              className="w-[280px] sm:w-[320px] lg:w-[360px] flex-shrink-0 glass-panel rounded-sm border border-white/5 flex flex-col justify-between group overflow-hidden transition-all duration-300 hover:border-white/20"
            >
              {/* Image Container */}
              <div className="relative aspect-[3/4] w-full overflow-hidden bg-charcoal">
                <img
                  src={product.images[0]?.url}
                  alt={product.name}
                  loading="lazy"
                  className="w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
                />

                {/* Badges */}
                <div className="absolute top-3 left-3 flex flex-col gap-1 items-start">
                  {product.isOnSale && (
                    <span className="bg-burgundy text-snow text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 shadow-md">
                      Sale
                    </span>
                  )}
                  {product.isNewArrival && (
                    <span className="bg-ice text-charcoal-dark text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 shadow-md">
                      New
                    </span>
                  )}
                </div>

                <div className="absolute top-3 right-3 text-[11px] font-mono text-silver bg-black/50 backdrop-blur-sm px-2 py-0.5 rounded border border-white/10">
                  0{idx + 1}
                </div>

                {/* Hover Quick Action */}
                <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-charcoal via-charcoal/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-between gap-2">
                  <button
                    onClick={() => addToCart(product, product.sizes[0], product.colors[0], 1)}
                    className="flex-1 py-2 bg-cream hover:bg-snow text-charcoal text-[11px] font-bold uppercase tracking-wider rounded-sm transition-colors flex items-center justify-center gap-1.5"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>Quick Bag</span>
                  </button>
                  <Link
                    to={`/product/${product.slug}`}
                    className="p-2 bg-charcoal-light hover:bg-white/20 text-snow rounded-sm transition-colors"
                    title="View Product"
                  >
                    <Eye className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              {/* Product Info */}
              <div className="p-5 flex flex-col justify-between flex-1">
                <div>
                  <div className="flex items-center justify-between text-[11px] text-silver mb-1">
                    <span className="uppercase tracking-widest">{product.categoryName}</span>
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span className="font-semibold text-snow">{product.averageRating}</span>
                    </div>
                  </div>

                  <Link
                    to={`/product/${product.slug}`}
                    className="font-editorial-serif text-lg text-snow font-medium hover:text-cream transition-colors line-clamp-1 block"
                  >
                    {product.name}
                  </Link>

                  <p className="text-xs text-silver-dark line-clamp-2 mt-1 font-light">
                    {product.shortDescription}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                  <div className="flex items-baseline gap-2">
                    {product.salePrice ? (
                      <>
                        <span className="text-base font-bold text-burgundy-light font-sans">
                          ${product.salePrice}
                        </span>
                        <span className="text-xs text-silver-dark line-through font-sans">
                          ${product.regularPrice}
                        </span>
                      </>
                    ) : (
                      <span className="text-base font-semibold text-snow font-sans">
                        ${product.regularPrice}
                      </span>
                    )}
                  </div>

                  <span className="text-[10px] text-silver-dark font-mono uppercase">
                    Sizes: {product.sizes.join(', ')}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HorizontalProductGallery;
