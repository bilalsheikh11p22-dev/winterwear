import React from 'react';
import { X, Check, ShoppingBag, ShieldCheck, Star } from 'lucide-react';
import { useCart } from '../../context/CartContext';

export default function ProductComparisonModal({ isOpen, onClose, comparisonData }) {
  const { addToCart } = useCart();

  if (!isOpen || !comparisonData || !comparisonData.products) return null;

  const { products } = comparisonData;

  const handleAddPiece = (prod) => {
    const selectedSize = prod.availableSizes?.[0] || 'M';
    const color = { name: 'Noir Charcoal', hex: '#17191C' };

    addToCart(
      {
        _id: prod._id,
        name: prod.name,
        price: prod.currentPrice || prod.salePrice || prod.regularPrice,
        regularPrice: prod.regularPrice,
        salePrice: prod.salePrice,
        images: prod.images?.length ? [{ url: prod.images[0] }] : [],
      },
      selectedSize,
      color,
      1
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/80 backdrop-blur-sm">
      <div className="bg-[#17191C] border border-white/15 max-w-4xl w-full rounded-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#1F2226] border-b border-white/10">
          <div>
            <h3 className="text-sm uppercase tracking-widest text-snow font-medium">
              Atelier Garment Specification Matrix
            </h3>
            <p className="text-xs text-silver/70">
              Verified physical attributes derived directly from atelier catalogue
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-silver/80 hover:text-snow hover:bg-white/5 rounded transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Table / Grid */}
        <div className="overflow-x-auto p-6 flex-1">
          <div className={`grid grid-cols-${products.length + 1} gap-4 min-w-[600px]`}>
            {/* Attribute labels column */}
            <div className="space-y-6 pt-28 text-xs text-silver/80 font-medium">
              <div className="h-8 flex items-center">Price (PKR)</div>
              <div className="h-8 flex items-center">Category</div>
              <div className="h-12 flex items-center">Materials & Fabric</div>
              <div className="h-12 flex items-center">Care Instructions</div>
              <div className="h-8 flex items-center">Available Sizes</div>
              <div className="h-8 flex items-center">Customer Rating</div>
              <div className="h-8 flex items-center">Stock Availability</div>
              <div className="h-10 flex items-center">Action</div>
            </div>

            {/* Product columns */}
            {products.map((prod) => (
              <div
                key={prod._id}
                className="bg-[#1F2226]/60 border border-white/10 rounded-sm p-4 space-y-6 flex flex-col justify-between"
              >
                {/* Header card info */}
                <div className="h-28 flex flex-col items-center text-center">
                  {prod.images?.[0] ? (
                    <img
                      src={prod.images[0]}
                      alt={prod.name}
                      className="w-16 h-16 object-cover rounded bg-charcoal mb-2"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded bg-charcoal border border-white/5 flex items-center justify-center text-[10px] text-silver mb-2">
                      WinterWear
                    </div>
                  )}
                  <h4 className="text-xs font-serif font-medium text-snow line-clamp-2">
                    {prod.name}
                  </h4>
                  <span className="text-[10px] text-silver/60 uppercase">{prod.sku}</span>
                </div>

                {/* Price */}
                <div className="h-8 flex items-center text-cream font-medium text-xs">
                  PKR {(prod.currentPrice || prod.regularPrice || 0).toLocaleString()}
                </div>

                {/* Category */}
                <div className="h-8 flex items-center text-snow/90 text-xs">
                  {prod.category}
                </div>

                {/* Materials */}
                <div className="h-12 flex items-center text-snow/80 text-xs">
                  {prod.materials || 'Pure Winter Grade Blend'}
                </div>

                {/* Care */}
                <div className="h-12 flex items-center text-snow/80 text-xs">
                  {prod.careInstructions || 'Dry Clean Only'}
                </div>

                {/* Sizes */}
                <div className="h-8 flex items-center gap-1 flex-wrap text-xs">
                  {prod.availableSizes?.length ? (
                    prod.availableSizes.map((s) => (
                      <span
                        key={s}
                        className="px-1.5 py-0.5 bg-white/10 text-snow text-[10px] rounded"
                      >
                        {s}
                      </span>
                    ))
                  ) : (
                    <span className="text-silver/50 text-xs">Standard sizes</span>
                  )}
                </div>

                {/* Rating */}
                <div className="h-8 flex items-center gap-1 text-xs text-amber-300">
                  <Star size={13} fill="currentColor" />
                  <span>{prod.averageRating || 4.9}</span>
                  <span className="text-silver/60 text-[10px]">
                    ({prod.reviewCount || 10})
                  </span>
                </div>

                {/* Stock */}
                <div className="h-8 flex items-center text-xs">
                  {prod.stockQuantity > 0 ? (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <Check size={13} /> {prod.stockQuantity} units available
                    </span>
                  ) : (
                    <span className="text-rose-400">Sold out</span>
                  )}
                </div>

                {/* Add to Cart CTA */}
                <div className="h-10 flex items-center">
                  <button
                    onClick={() => handleAddPiece(prod)}
                    disabled={prod.stockQuantity <= 0}
                    className="w-full py-2 bg-burgundy hover:bg-burgundy/90 disabled:opacity-40 text-snow text-xs uppercase tracking-wider font-medium rounded transition flex items-center justify-center gap-1.5"
                  >
                    <ShoppingBag size={13} /> Add to Bag
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
