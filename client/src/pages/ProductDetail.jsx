import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useCatalog } from '../hooks/useCatalog';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import ProductCard from '../components/common/ProductCard';
import ProductAlertButton from '../components/notifications/ProductAlertButton';
import {
  Heart,
  ShoppingBag,
  Star,
  ShieldCheck,
  Truck,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  Share2,
} from 'lucide-react';

const ProductDetailView = ({ product, catalog }) => {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState(product?.sizes?.[0] || 'M');
  const [selectedColor, setSelectedColor] = useState(product?.colors?.[0]);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState('specifications');
  const [addedNotification, setAddedNotification] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setActiveImageIndex(0);
    if (product) {
      setSelectedSize(product.sizes?.[0] || 'M');
      setSelectedColor(product.colors?.[0]);
      setQuantity(1);
    }
  }, [product]);

  if (!product) {
    return (
      <div className="min-h-screen bg-charcoal text-snow flex items-center justify-center p-8">
        <div className="text-center">
          <h2 className="font-editorial-serif text-3xl">Piece Not Located</h2>
          <Link to="/shop" className="mt-4 inline-block text-cream underline">
            Return to Outerwear Catalog
          </Link>
        </div>
      </div>
    );
  }

  const isFavorited = isInWishlist(product.id);
  const effectivePrice = product.salePrice ?? product.regularPrice;
  const isLowStock = product.stockQuantity <= product.lowStockThreshold;

  const handleAddToCart = () => {
    addToCart(product, selectedSize, selectedColor, quantity);
    setAddedNotification(true);
    setTimeout(() => setAddedNotification(false), 3000);
  };

  const relatedProducts = catalog.filter(
    (p) => p.id !== product.id && (p.category === product.category || p.collection === product.collection)
  ).slice(0, 4);

  return (
    <div className="min-h-screen bg-charcoal text-snow py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center space-x-2 text-xs text-silver mb-8">
          <Link to="/" className="hover:text-cream transition-colors">Home</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link to="/shop" className="hover:text-cream transition-colors">Outerwear</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link to={`/shop?category=${product.category}`} className="hover:text-cream transition-colors">
            {product.categoryName}
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-snow truncate font-medium">{product.name}</span>
        </nav>

        {/* Product Section Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Left Column: Image Gallery */}
          <div className="lg:col-span-7 space-y-4">
            {/* Primary Main Photo */}
            <div className="relative aspect-[3/4] w-full overflow-hidden rounded-sm bg-charcoal-surface border border-white/5">
              <img
                src={product.images[activeImageIndex]?.url}
                alt={product.images[activeImageIndex]?.alt || product.name}
                className="w-full h-full object-cover object-center transition-all duration-500 ease-out"
              />

              {product.isOnSale && (
                <span className="absolute top-4 left-4 bg-burgundy text-snow text-xs font-bold uppercase tracking-widest px-3 py-1 shadow-lg">
                  Private Sale
                </span>
              )}
            </div>

            {/* Thumbnail Selectors */}
            {product.images.length > 1 && (
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                {product.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`relative aspect-[3/4] overflow-hidden rounded-sm border transition-all ${
                      activeImageIndex === idx
                        ? 'border-cream scale-95 opacity-100 ring-2 ring-cream/20'
                        : 'border-white/10 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={img.url}
                      alt={img.alt || `Thumbnail ${idx + 1}`}
                      className="w-full h-full object-cover object-center"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Details & Purchasing Controls */}
          <div className="lg:col-span-5 flex flex-col justify-start space-y-6">
            <div>
              <div className="flex items-center justify-between text-xs text-silver mb-2">
                <span className="uppercase tracking-widest font-mono text-[11px] text-cream">
                  SKU: {product.sku}
                </span>
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center text-amber-400">
                    <Star className="w-3.5 h-3.5 fill-current" />
                  </div>
                  <span className="font-semibold text-snow">{product.averageRating}</span>
                  <span className="text-silver-dark">({product.reviewCount} verified reviews)</span>
                </div>
              </div>

              <h1 className="font-editorial-serif text-3xl sm:text-4xl text-snow font-medium leading-tight">
                {product.name}
              </h1>

              {/* Pricing */}
              <div className="mt-4 flex items-baseline gap-3">
                {product.salePrice ? (
                  <>
                    <span className="text-2xl sm:text-3xl font-bold text-burgundy-light font-sans">
                      ${product.salePrice.toFixed(2)}
                    </span>
                    <span className="text-base text-silver line-through font-sans">
                      ${product.regularPrice.toFixed(2)}
                    </span>
                    <span className="text-xs uppercase tracking-wider font-semibold text-cream bg-burgundy/20 px-2 py-0.5 rounded">
                      Save ${(product.regularPrice - product.salePrice).toFixed(0)}
                    </span>
                  </>
                ) : (
                  <span className="text-2xl sm:text-3xl font-semibold text-snow font-sans">
                    ${product.regularPrice.toFixed(2)}
                  </span>
                )}
              </div>
            </div>

            {/* Short Narrative Description */}
            <p className="text-xs sm:text-sm text-silver leading-relaxed font-light">
              {product.shortDescription}
            </p>

            {/* Color Selection */}
            <div className="space-y-2 pt-2 border-t border-white/5">
              <div className="flex justify-between items-center text-xs">
                <span className="uppercase tracking-wider font-semibold text-silver">Color Hue:</span>
                <span className="text-snow font-medium">{selectedColor?.name}</span>
              </div>
              <div className="flex items-center gap-3">
                {product.colors.map((color) => (
                  <button
                    key={color.name}
                    onClick={() => setSelectedColor(color)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs border transition-all ${
                      selectedColor?.name === color.name
                        ? 'border-cream bg-charcoal-surface text-snow font-semibold'
                        : 'border-white/10 text-silver hover:border-white/20'
                    }`}
                  >
                    <span
                      className="w-3 h-3 rounded-full border border-white/20"
                      style={{ backgroundColor: color.hex }}
                    />
                    <span>{color.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Size Selection */}
            <div className="space-y-2 pt-2 border-t border-white/5">
              <div className="flex justify-between items-center text-xs">
                <span className="uppercase tracking-wider font-semibold text-silver">Select Size:</span>
                <Link to="/size-guide" className="text-ice hover:underline text-[11px]">
                  Bespoke Sizing Chart →
                </Link>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {product.sizes.map((size) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`py-2.5 text-center text-xs uppercase tracking-wider font-semibold rounded border transition-all ${
                      selectedSize === size
                        ? 'border-cream bg-cream text-charcoal'
                        : 'border-white/10 text-snow hover:border-white/30 bg-charcoal-surface'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Stock status */}
            <div className="text-xs flex items-center gap-2">
              {isLowStock ? (
                <span className="text-amber-300 flex items-center gap-1.5 font-medium">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Limited Atelier Allocation: Only {product.stockQuantity} units left in stock
                </span>
              ) : (
                <span className="text-cream flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-cream" />
                  Available for immediate international dispatch
                </span>
              )}
            </div>

            {/* Alerts: back-in-stock (only when sold out) and price-drop */}
            {product._id && (
              <div className="space-y-2 text-snow">
                {product.stockQuantity <= 0 && <ProductAlertButton productId={product._id} type="back_in_stock" />}
                <ProductAlertButton productId={product._id} type="price_drop" />
              </div>
            )}

            {/* Purchasing Action Buttons */}
            <div className="space-y-3 pt-4">
              <div className="flex gap-3">
                <button
                  onClick={handleAddToCart}
                  className="flex-1 py-4 bg-burgundy hover:bg-burgundy-hover text-snow font-bold text-xs uppercase tracking-widest rounded transition-all duration-300 flex items-center justify-center gap-2 shadow-xl shadow-burgundy/25 hover:scale-[1.01]"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Add To Atelier Bag</span>
                </button>
                <button
                  onClick={() => toggleWishlist(product)}
                  className={`p-4 rounded border transition-colors ${
                    isFavorited
                      ? 'border-burgundy bg-burgundy/20 text-burgundy'
                      : 'border-white/10 bg-charcoal-surface text-snow hover:border-white/30'
                  }`}
                  aria-label={isFavorited ? 'Remove from wishlist' : 'Add to wishlist'}
                >
                  <Heart className={`w-5 h-5 ${isFavorited ? 'fill-burgundy' : ''}`} />
                </button>
              </div>

              {addedNotification && (
                <div className="p-3 bg-cream/10 border border-cream/30 text-cream text-xs rounded text-center animate-fade-in">
                  Added to bag with selected size ({selectedSize}) and hue ({selectedColor?.name}).
                </div>
              )}
            </div>

            {/* Atelier Guarantees */}
            <div className="pt-6 border-t border-white/5 space-y-3 text-xs text-silver">
              <div className="flex items-center gap-3">
                <Truck className="w-4 h-4 text-ice" />
                <span>Complimentary express delivery on orders over $300</span>
              </div>
              <div className="flex items-center gap-3">
                <RotateCcw className="w-4 h-4 text-ice" />
                <span>30-Day complimentary returns & size exchange</span>
              </div>
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-4 h-4 text-ice" />
                <span>Certified Responsible Down Standard & Biella Virgin Wool</span>
              </div>
            </div>
          </div>
        </div>

        {/* Technical Specifications, Materials & Care Tabs */}
        <div className="mt-20 border-t border-white/10 pt-12">
          <div className="flex border-b border-white/10 gap-8 text-xs uppercase tracking-wider font-semibold">
            <button
              onClick={() => setActiveTab('specifications')}
              className={`pb-4 border-b-2 transition-colors ${
                activeTab === 'specifications' ? 'border-cream text-cream' : 'border-transparent text-silver hover:text-snow'
              }`}
            >
              Technical Specifications
            </button>
            <button
              onClick={() => setActiveTab('materials')}
              className={`pb-4 border-b-2 transition-colors ${
                activeTab === 'materials' ? 'border-cream text-cream' : 'border-transparent text-silver hover:text-snow'
              }`}
            >
              Materials & Composition
            </button>
            <button
              onClick={() => setActiveTab('care')}
              className={`pb-4 border-b-2 transition-colors ${
                activeTab === 'care' ? 'border-cream text-cream' : 'border-transparent text-silver hover:text-snow'
              }`}
            >
              Care & Maintenance
            </button>
          </div>

          <div className="py-8 text-xs">
            {activeTab === 'specifications' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
                {product.specifications.map((spec) => (
                  <div key={spec.key} className="p-3 bg-charcoal-surface rounded border border-white/5 flex justify-between">
                    <span className="text-silver font-medium">{spec.key}</span>
                    <span className="text-snow font-semibold">{spec.value}</span>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'materials' && (
              <div className="space-y-3 max-w-2xl">
                <p className="text-silver leading-relaxed font-light">
                  Each fiber is selected for thermal resilience, breathability, and structural longevity:
                </p>
                <ul className="list-disc list-inside space-y-1.5 text-snow">
                  {product.materials.map((mat, i) => (
                    <li key={i}>{mat}</li>
                  ))}
                </ul>
              </div>
            )}

            {activeTab === 'care' && (
              <div className="space-y-3 max-w-2xl">
                <p className="text-silver leading-relaxed font-light">
                  Preserve the thermal loft and fiber integrity with proper atelier care:
                </p>
                <ul className="list-disc list-inside space-y-1.5 text-snow">
                  {product.careInstructions.map((care, i) => (
                    <li key={i}>{care}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Related Outerwear Grid */}
        <div className="mt-20 border-t border-white/10 pt-16">
          <div className="mb-8">
            <span className="text-xs uppercase tracking-editorial text-ice font-bold">
              Complete The Look
            </span>
            <h2 className="font-editorial-serif text-2xl sm:text-4xl text-snow font-light mt-1">
              Harmonious Complements
            </h2>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            {relatedProducts.map((rel) => (
              <ProductCard key={rel.id} product={rel} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const ProductDetail = () => {
  const { slug } = useParams();
  const { products, loading } = useCatalog();
  const product = products.find((p) => p.slug === slug);

  if (loading && !product) {
    return (
      <div className="min-h-screen bg-charcoal py-24 text-center text-xs uppercase tracking-widest text-silver">
        Loading piece…
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-charcoal text-snow flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="font-editorial-serif text-3xl">Piece Not Found</h1>
          <p className="mt-2 text-sm text-silver">This product is no longer available.</p>
          <Link to="/shop" className="mt-6 inline-block text-cream underline">
            Back to the collection
          </Link>
        </div>
      </div>
    );
  }

  return <ProductDetailView key={product.id} product={product} catalog={products} />;
};

export default ProductDetail;
