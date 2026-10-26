import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { Trash2, Plus, Minus, ArrowRight, Tag, AlertTriangle, ShieldCheck, Truck, RefreshCw } from 'lucide-react';
import CouponList from '../components/notifications/CouponList';

const CartPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    cartItems,
    removeFromCart,
    updateQuantity,
    clearCart,
    subtotal,
    shippingFee,
    discountAmount,
    totalAmount,
    couponCode,
    couponNotice,
    applyCoupon,
    removeCoupon,
    currency,
    freeShippingThreshold,
    cartLoading,
    refreshCart,
  } = useCart();

  const { isAuthenticated } = useAuth();
  const [inputCoupon, setInputCoupon] = useState('');
  const [couponFeedback, setCouponFeedback] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);

  const handleApplyCoupon = async (e) => {
    e.preventDefault();
    if (!inputCoupon.trim()) return;
    setCouponLoading(true);
    const res = await applyCoupon(inputCoupon);
    setCouponFeedback(res);
    setCouponLoading(false);
  };

  const amountNeededForFreeShipping = Math.max(0, freeShippingThreshold - subtotal);
  const freeShippingProgress = Math.min(100, Math.round((subtotal / freeShippingThreshold) * 100));

  return (
    <div className="min-h-screen bg-charcoal text-snow py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="border-b border-white/10 pb-6 mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="text-xs uppercase tracking-editorial text-ice font-bold">
              Atelier Bag Review
            </span>
            <h1 className="font-editorial-serif text-3xl sm:text-5xl text-snow font-light mt-1">
              Your Atelier Bag
            </h1>
          </div>
          {cartItems.length > 0 && (
            <div className="flex items-center gap-4">
              <button
                onClick={refreshCart}
                className="text-xs text-silver hover:text-cream flex items-center gap-1.5 transition-colors"
                title="Verify prices with database"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${cartLoading ? 'animate-spin' : ''}`} />
                <span>Sync Prices</span>
              </button>
              <button
                onClick={clearCart}
                className="text-xs text-silver-dark hover:text-burgundy-light transition-colors"
              >
                Empty Bag
              </button>
            </div>
          )}
        </div>

        {/* Free Shipping Tier Notification */}
        {cartItems.length > 0 && (
          <div className="mb-8 p-4 bg-charcoal-dark/60 rounded border border-white/10">
            <div className="flex items-center justify-between text-xs mb-2">
              <div className="flex items-center gap-2 text-snow">
                <Truck className="w-4 h-4 text-ice" />
                {amountNeededForFreeShipping === 0 ? (
                  <span className="font-semibold text-ice">
                    Complimentary Express Shipping Unlocked!
                  </span>
                ) : (
                  <span>
                    Add{' '}
                    <strong className="text-cream">
                      {currency} {amountNeededForFreeShipping.toLocaleString()}
                    </strong>{' '}
                    more for complimentary nationwide delivery.
                  </span>
                )}
              </div>
              <span className="text-silver font-mono">{freeShippingProgress}%</span>
            </div>
            <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-ice h-full transition-all duration-500 rounded-full"
                style={{ width: `${freeShippingProgress}%` }}
              />
            </div>
          </div>
        )}

        {cartItems.length === 0 ? (
          <div className="text-center py-24 glass-panel rounded max-w-lg mx-auto p-8 border border-white/10">
            <h3 className="font-editorial-serif text-2xl text-snow font-medium">Your Bag Is Empty</h3>
            <p className="text-xs text-silver mt-2 leading-relaxed">
              Explore our cold-weather collection of Italian cashmere overcoats, down-insulated parkas, and shearling accessories.
            </p>
            <Link
              to="/shop"
              className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-cream hover:bg-snow text-charcoal font-bold text-xs uppercase tracking-widest rounded transition-all duration-300"
            >
              <span>Explore Atelier Collection</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Items List */}
            <div className="lg:col-span-8 space-y-4">
              <div className="glass-panel rounded divide-y divide-white/5 border border-white/10">
                {cartItems.map((item) => (
                  <div
                    key={item.key || item._id}
                    className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-4">
                      <img
                        src={item.image || 'https://images.unsplash.com/photo-1544923246-77307dd654cb?q=80&w=300'}
                        alt={item.name}
                        className="w-20 h-24 object-cover object-center rounded bg-charcoal border border-white/5 shrink-0"
                      />
                      <div>
                        <Link
                          to={`/product/${item.slug}`}
                          className="font-medium text-sm text-snow hover:text-cream transition-colors"
                        >
                          {item.name}
                        </Link>
                        <p className="text-xs text-silver-dark font-mono mt-0.5">SKU: {item.sku}</p>
                        <div className="mt-2 text-xs text-silver flex items-center gap-3">
                          <span>
                            Size: <strong className="text-snow">{item.size}</strong>
                          </span>
                          <span className="flex items-center gap-1.5">
                            Color:
                            <span
                              className="inline-block w-2.5 h-2.5 rounded-full border border-white/20"
                              style={{ backgroundColor: item.color?.hex || '#17191C' }}
                            />
                            <strong className="text-snow">{item.color?.name}</strong>
                          </span>
                        </div>
                        {item.maxStock && item.maxStock < 5 && (
                          <div className="mt-2 flex items-center gap-1 text-[11px] text-amber-400">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Only {item.maxStock} left in atelier inventory</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-end justify-between w-full sm:w-auto gap-4">
                      <div className="flex items-center border border-white/10 rounded bg-charcoal">
                        <button
                          onClick={() => updateQuantity(item.key || item._id, item.quantity - 1)}
                          className="p-1.5 hover:text-cream text-silver transition-colors"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="px-3 text-xs font-semibold text-snow">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.key || item._id, item.quantity + 1)}
                          disabled={item.quantity >= item.maxStock}
                          className="p-1.5 hover:text-cream text-silver transition-colors disabled:opacity-30"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className="text-sm sm:text-base font-bold text-snow">
                            {currency} {(item.price * item.quantity).toLocaleString()}
                          </span>
                          {item.regularPrice > item.price && (
                            <span className="block text-xs text-silver-dark line-through">
                              {currency} {(item.regularPrice * item.quantity).toLocaleString()}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => removeFromCart(item.key || item._id)}
                          className="text-silver-dark hover:text-burgundy-light transition-colors p-1"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Order Summary & Valuation */}
            <div className="lg:col-span-4 space-y-6">
              <div className="glass-panel p-6 rounded border border-white/10 space-y-6 sticky top-24">
                <h3 className="font-editorial-serif text-xl text-snow font-medium border-b border-white/10 pb-3">
                  Summary & Valuation
                </h3>

                {/* Promo Code Form */}
                <form onSubmit={handleApplyCoupon} className="flex gap-2">
                  <div className="relative flex-1">
                    <Tag className="absolute left-3 top-2.5 w-3.5 h-3.5 text-silver" />
                    <input
                      type="text"
                      placeholder="Promo code"
                      value={inputCoupon}
                      onChange={(e) => setInputCoupon(e.target.value)}
                      className="w-full bg-charcoal text-snow text-xs pl-9 pr-3 py-2.5 rounded border border-white/10 focus:outline-none focus:border-cream uppercase"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={couponLoading}
                    className="px-4 py-2.5 bg-cream hover:bg-snow text-charcoal text-xs font-bold uppercase rounded transition-colors disabled:opacity-50"
                  >
                    {couponLoading ? '...' : 'Apply'}
                  </button>
                </form>

                {couponNotice && !couponCode && (
                  <div role="alert" className="text-xs p-2.5 rounded bg-red-950/40 text-red-300 border border-red-500/20">{couponNotice}</div>
                )}

                {isAuthenticated && (
                  <CouponList
                    compact
                    title="Available offers"
                    appliedCode={couponCode}
                    onApply={async (code) => { setInputCoupon(code); setCouponFeedback(await applyCoupon(code)); }}
                  />
                )}

                {couponFeedback && (
                  <div
                    className={`text-xs p-2.5 rounded flex justify-between items-center ${
                      couponFeedback.success ? 'bg-burgundy/20 text-cream border border-burgundy/40' : 'bg-red-950/40 text-red-300 border border-red-500/20'
                    }`}
                  >
                    <span>{couponFeedback.message}</span>
                    {couponCode && (
                      <button onClick={removeCoupon} className="text-[10px] underline ml-2 hover:text-white">
                        Remove
                      </button>
                    )}
                  </div>
                )}

                {/* Calculations */}
                <div className="space-y-2.5 text-xs text-silver">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="text-snow">
                      {currency} {subtotal.toLocaleString()}
                    </span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-cream">
                      <span>Promotional Discount ({couponCode})</span>
                      <span>
                        - {currency} {Math.round(discountAmount).toLocaleString()}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Atelier Shipping</span>
                    <span>
                      {shippingFee === 0 ? (
                        <strong className="text-ice">Complimentary</strong>
                      ) : (
                        `${currency} ${shippingFee.toLocaleString()}`
                      )}
                    </span>
                  </div>
                  <div className="pt-3 border-t border-white/10 flex justify-between text-base font-bold text-snow">
                    <span>Estimated Total</span>
                    <span className="font-editorial-serif text-2xl text-cream">
                      {currency} {Math.round(totalAmount).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Checkout Trigger */}
                <button
                  onClick={() => navigate(user ? '/checkout' : '/login?redirect=/checkout')}
                  className="w-full py-4 bg-burgundy hover:bg-burgundy-hover text-snow font-bold text-xs uppercase tracking-widest rounded transition-all duration-300 flex items-center justify-center gap-2 shadow-xl shadow-burgundy/20 group"
                >
                  <span>Proceed To Atelier Checkout</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>

                <div className="flex items-center justify-center gap-2 text-[11px] text-silver-dark text-center">
                  <ShieldCheck className="w-4 h-4 text-ice" />
                  <span>Encrypted 256-bit checkout with real-time stock reservation</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartPage;
