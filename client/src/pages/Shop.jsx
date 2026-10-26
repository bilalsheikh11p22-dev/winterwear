import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import ProductCard from '../components/common/ProductCard';
import { useCatalog } from '../hooks/useCatalog';
import { CATEGORIES_DATA } from '../data/categoriesData';
import { SlidersHorizontal, X, RotateCcw, ChevronDown, Check } from 'lucide-react';

const Shop = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { products: catalog, loading: catalogLoading } = useCatalog();
  const maxCatalogPrice = useMemo(
    () => Math.max(800, ...catalog.map((p) => Math.ceil(p.salePrice ?? p.regularPrice ?? 0))),
    [catalog]
  );

  // URL query params
  const initialCategory = searchParams.get('category') || 'all';
  const initialCollection = searchParams.get('collection') || 'all';
  const initialFilter = searchParams.get('filter') || 'all';
  const initialSearch = searchParams.get('search') || '';

  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [selectedCollection, setSelectedCollection] = useState(initialCollection);
  const [selectedSize, setSelectedSize] = useState('all');
  const [selectedColor, setSelectedColor] = useState('all');
  const [priceRangeInput, setPriceRange] = useState(null);
  const priceRange = priceRangeInput ?? maxCatalogPrice;
  const [sortBy, setSortBy] = useState('newest');
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  useEffect(() => {
    if (searchParams.get('category')) setSelectedCategory(searchParams.get('category'));
    if (searchParams.get('collection')) setSelectedCollection(searchParams.get('collection'));
    if (searchParams.get('search')) setSearchQuery(searchParams.get('search'));
  }, [searchParams]);

  // Color options
  const colorOptions = [
    { name: 'Midnight Charcoal', hex: '#17191C' },
    { name: 'Warm Cream', hex: '#EDE7DC' },
    { name: 'Burgundy', hex: '#762B3D' },
    { name: 'Ice Blue', hex: '#C9DDE8' },
    { name: 'Silver Grey', hex: '#A9ADB3' },
  ];

  const sizeOptions = ['XS', 'S', 'M', 'L', 'XL', 'One Size'];

  // Filter & sort logic
  const filteredProducts = useMemo(() => {
    return catalog.filter((item) => {
      // Category match
      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }
      // Collection match
      if (selectedCollection !== 'all' && item.collection !== selectedCollection) {
        return false;
      }
      // Special filters (sale, new)
      if (initialFilter === 'sale' && !item.isOnSale) {
        return false;
      }
      if (initialFilter === 'new' && !item.isNewArrival) {
        return false;
      }
      // Size filter
      if (selectedSize !== 'all' && !(item.sizes || []).includes(selectedSize)) {
        return false;
      }
      // Color filter
      if (selectedColor !== 'all' && !(item.colors || []).some((c) => c.name.toLowerCase().includes(selectedColor.toLowerCase()))) {
        return false;
      }
      // Price range
      const effectivePrice = item.salePrice ?? item.regularPrice;
      if (effectivePrice > priceRange) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(query);
        const matchesCategory = (item.categoryName || '').toLowerCase().includes(query);
        const matchesDesc = (item.description || '').toLowerCase().includes(query);
        const matchesSku = (item.sku || '').toLowerCase().includes(query);
        if (!matchesName && !matchesCategory && !matchesDesc && !matchesSku) {
          return false;
        }
      }
      return true;
    }).sort((a, b) => {
      const priceA = a.salePrice ?? a.regularPrice;
      const priceB = b.salePrice ?? b.regularPrice;
      if (sortBy === 'price-low') return priceA - priceB;
      if (sortBy === 'price-high') return priceB - priceA;
      if (sortBy === 'rating') return b.averageRating - a.averageRating;
      if (sortBy === 'newest') return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      return 0;
    });
  }, [
    catalog,
    selectedCategory,
    selectedCollection,
    selectedSize,
    selectedColor,
    priceRange,
    sortBy,
    searchQuery,
    initialFilter,
  ]);

  const resetFilters = () => {
    setSelectedCategory('all');
    setSelectedCollection('all');
    setSelectedSize('all');
    setSelectedColor('all');
    setPriceRange(null);
    setSortBy('newest');
    setSearchQuery('');
    setSearchParams({});
  };

  return (
    <div className="min-h-screen bg-charcoal text-snow py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="border-b border-white/10 pb-8 mb-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <span className="text-xs uppercase tracking-editorial text-ice font-bold">
                Winterwear Archive
              </span>
              <h1 className="font-editorial-serif text-3xl sm:text-5xl text-snow font-light mt-1">
                All Outerwear & Silhouettes
              </h1>
              <p className="text-xs text-silver mt-2">
                Showing {filteredProducts.length} pieces curated for sub-zero alpine and metropolitan performance.
              </p>
            </div>

            {/* Mobile Filter Trigger & Sort Dropdown */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsMobileFilterOpen(!isMobileFilterOpen)}
                className="lg:hidden flex items-center gap-2 px-4 py-2.5 glass-panel rounded text-xs uppercase tracking-wider font-semibold"
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span>Filters</span>
              </button>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-silver hidden sm:inline">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-charcoal-surface border border-white/10 text-snow text-xs px-3 py-2.5 rounded focus:outline-none focus:border-cream/50 cursor-pointer"
                >
                  <option value="newest">Featured & Newest</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="rating">Highest Rated</option>
                </select>
              </div>
            </div>
          </div>

          {/* Active Filter Pills */}
          {(selectedCategory !== 'all' || selectedCollection !== 'all' || selectedSize !== 'all' || selectedColor !== 'all' || searchQuery) && (
            <div className="flex flex-wrap items-center gap-2 mt-6 pt-4 border-t border-white/5 text-xs">
              <span className="text-silver-dark text-[11px] uppercase tracking-wider">Active Filters:</span>
              {selectedCategory !== 'all' && (
                <span className="px-2.5 py-1 bg-charcoal-surface border border-white/10 rounded text-snow flex items-center gap-1.5">
                  Category: {selectedCategory}
                  <button onClick={() => setSelectedCategory('all')}><X className="w-3 h-3 hover:text-burgundy-light" /></button>
                </span>
              )}
              {selectedCollection !== 'all' && (
                <span className="px-2.5 py-1 bg-charcoal-surface border border-white/10 rounded text-snow flex items-center gap-1.5">
                  Collection: {selectedCollection}
                  <button onClick={() => setSelectedCollection('all')}><X className="w-3 h-3 hover:text-burgundy-light" /></button>
                </span>
              )}
              {selectedSize !== 'all' && (
                <span className="px-2.5 py-1 bg-charcoal-surface border border-white/10 rounded text-snow flex items-center gap-1.5">
                  Size: {selectedSize}
                  <button onClick={() => setSelectedSize('all')}><X className="w-3 h-3 hover:text-burgundy-light" /></button>
                </span>
              )}
              {searchQuery && (
                <span className="px-2.5 py-1 bg-charcoal-surface border border-white/10 rounded text-snow flex items-center gap-1.5">
                  Query: "{searchQuery}"
                  <button onClick={() => setSearchQuery('')}><X className="w-3 h-3 hover:text-burgundy-light" /></button>
                </span>
              )}
              <button
                onClick={resetFilters}
                className="text-[11px] text-silver hover:text-snow underline underline-offset-2 ml-2 flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset All</span>
              </button>
            </div>
          )}
        </div>

        {/* Content Layout: Sidebar + Product Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Desktop Filter Sidebar */}
          <aside className="hidden lg:block space-y-8 pr-6 border-r border-white/5 text-xs">
            {/* Category Filter */}
            <div>
              <h3 className="font-bold uppercase tracking-wider text-snow mb-3">Categories</h3>
              <ul className="space-y-1.5">
                <li>
                  <button
                    onClick={() => setSelectedCategory('all')}
                    className={`w-full text-left py-1 transition-colors ${
                      selectedCategory === 'all' ? 'text-cream font-bold' : 'text-silver hover:text-snow'
                    }`}
                  >
                    All Categories
                  </button>
                </li>
                {CATEGORIES_DATA.map((cat) => (
                  <li key={cat.id}>
                    <button
                      onClick={() => setSelectedCategory(cat.slug)}
                      className={`w-full text-left py-1 flex items-center justify-between transition-colors ${
                        selectedCategory === cat.slug ? 'text-cream font-bold' : 'text-silver hover:text-snow'
                      }`}
                    >
                      <span>{cat.name}</span>
                      <span className="text-[10px] text-silver-dark">{cat.itemCount}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Collection Filter */}
            <div className="pt-6 border-t border-white/5">
              <h3 className="font-bold uppercase tracking-wider text-snow mb-3">Collections</h3>
              <div className="space-y-1.5">
                {["all", "Men's Collection", "Women's Collection", "Unisex Collection", "Accessories"].map((coll) => (
                  <button
                    key={coll}
                    onClick={() => setSelectedCollection(coll)}
                    className={`block w-full text-left py-1 transition-colors ${
                      selectedCollection === coll ? 'text-cream font-bold' : 'text-silver hover:text-snow'
                    }`}
                  >
                    {coll === 'all' ? 'All Collections' : coll}
                  </button>
                ))}
              </div>
            </div>

            {/* Size Filter */}
            <div className="pt-6 border-t border-white/5">
              <h3 className="font-bold uppercase tracking-wider text-snow mb-3">Size</h3>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setSelectedSize('all')}
                  className={`py-1.5 text-center rounded border transition-colors ${
                    selectedSize === 'all'
                      ? 'border-cream bg-cream/10 text-cream font-bold'
                      : 'border-white/10 text-silver hover:border-white/30'
                  }`}
                >
                  All
                </button>
                {sizeOptions.map((size) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`py-1.5 text-center rounded border transition-colors ${
                      selectedSize === size
                        ? 'border-cream bg-cream/10 text-cream font-bold'
                        : 'border-white/10 text-silver hover:border-white/30'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Color Swatch Filter */}
            <div className="pt-6 border-t border-white/5">
              <h3 className="font-bold uppercase tracking-wider text-snow mb-3">Color</h3>
              <div className="flex flex-wrap gap-2.5">
                <button
                  onClick={() => setSelectedColor('all')}
                  className={`px-2.5 py-1 rounded text-[11px] border ${
                    selectedColor === 'all'
                      ? 'border-cream text-cream'
                      : 'border-white/10 text-silver hover:border-white/30'
                  }`}
                >
                  All
                </button>
                {colorOptions.map((c) => (
                  <button
                    key={c.name}
                    onClick={() => setSelectedColor(c.name)}
                    className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all ${
                      selectedColor === c.name ? 'border-cream scale-110' : 'border-white/20 hover:scale-105'
                    }`}
                    style={{ backgroundColor: c.hex }}
                    title={c.name}
                  >
                    {selectedColor === c.name && <Check className="w-3 h-3 text-white drop-shadow" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Price Range Slider */}
            <div className="pt-6 border-t border-white/5">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold uppercase tracking-wider text-snow">Max Price</h3>
                <span className="font-semibold text-cream">${priceRange}</span>
              </div>
              <input
                type="range"
                min="50"
                max={maxCatalogPrice}
                step={Math.max(5, Math.round(maxCatalogPrice / 40))}
                value={priceRange}
                onChange={(e) => setPriceRange(Number(e.target.value))}
                className="w-full accent-cream cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-silver-dark mt-1">
                <span>$50</span>
                <span>${maxCatalogPrice}</span>
              </div>
            </div>
          </aside>

          {/* Product Grid */}
          <main className="lg:col-span-3">
            {catalogLoading && catalog.length === 0 ? (
              <div className="py-20 text-center text-xs text-silver">Loading collection…</div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-20 glass-panel rounded p-8">
                <h3 className="font-editorial-serif text-2xl text-snow font-medium">No Pieces Match Your Criteria</h3>
                <p className="text-xs text-silver mt-2 max-w-sm mx-auto">
                  Try adjusting or resetting your category, size, or price filters to discover available atelier garments.
                </p>
                <button
                  onClick={resetFilters}
                  className="mt-6 px-6 py-2.5 bg-cream text-charcoal font-bold text-xs uppercase tracking-widest rounded hover:bg-white transition-colors"
                >
                  Clear All Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
                {filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default Shop;
