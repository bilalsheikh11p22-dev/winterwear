import {
  getCart,
  addItemToCart,
  updateCartItemQuantity,
  mergeGuestCartIntoUserCart,
} from '../services/cartService.js';
import Cart from '../models/Cart.js';

export const getMyCart = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    const guestId = req.headers['x-guest-id'] || req.cookies?.guestId;

    const cart = await getCart({ userId, guestId });

    return res.status(200).json({
      success: true,
      message: 'Cart retrieved successfully',
      data: cart,
    });
  } catch (error) {
    next(error);
  }
};

export const addItem = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    const guestId = req.headers['x-guest-id'] || req.cookies?.guestId;
    const { productId, sku, size, color, quantity } = req.body;

    const cart = await addItemToCart({
      userId,
      guestId,
      productId,
      sku,
      size,
      color,
      quantity,
    });

    return res.status(200).json({
      success: true,
      message: 'Item added to cart',
      data: cart,
    });
  } catch (error) {
    next(error);
  }
};

export const updateItem = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    const guestId = req.headers['x-guest-id'] || req.cookies?.guestId;
    const { itemId } = req.params;
    const { quantity } = req.body;

    const cart = await updateCartItemQuantity({
      userId,
      guestId,
      itemId,
      quantity,
    });

    return res.status(200).json({
      success: true,
      message: 'Cart item updated',
      data: cart,
    });
  } catch (error) {
    next(error);
  }
};

export const removeItem = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    const guestId = req.headers['x-guest-id'] || req.cookies?.guestId;
    const { itemId } = req.params;

    const cart = await updateCartItemQuantity({
      userId,
      guestId,
      itemId,
      quantity: 0,
    });

    return res.status(200).json({
      success: true,
      message: 'Item removed from cart',
      data: cart,
    });
  } catch (error) {
    next(error);
  }
};

export const clearCart = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    const guestId = req.headers['x-guest-id'] || req.cookies?.guestId;

    if (userId) {
      await Cart.findOneAndDelete({ user: userId });
    } else if (guestId) {
      await Cart.findOneAndDelete({ guestId });
    }

    return res.status(200).json({
      success: true,
      message: 'Cart cleared successfully',
      data: { items: [], subtotal: 0, itemCount: 0 },
    });
  } catch (error) {
    next(error);
  }
};

export const mergeCart = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    const guestId = req.headers['x-guest-id'] || req.cookies?.guestId || req.body?.guestId;

    if (guestId && userId) {
      await mergeGuestCartIntoUserCart(guestId, userId);
    }

    const cart = await getCart({ userId });

    return res.status(200).json({
      success: true,
      message: 'Guest cart merged successfully',
      data: cart,
    });
  } catch (error) {
    next(error);
  }
};
