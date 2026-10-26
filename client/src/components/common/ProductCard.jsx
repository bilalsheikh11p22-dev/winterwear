import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Eye, ShoppingBag, Star, Check } from 'lucide-react';
import { useWishlist } from '../../context/WishlistContext';
import { useCart } from '../../context/CartContext';

const ProductCard = ({ product }) => {
// Safely normalize product data
const variants = Array.isArray(product?.variants) ? product.variants : [];
const colors = Array.isArray(product?.colors) && product.colors.length
? product.colors
: variants.map((v) => v.color).filter((c, i, arr) => c && arr.findIndex((x) => x?.name === c.name) === i);
const images = Array.isArray(product?.images) ? product.images : [];
const sizes = Array.isArray(product?.sizes) && product.sizes.length
? product.sizes
: [...new Set(variants.filter((v) => v.stock == null || v.stock > 0).map((v) => v.size).filter(Boolean))];

const [selectedColor, setSelectedColor] = useState(
colors[0] || null
);
const [isHovered, setIsHovered] = useState(false);
const [justAdded, setJustAdded] = useState(false);
const [justLiked, setJustLiked] = useState(false);

const { toggleWishlist, isInWishlist } = useWishlist();
const { addToCart } = useCart();

// Protect against missing product data
if (!product || typeof product !== 'object') {
return null;
}

const productId = product.id || product._id;
const productSlug = product.slug || productId;
const productName = product.name || 'Unnamed Product';

const isFavorited = isInWishlist(productId);

const primaryImage =
images[0]?.url ||
(typeof images[0] === 'string' ? images[0] : null) ||
'/images/placeholder-product.jpg';

const secondaryImage =
images[1]?.url ||
(typeof images[1] === 'string' ? images[1] : null) ||
primaryImage;

const handleQuickAdd = (e) => {
e.preventDefault();
e.stopPropagation();

if (!sizes.length) {
  console.warn(
    'Cannot quick-add: product has no available sizes.',
    product
  );
  return;
}

if (!selectedColor && colors.length > 0) {
  setSelectedColor(colors[0]);
  return;
}

addToCart(product, sizes[0], selectedColor, 1);
setJustAdded(true);

setTimeout(() => {
  setJustAdded(false);
}, 2000);

};

const handleFavoriteClick = (e) => {
e.preventDefault();
e.stopPropagation();

toggleWishlist(product);
setJustLiked(true);

setTimeout(() => {
  setJustLiked(false);
}, 800);

};

return (
<div
className="group relative flex flex-col transition-all duration-300"
onMouseEnter={() => setIsHovered(true)}
onMouseLeave={() => setIsHovered(false)}
>

<div className="relative aspect-[3/4] w-full overflow-hidden bg-charcoal-surface rounded-sm">
{/* Product Badges */}
<div className="absolute top-2 left-2 sm:top-3 sm:left-3 z-10 flex flex-col gap-1.5 items-start">
{product.isOnSale && (
<span className="bg-burgundy text-snow text-[10px] font-bold uppercase tracking-wider sm:tracking-widest px-1.5 sm:px-2.5 py-0.5 shadow-md animate-fade-in">
Sale
</span>
)}

      {product.isNewArrival && (
        <span className="bg-ice text-charcoal-dark text-[10px] font-bold uppercase tracking-wider sm:tracking-widest px-1.5 sm:px-2.5 py-0.5 shadow-md animate-fade-in">
          New
        </span>
      )}

      {product.isBestSeller && !product.isOnSale && (
        <span className="bg-cream text-charcoal text-[10px] font-bold uppercase tracking-wider sm:tracking-widest px-1.5 sm:px-2.5 py-0.5 shadow-md animate-fade-in">
          Signature
        </span>
      )}

      {Number.isFinite(Number(product.stockQuantity)) &&
        Number(product.stockQuantity) > 0 &&
        Number(product.stockQuantity) <=
          Number(product.lowStockThreshold ?? 5) && (
          <span className="bg-charcoal/90 text-amber-300 text-[9px] uppercase tracking-wider px-2 py-0.5 border border-amber-300/30">
            Only {product.stockQuantity} left
          </span>
        )}
    </div>

    {/* Wishlist Button */}
    <button
      type="button"
      onClick={handleFavoriteClick}
      className={`absolute top-2 right-2 sm:top-3 sm:right-3 z-10 p-1.5 sm:p-2 rounded-full glass-panel text-snow hover:text-burgundy transition-all duration-300 active:scale-90 ${
        justLiked
          ? 'scale-125 ring-2 ring-burgundy/50'
          : 'hover:scale-110'
      }`}
      aria-label={
        isFavorited ? 'Remove from wishlist' : 'Add to wishlist'
      }
    >
      <Heart
        className={`w-4 h-4 transition-all duration-300 ${
          isFavorited
            ? 'fill-burgundy text-burgundy'
            : 'text-snow'
        }`}
      />
    </button>

    {/* Product Images */}
    <Link
      to={`/product/${productSlug}`}
      className="block h-full w-full"
    >
      <img
        src={isHovered ? secondaryImage : primaryImage}
        alt={productName}
        loading="lazy"
        onError={(e) => {
          e.currentTarget.onerror = null;
          e.currentTarget.src = '/images/placeholder-product.jpg';
        }}
        className="h-full w-full object-cover object-center transition-all duration-700 ease-out group-hover:scale-105"
      />
    </Link>

   
    <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-charcoal-dark via-charcoal-dark/70 to-transparent opacity-0 translate-y-3 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 flex items-center justify-between gap-2">
      <button
        type="button"
        onClick={handleQuickAdd}
        disabled={justAdded || sizes.length === 0}
        title={
          sizes.length === 0
            ? 'No sizes available'
            : 'Add product to bag'
        }
        className={`flex-1 py-2 text-[11px] font-bold uppercase tracking-wider rounded-sm transition-all duration-300 flex items-center justify-center gap-1.5 shadow-lg active:scale-95 ${
          justAdded
            ? 'bg-burgundy text-white'
            : 'bg-snow hover:bg-cream text-charcoal'
        } disabled:opacity-60 disabled:cursor-not-allowed`}
      >
        {justAdded ? (
          <>
            <Check className="w-3.5 h-3.5" />
            <span>Added to Bag</span>
          </>
        ) : (
          <>
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>
              {sizes.length > 0
                ? `Quick Bag (${sizes[0]})`
                : 'Unavailable'}
            </span>
          </>
        )}
      </button>

      <Link
        to={`/product/${productSlug}`}
        className="p-2 bg-charcoal-light hover:bg-white/20 text-snow rounded-sm transition-colors active:scale-95"
        title="View Details"
        aria-label={`View ${productName} details`}
      >
        <Eye className="w-4 h-4" />
      </Link>
    </div>
  </div>

  <div className="mt-2 sm:mt-3 flex flex-col flex-1">
    {/* Category and Rating */}
    <div className="flex items-center justify-between gap-1 text-[11px] text-silver mb-1">
      <span className="uppercase tracking-wider sm:tracking-widest text-[9px] sm:text-[10px] truncate min-w-0">
        {product.categoryName || 'Winterwear'}
      </span>

      <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />

        <span className="font-medium text-snow/90">
          {Number(product.averageRating ?? 0).toFixed(1)}
        </span>

        <span className="text-silver-dark text-[10px]">
          ({product.reviewCount ?? 0})
        </span>
      </div>
    </div>

    {/* Product Title */}
    <Link
      to={`/product/${productSlug}`}
      className="font-editorial-serif text-sm sm:text-lg text-snow font-medium hover:text-cream transition-colors line-clamp-1"
    >
      {productName}
    </Link>

    {/* Price and Color Swatches */}
    <div className="mt-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
      <div className="flex flex-wrap items-baseline gap-x-1.5 sm:gap-x-2">
        {product.salePrice != null &&
        Number(product.salePrice) > 0 ? (
          <>
            <span className="text-sm sm:text-base font-bold text-burgundy-light font-sans">
              ${Number(product.salePrice).toFixed(2)}
            </span>

            {product.regularPrice != null && (
              <span className="text-[10px] sm:text-xs text-silver-dark line-through font-sans">
                ${Number(product.regularPrice).toFixed(2)}
              </span>
            )}
          </>
        ) : (
          <span className="text-sm sm:text-base font-semibold text-snow font-sans">
            ${Number(product.regularPrice ?? 0).toFixed(2)}
          </span>
        )}
      </div>

      {/* Color Dots */}
      {colors.length > 0 && (
        <div className="flex items-center gap-1.5">
          {colors.map((color, index) => {
            const colorName =
              typeof color === 'string'
                ? color
                : color?.name || `Color ${index + 1}`;

            const colorHex =
              typeof color === 'string'
                ? color
                : color?.hex || '#808080';

            const isSelected =
              (typeof selectedColor === 'string'
                ? selectedColor
                : selectedColor?.name) === colorName;

            return (
              <button
                key={`${colorName}-${index}`}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setSelectedColor(color);
                }}
                className={`w-3.5 h-3.5 rounded-full border transition-all active:scale-90 ${
                  isSelected
                    ? 'border-cream scale-125 ring-1 ring-cream/40'
                    : 'border-white/20 hover:scale-110'
                }`}
                style={{ backgroundColor: colorHex }}
                title={colorName}
                aria-label={`Select color ${colorName}`}
              />
            );
          })}
        </div>
      )}
    </div>
  </div>
</div>

);
};

export default ProductCard;