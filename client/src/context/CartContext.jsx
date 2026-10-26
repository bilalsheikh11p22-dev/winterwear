import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { cartApi, couponApi, resolveProductId, resolveCartItems } from '../services/api';

const CartContext = createContext();

const CURRENCY = import.meta.env.VITE_CURRENCY || 'PKR';
const FREE_SHIPPING_THRESHOLD = Number(import.meta.env.VITE_FREE_SHIPPING_THRESHOLD) || 5000;
const FLAT_SHIPPING_FEE = Number(import.meta.env.VITE_FLAT_SHIPPING_FEE) || 250;

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState(() => {
    try {
      const stored = localStorage.getItem('winterwear_cart');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [couponFreeShipping, setCouponFreeShipping] = useState(false);
  const [couponNotice, setCouponNotice] = useState('');
  const [cartLoading, setCartLoading] = useState(false);

  // Sync to localStorage as an offline/instant cache
  useEffect(() => {
    try {
      localStorage.setItem('winterwear_cart', JSON.stringify(cartItems));
    } catch (e) {
      console.error('Failed to sync cart to localStorage', e);
    }
  }, [cartItems]);

  // Map API cart response items to frontend item shape
  const mapApiCartItems = (apiItems) => {
    return (apiItems || []).map((item) => {
      const colorObj = typeof item.color === 'string' ? { name: item.color, hex: '#17191C' } : item.color;
      return {
        _id: item._id,
        key: item._id || `${item.productId}-${item.size}-${colorObj?.name || 'Default'}`,
        productId: item.productId,
        name: item.name,
        slug: item.slug,
        sku: item.sku,
        image: item.image,
        size: item.size,
        color: colorObj,
        price: item.price,
        quantity: item.quantity,
        maxStock: item.maxStock ?? 99,
        lineTotal: item.lineTotal ?? item.price * item.quantity,
      };
    });
  };

  // Revalidate & sync cart from backend MongoDB
  const fetchCartFromApi = useCallback(async () => {
    try {
      setCartLoading(true);
      const res = await cartApi.getCart();
      const data = res.data?.data || res.data;
      if (data && Array.isArray(data.items)) {
        const mapped = mapApiCartItems(data.items);
        setCartItems(mapped);
      }
    } catch (err) {
      console.warn('[CartContext] Could not fetch remote cart, using local cache:', err.message);
    } finally {
      setCartLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCartFromApi();
  }, [fetchCartFromApi]);

  const addToCart = async (product, size, color, quantity = 1) => {
    const colorObj = typeof color === 'string' ? { name: color, hex: '#17191C' } : color;
    const itemKey = `${product.id || product._id}-${size}-${colorObj?.name || 'Default'}`;
    const effectivePrice = product.salePrice ?? product.regularPrice ?? product.price ?? 0;

    // Optimistically update local state
    setCartItems((prev) => {
      const existing = prev.find((item) => item.key === itemKey || (item.productId === (product.id || product._id) && item.size === size && item.color?.name === colorObj?.name));
      if (existing) {
        const newQty = Math.min(existing.quantity + quantity, product.stockQuantity || 99);
        return prev.map((item) =>
          item.key === existing.key ? { ...item, quantity: newQty } : item
        );
      }
      return [
        ...prev,
        {
          key: itemKey,
          productId: product.id || product._id,
          sku: product.sku || 'WW-SKU',
          name: product.name,
          slug: product.slug,
          image: product.images?.[0]?.url || product.image || '',
          size,
          color: colorObj,
          price: effectivePrice,
          regularPrice: product.regularPrice || effectivePrice,
          salePrice: product.salePrice,
          quantity: Math.min(quantity, product.stockQuantity || 99),
          maxStock: product.stockQuantity || 99,
        },
      ];
    });

    setIsCartOpen(true);

    // Sync to backend MongoDB
    try {
      const realProductId = await resolveProductId({
        productId: product.id || product._id,
        slug: product.slug,
        name: product.name,
      });
      const res = await cartApi.addItem({
        productId: realProductId,
        sku: product.sku || 'WW-SKU',
        size,
        color: colorObj,
        quantity,
      });
      const data = res.data?.data || res.data;
      if (data && Array.isArray(data.items)) {
        setCartItems(mapApiCartItems(data.items));
      }
    } catch (err) {
      console.warn('[CartContext] Server add item failed, maintained in local storage:', err.message);
    }
  };

  const removeFromCart = async (itemKeyOrId) => {
    const item = cartItems.find((i) => i.key === itemKeyOrId || i._id === itemKeyOrId);
    setCartItems((prev) => prev.filter((i) => i.key !== itemKeyOrId && i._id !== itemKeyOrId));

    if (item?._id) {
      try {
        const res = await cartApi.removeItem(item._id);
        const data = res.data?.data || res.data;
        if (data && Array.isArray(data.items)) {
          setCartItems(mapApiCartItems(data.items));
        }
      } catch (err) {
        console.warn('[CartContext] Remote remove failed:', err.message);
      }
    }
  };

  const updateQuantity = async (itemKeyOrId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(itemKeyOrId);
      return;
    }

    const item = cartItems.find((i) => i.key === itemKeyOrId || i._id === itemKeyOrId);

    setCartItems((prev) =>
      prev.map((i) => {
        if (i.key === itemKeyOrId || i._id === itemKeyOrId) {
          const validQty = Math.min(quantity, i.maxStock || 99);
          return { ...i, quantity: validQty };
        }
        return i;
      })
    );

    if (item?._id) {
      try {
        const res = await cartApi.updateItem(item._id, quantity);
        const data = res.data?.data || res.data;
        if (data && Array.isArray(data.items)) {
          setCartItems(mapApiCartItems(data.items));
        }
      } catch (err) {
        console.warn('[CartContext] Remote update quantity failed:', err.message);
      }
    }
  };

  const clearCart = async () => {
    setCartItems([]);
    setCouponCode('');
    setDiscountAmount(0);
    setCouponFreeShipping(false);
    try {
      await cartApi.clearCart();
    } catch (err) {
      console.warn('[CartContext] Remote clear cart failed:', err.message);
    }
  };

  // Coupons are validated by the server against server-side prices. There is no client-side fallback:
  // if the server says no (or can't be reached), no discount is shown.
  const previewCouponOnServer = async (code) => {
    const resolved = await resolveCartItems(cartItems);
    const res = await couponApi.validate(code, resolved.map((i) => ({ productId: i.productId, quantity: i.quantity })));
    return res.data.data;
  };

  const removeCoupon = useCallback(() => {
    setDiscountAmount(0);
    setCouponFreeShipping(false);
    setCouponCode('');
  }, []);

  const applyCoupon = async (code) => {
    const cleanCode = (code || '').trim().toUpperCase();
    if (!cleanCode) {
      return { success: false, message: 'Please enter a coupon code.' };
    }
    try {
      const data = await previewCouponOnServer(cleanCode);
      setDiscountAmount(data.discountAmount || 0);
      setCouponFreeShipping(!!data.freeShipping);
      setCouponCode(data.code);
      setCouponNotice('');
      return {
        success: true,
        message: data.freeShipping
          ? `Coupon '${data.code}' applied — free shipping!`
          : `Coupon '${data.code}' applied. You save PKR ${Math.round(data.discountAmount).toLocaleString()}.`,
        discountAmount: data.discountAmount,
      };
    } catch (err) {
      const status = err.response?.status;
      return {
        success: false,
        message: err.response?.data?.message
          || (status ? 'This coupon could not be applied.' : err.request ? 'We couldn’t reach the server to check this coupon. Please try again.' : err.message),
      };
    }
  };

  // The discount depends on the cart, so re-check it (server-side) whenever the cart changes.
  useEffect(() => {
    if (!couponCode) return undefined;
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const data = await previewCouponOnServer(couponCode);
        if (cancelled) return;
        setDiscountAmount(data.discountAmount || 0);
        setCouponFreeShipping(!!data.freeShipping);
      } catch (err) {
        if (cancelled) return;
        if (err.response?.status === 400) {
          setCouponNotice(err.response.data?.message || `Coupon ${couponCode} no longer applies to your cart.`);
          removeCoupon();
        }
      }
    }, 600);
    return () => { cancelled = true; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartItems, couponCode]);

  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const effectiveDiscountAmount = Math.min(discountAmount, subtotal);
  const shippingFee = subtotal >= FREE_SHIPPING_THRESHOLD || subtotal === 0 || couponFreeShipping ? 0 : FLAT_SHIPPING_FEE;
  const totalAmount = Math.max(0, subtotal - effectiveDiscountAmount + (subtotal > 0 ? shippingFee : 0));
  const totalItemsCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        isCartOpen,
        setIsCartOpen,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        applyCoupon,
        removeCoupon,
        couponCode,
        couponNotice,
        couponFreeShipping,
        discountPercent: 0,
        discountAmount: effectiveDiscountAmount,
        subtotal,
        shippingFee,
        totalAmount,
        totalItemsCount,
        currency: CURRENCY,
        freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
        flatShippingFee: FLAT_SHIPPING_FEE,
        cartLoading,
        refreshCart: fetchCartFromApi,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export default CartContext;
