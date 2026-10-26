import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { CATEGORIES_DATA } from '../data/categoriesData';
import { useCatalog } from '../hooks/useCatalog';
import ProductCard from '../components/common/ProductCard';
import { ChevronRight, ArrowLeft } from 'lucide-react';

const CategoryPage = () => {
  const { slug } = useParams();

  const category = CATEGORIES_DATA.find((c) => c.slug === slug) || {
    name: 'Winter Collection',
    slug: slug || 'all',
    description: 'Curated cold-weather outerwear and architectural tailoring.',
    image: 'https://images.unsplash.com/photo-1544923246-77307dd654cb?q=80&w=1200&auto=format&fit=crop',
  };

  const { products: catalog } = useCatalog();
  const matchingProducts = catalog.filter(
    (p) => p.category === slug || slug === 'all'
  );

  return (
    <div className="min-h-screen bg-charcoal text-snow">
      {/* Category Editorial Hero Banner */}
      <div className="relative h-72 sm:h-96 w-full overflow-hidden flex items-end">
        <img
          src={category.image}
          alt={category.name}
          className="absolute inset-0 w-full h-full object-cover object-center filter brightness-[0.45]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal via-transparent to-black/60" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 w-full">
          <nav className="flex items-center space-x-2 text-xs text-silver mb-3">
            <Link to="/" className="hover:text-cream">Home</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link to="/shop" className="hover:text-cream">Outerwear</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-snow font-medium">{category.name}</span>
          </nav>

          <h1 className="font-editorial-serif text-3xl sm:text-5xl text-snow font-medium">
            {category.name}
          </h1>
          <p className="text-xs sm:text-sm text-silver-light mt-2 max-w-xl font-light">
            {category.description}
          </p>
        </div>
      </div>

      {/* Products Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-8 text-xs text-silver">
          <span>{matchingProducts.length} pieces available in this category</span>
          <Link to="/shop" className="hover:text-cream flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>View All Outerwear Categories</span>
          </Link>
        </div>

        {matchingProducts.length === 0 ? (
          <div className="text-center py-20 glass-panel rounded p-8">
            <h3 className="font-editorial-serif text-2xl text-snow font-medium">
              Pieces Currently In Crafting
            </h3>
            <p className="text-xs text-silver mt-2 max-w-sm mx-auto">
              Our atelier is actively tailoring new editions for {category.name}. Check back soon or explore our existing catalog.
            </p>
            <Link
              to="/shop"
              className="mt-6 inline-block px-6 py-2.5 bg-cream text-charcoal font-bold text-xs uppercase tracking-widest rounded"
            >
              Browse Full Catalog
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            {matchingProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CategoryPage;
