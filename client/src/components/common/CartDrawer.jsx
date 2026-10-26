import React, { useState } from 'react';
import { X, Plus, Minus, Trash2, ArrowRight, ShieldCheck, Tag } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { Link } from 'react-router-dom';

const CartDrawer = () => {
  const {
    cartItems,
    isCartOpen,
    setIsCartOpen,
    removeFromCart,
    updateQuantity,
    subtotal,
    shippingFee,
    discountAmount,
    totalAmount,
    couponCode,
    applyCoupon,
    removeCoupon,
  } = useCart();

  const [inputCoupon, setInputCoupon] = useState('');
  const [couponFeedback, setCouponFeedback] = useState(null);

  if (!isCartOpen) return null;

  const freeShippingThreshold = 300;
  const freeShippingProgress = Math.min(100, (subtotal / freeShippingThreshold) * 100);
  const remainingForFreeShipping = Math.max(0, freeShippingThreshold - subtotal);

  const handleApplyCoupon = (e) => {
    e.preventDefault();
    if (!inputCoupon.trim()) return;
    const result = applyCoupon(inputCoupon);
    setCouponFeedback(result);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-charcoal-dark/75 backdrop-blur-sm transition-opacity duration-300"
        onClick={() => setIsCartOpen(false)}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-charcoal-surface border-l border-white/10 shadow-2xl flex flex-col justify-between animate-slide-up">
          {/* Header */}
          <div className="p-6 border-b border-white/10 flex items-center justify-between">
            <div>
              <h2 className="font-editorial-display text-xl tracking-wider text-snow font-bold">
                Your Atelier Bag
              </h2>
              <p className="text-xs text-silver mt-0.5">
                {cartItems.length} {cartItems.length === 1 ? 'item' : 'items'} selected
              </p>
            </div>
            <button
              onClick={() => setIsCartOpen(false)}
              className="text-silver hover:text-snow transition-colors p-1.5 rounded-full hover:bg-white/5"
              aria-label="Close cart"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Complimentary Shipping Progress Bar */}
          <div className="bg-charcoal px-6 py-3 border-b border-white/5">
            <div className="flex justify-between text-xs text-silver mb-1.5">
              <span>
                {remainingForFreeShipping > 0
                  ? `Add $${remainingForFreeShipping.toFixed(0)} for complimentary express delivery`
                  : 'Eligible for complimentary global express delivery'}
              </span>
              <span className="font-medium text-cream">{Math.round(freeShippingProgress)}%</span>
            </div>
            <div className="w-full bg-charcoal-muted h-1 rounded-full overflow-hidden">
              <div
                className="bg-ice h-full transition-all duration-500 ease-out"
                style={{ width: `${freeShippingProgress}%` }}
              />
            </div>
          </div>

          {/* Items Container */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 divide-y divide-white/5">
            {cartItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-12">
                <div className="w-16 h-16 rounded-full bg-charcoal flex items-center justify-center text-silver-dark mb-4 border border-white/5">
                  <ShieldCheck className="w-8 h-8 text-silver" />
                </div>
                <h3 className="font-editorial-serif text-2xl text-snow font-medium">Your Bag Is Empty</h3>
                <p className="text-xs text-silver mt-2 max-w-xs leading-relaxed">
                  Explore our cold-weather collection of Italian cashmere, goose down parkas, and shearling coats.
                </p>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="mt-6 px-6 py-2.5 bg-cream hover:bg-snow text-charcoal text-xs font-semibold uppercase tracking-widest rounded transition-all duration-300"
                >
                  Discover Collection
                </button>
              </div>
            ) : (
              cartItems.map((item) => (
                <div key={item.key} className="pt-6 first:pt-0 flex gap-4">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-20 h-24 object-cover object-center rounded bg-charcoal border border-white/5 shrink-0"
                  />
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start">
                        <Link
                          to={`/product/${item.slug}`}
                          onClick={() => setIsCartOpen(false)}
                          className="font-medium text-sm text-snow hover:text-cream transition-colors line-clamp-1"
                        >
                          {item.name}
                        </Link>
                        <button
                          onClick={() => removeFromCart(item.key)}
                          className="text-silver-dark hover:text-burgundy-light transition-colors ml-2"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="text-xs text-silver mt-1 flex items-center gap-3">
                        <span>Size: <strong className="text-snow">{item.size}</strong></span>
                        <span className="flex items-center gap-1.5">
                          Color:
                          <span
                            className="inline-block w-2.5 h-2.5 rounded-full border border-white/20"
                            style={{ backgroundColor: item.color.hex }}
                          />
                          <strong className="text-snow">{item.color.name}</strong>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center border border-white/10 rounded bg-charcoal">
                        <button
                          onClick={() => updateQuantity(item.key, item.quantity - 1)}
                          className="p-1 hover:text-cream text-silver transition-colors"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="px-3 text-xs font-medium text-snow">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.key, item.quantity + 1)}
                          disabled={item.quantity >= item.maxStock}
                          className="p-1 hover:text-cream text-silver transition-colors disabled:opacity-30"
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-semibold text-snow">
                          ${(item.price * item.quantity).toFixed(2)}
                        </span>
                        {item.regularPrice > item.price && (
                          <span className="block text-[11px] text-silver-dark line-through">
                            ${(item.regularPrice * item.quantity).toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer & Order Calculations */}
          {cartItems.length > 0 && (
            <div className="p-6 border-t border-white/10 bg-charcoal space-y-4">
              {/* Promo Code Input */}
              <form onSubmit={handleApplyCoupon} className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="absolute left-3 top-2.5 w-3.5 h-3.5 text-silver" />
                  <input
                    type="text"
                    placeholder="Promo Code (e.g. WINTER20)"
                    value={inputCoupon}
                    onChange={(e) => setInputCoupon(e.target.value)}
                    className="w-full bg-charcoal-surface text-snow text-xs pl-9 pr-3 py-2 rounded border border-white/10 focus:outline-none focus:border-cream/50 uppercase"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 bg-charcoal-muted hover:bg-cream hover:text-charcoal text-snow text-xs font-semibold rounded uppercase tracking-wider transition-colors"
                >
                  Apply
                </button>
              </form>

              {couponFeedback && (
                <div
                  className={`text-xs p-2 rounded flex justify-between items-center ${
                    couponFeedback.success ? 'bg-burgundy/20 text-cream' : 'bg-red-950/40 text-red-300'
                  }`}
                >
                  <span>{couponFeedback.message}</span>
                  {couponCode && (
                    <button onClick={removeCoupon} className="text-[10px] underline ml-2">
                      Remove
                    </button>
                  )}
                </div>
              )}

              {/* Price Breakdown */}
              <div className="space-y-1.5 text-xs text-silver">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="text-snow">${subtotal.toFixed(2)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-cream">
                    <span>Promotional Discount ({couponCode})</span>
                    <span>-${discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Estimated Express Shipping</span>
                  <span>{shippingFee === 0 ? <strong className="text-ice">Complimentary</strong> : `$${shippingFee.toFixed(2)}`}</span>
                </div>
                <div className="pt-2 border-t border-white/10 flex justify-between text-base font-bold text-snow">
                  <span>Total Amount</span>
                  <span className="font-editorial-serif text-xl text-cream">${totalAmount.toFixed(2)}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <Link
                  to="/cart"
                  onClick={() => setIsCartOpen(false)}
                  className="w-full py-3 bg-burgundy hover:bg-burgundy-hover text-snow font-semibold text-xs uppercase tracking-widest rounded flex items-center justify-center gap-2 transition-all duration-300 shadow-lg shadow-burgundy/20"
                >
                  <span>Review Bag & Proceed</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="w-full py-2 text-center text-xs text-silver hover:text-snow transition-colors"
                >
                  Continue Browsing
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CartDrawer;
