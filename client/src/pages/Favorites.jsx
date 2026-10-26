import React from 'react';
import { Link } from 'react-router-dom';
import { useWishlist } from '../context/WishlistContext';
import ProductCard from '../components/common/ProductCard';
import { Heart, Trash2, ArrowRight } from 'lucide-react';

const Favorites = () => {
  const { wishlist, clearWishlist } = useWishlist();

  return (
    <div className="min-h-screen bg-charcoal text-snow py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b border-white/10 pb-6 mb-10 gap-4">
          <div>
            <span className="text-xs uppercase tracking-editorial text-ice font-bold">
              Personal Archive
            </span>
            <h1 className="font-editorial-serif text-3xl sm:text-5xl text-snow font-light mt-1">
              Saved Pieces
            </h1>
            <p className="text-xs text-silver mt-1">
              {wishlist.length} {wishlist.length === 1 ? 'piece' : 'pieces'} bookmarked in your personal collection.
            </p>
          </div>

          {wishlist.length > 0 && (
            <button
              onClick={clearWishlist}
              className="flex items-center gap-1.5 text-xs text-silver-dark hover:text-burgundy-light transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Wishlist</span>
            </button>
          )}
        </div>

        {wishlist.length === 0 ? (
          <div className="text-center py-24 glass-panel rounded max-w-lg mx-auto p-8">
            <Heart className="w-12 h-12 text-silver-dark mx-auto mb-4 stroke-1" />
            <h3 className="font-editorial-serif text-2xl text-snow font-medium">Your Wishlist is Empty</h3>
            <p className="text-xs text-silver mt-2 leading-relaxed">
              Explore our outerwear collection and click the heart icon to curate your personal archive of winter essentials.
            </p>
            <Link
              to="/shop"
              className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-cream hover:bg-snow text-charcoal font-bold text-xs uppercase tracking-widest rounded transition-all duration-300 shadow-md"
            >
              <span>Explore Collection</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            {wishlist.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Favorites;
