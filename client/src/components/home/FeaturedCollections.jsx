import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ProductCard from '../common/ProductCard';
import { PRODUCT_FIXTURES } from '../../data/productFixtures';
import { ArrowRight, Flame, Sparkles, Tag, Layers, Loader2 } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGsapContext } from '../../hooks/useGsapContext';
import { productApi } from '../../services/api';

gsap.registerPlugin(ScrollTrigger);

const uniqueBy = (arr, keyFn) => {
  const seen = new Set();
  return arr.filter((item) => {
    const key = keyFn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

// Normalise backend product shape → ProductCard expected shape
const mapProduct = (p) => ({
  id: p._id || p.id,
  slug: p.slug,
  name: p.name,
  brand: p.brand || 'WinterWear',
  category: p.category?.slug || p.category,
  regularPrice: p.regularPrice || p.price,
  salePrice: p.salePrice || null,
  isOnSale: !!p.salePrice,
  isNewArrival: p.isNewArrival,
  isBestSeller: p.isBestSeller,
  isFeatured: p.isFeatured,
  images: p.images?.length ? p.images : [{ url: p.image || '' }],
  rating: p.rating || p.averageRating || 0,
  reviewCount: p.reviewCount || 0,
  colors: uniqueBy(p.variants?.map((v) => v.color).filter(Boolean) || [], (c) => c.name),
  sizes: [...new Set((p.variants || []).filter((v) => v.stock == null || v.stock > 0).map((v) => v.size).filter(Boolean))],
  stockQuantity: p.stockQuantity,
  lowStockThreshold: p.lowStockThreshold,
  categoryName: p.category?.name,
  averageRating: p.averageRating || 0,
});

// Map each tab → query params sent to GET /api/v1/products
const TAB_PARAMS = {
  all:         { limit: 12 },
  new:         { isNewArrival: true, limit: 12 },
  bestseller:  { isBestSeller: true, limit: 12 },
  jackets:     { categories: 'puffer-jackets,wool-coats,winter-jackets', limit: 12 },
  accessories: { categories: 'mufflers-scarves,beanies-caps', limit: 12 },
  sale:        { isOnSale: true, limit: 12 },
};

// Local fallback filter on fixture data (used when API is unavailable)
const filterFixtures = (tab) => {
  switch (tab) {
    case 'new':         return PRODUCT_FIXTURES.filter((p) => p.isNewArrival);
    case 'bestseller':  return PRODUCT_FIXTURES.filter((p) => p.isBestSeller);
    case 'sale':        return PRODUCT_FIXTURES.filter((p) => p.isOnSale);
    case 'jackets':     return PRODUCT_FIXTURES.filter(
                          (p) => ['puffer-jackets','wool-coats','winter-jackets'].includes(p.category)
                        );
    case 'accessories': return PRODUCT_FIXTURES.filter(
                          (p) => ['mufflers-scarves','beanies-caps'].includes(p.category)
                        );
    default:            return PRODUCT_FIXTURES;
  }
};

const FeaturedCollections = () => {
  const [activeTab, setActiveTab] = useState('all');
  const sectionRef = useRef(null);
  const gridRef = useRef(null);
  const [products, setProducts] = useState(PRODUCT_FIXTURES);
  const [loading, setLoading] = useState(false);

  // Fetch from backend when tab changes; fall back to fixture data silently
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    productApi
      .getProducts(TAB_PARAMS[activeTab] || { limit: 12 })
      .then((res) => {
        if (cancelled) return;
        const items = res.data?.data?.products || res.data?.data || [];
        if (Array.isArray(items) && items.length > 0) {
          setProducts(items.map(mapProduct));
        } else {
          setProducts(filterFixtures(activeTab));
        }
      })
      .catch(() => {
        if (!cancelled) setProducts(filterFixtures(activeTab));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [activeTab]);

  // Re-run GSAP animations whenever the products list or active tab changes
  useGsapContext(
    ({ prefersReducedMotion }) => {
      if (!gridRef.current) return;
      const cards = gridRef.current.children;

      if (prefersReducedMotion) {
        gsap.set(cards, { opacity: 1, y: 0 });
        return;
      }

      gsap.fromTo(
        cards,
        { opacity: 0, y: 35 },
        {
          opacity: 1,
          y: 0,
          stagger: 0.08,
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: gridRef.current,
            start: 'top 85%',
            toggleActions: 'play none none none',
          },
        }
      );
    },
    sectionRef,
    [products]
  );

  return (
    <section ref={sectionRef} className="py-24 bg-charcoal">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header with Tabs */}
        <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-white/10 pb-8 mb-12">
          <div>
            <span className="text-xs uppercase tracking-editorial text-ice font-bold">
              Winterwear Atelier Archive
            </span>
            <h2 className="font-editorial-serif text-3xl sm:text-5xl text-snow font-light mt-2">
              Signature Creations
            </h2>
          </div>

          {/* Filter Tabs */}
          <div className="flex flex-wrap items-center gap-2 mt-6 md:mt-0">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 text-xs uppercase tracking-wider font-semibold rounded-full transition-all ${
                activeTab === 'all'
                  ? 'bg-cream text-charcoal shadow-md'
                  : 'text-silver hover:text-snow bg-charcoal-surface'
              }`}
            >
              All Pieces
            </button>
            <button
              onClick={() => setActiveTab('new')}
              className={`px-4 py-2 text-xs uppercase tracking-wider font-semibold rounded-full transition-all flex items-center gap-1.5 ${
                activeTab === 'new'
                  ? 'bg-ice text-charcoal shadow-md'
                  : 'text-silver hover:text-snow bg-charcoal-surface'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>New Arrivals</span>
            </button>
            <button
              onClick={() => setActiveTab('bestseller')}
              className={`px-4 py-2 text-xs uppercase tracking-wider font-semibold rounded-full transition-all flex items-center gap-1.5 ${
                activeTab === 'bestseller'
                  ? 'bg-cream text-charcoal shadow-md'
                  : 'text-silver hover:text-snow bg-charcoal-surface'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Best Sellers</span>
            </button>
            <button
              onClick={() => setActiveTab('jackets')}
              className={`px-4 py-2 text-xs uppercase tracking-wider font-semibold rounded-full transition-all flex items-center gap-1.5 ${
                activeTab === 'jackets'
                  ? 'bg-cream text-charcoal shadow-md'
                  : 'text-silver hover:text-snow bg-charcoal-surface'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Jackets &amp; Coats</span>
            </button>
            <button
              onClick={() => setActiveTab('sale')}
              className={`px-4 py-2 text-xs uppercase tracking-wider font-bold rounded-full transition-all flex items-center gap-1.5 ${
                activeTab === 'sale'
                  ? 'bg-burgundy text-snow shadow-md'
                  : 'text-burgundy-light hover:text-burgundy bg-charcoal-surface'
              }`}
            >
              <Tag className="w-3.5 h-3.5" />
              <span>Private Sale</span>
            </button>
          </div>
        </div>

        {/* Loading skeleton */}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-8">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="rounded-sm bg-white/5 animate-pulse"
                style={{ height: 380 }}
              />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-60 gap-3 text-silver">
            <Loader2 className="w-8 h-8 opacity-30" />
            <p className="text-sm">No products found for this filter.</p>
          </div>
        ) : (
          /* Responsive Product Grid */
          <div ref={gridRef} className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-8">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}

        {/* Footer View All Link */}
        <div className="mt-16 text-center">
          <Link
            to="/shop"
            className="inline-flex items-center gap-3 px-8 py-3.5 border border-white/20 hover:border-cream text-snow hover:text-cream text-xs uppercase tracking-widest font-semibold rounded transition-all duration-300 group hover:scale-105"
          >
            <span>Explore Entire 2026 Outerwear Catalog</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default FeaturedCollections;
