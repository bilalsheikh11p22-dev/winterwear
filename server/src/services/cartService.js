import Cart from '../models/Cart.js';
import Product from '../models/Product.js';
import ProductVariant from '../models/ProductVariant.js';

export const getCart = async ({ userId, guestId }) => {
  let query = {};
  if (userId) query = { user: userId };
  else if (guestId) query = { guestId };
  else return { items: [], subtotal: 0 };

  const cart = await Cart.findOne(query).populate('items.product', 'name slug images regularPrice salePrice stockQuantity isPublished');
  if (!cart) {
    return { items: [], subtotal: 0 };
  }

  // Filter out any unpublished products & re-verify current DB prices
  let subtotal = 0;
  const verifiedItems = cart.items
    .filter((item) => item.product && item.product.isPublished)
    .map((item) => {
      const currentPrice = item.product.salePrice ?? item.product.regularPrice;
      const lineTotal = currentPrice * item.quantity;
      subtotal += lineTotal;
      return {
        _id: item._id,
        productId: item.product._id,
        name: item.product.name,
        slug: item.product.slug,
        sku: item.sku,
        size: item.size,
        color: item.color,
        image: item.product.images[0]?.url,
        price: currentPrice,
        quantity: item.quantity,
        lineTotal,
        maxStock: item.product.stockQuantity,
      };
    });

  return {
    cartId: cart._id,
    items: verifiedItems,
    subtotal,
    itemCount: verifiedItems.reduce((acc, curr) => acc + curr.quantity, 0),
  };
};

export const addItemToCart = async ({ userId, guestId, productId, sku, size, color, quantity = 1 }) => {
  const product = await Product.findById(productId);
  if (!product || !product.isPublished) {
    const error = new Error('Product not available for purchasing.');
    error.status = 404;
    throw error;
  }

  if (product.stockQuantity < quantity) {
    const error = new Error(`Only ${product.stockQuantity} items remain in stock.`);
    error.status = 400;
    throw error;
  }

  // Derive current price from verified DB record
  const verifiedPrice = product.salePrice ?? product.regularPrice;

  let cart;
  if (userId) {
    cart = await Cart.findOne({ user: userId });
  } else if (guestId) {
    cart = await Cart.findOne({ guestId });
  }

  if (!cart) {
    cart = new Cart({
      user: userId || null,
      guestId: userId ? null : guestId,
      items: [],
    });
  }

  const existingItemIndex = cart.items.findIndex(
    (item) => item.product.toString() === productId && item.size === size && item.color.name === color.name
  );

  if (existingItemIndex > -1) {
    const newQty = cart.items[existingItemIndex].quantity + quantity;
    if (newQty > product.stockQuantity) {
      const error = new Error(`Cannot add more than ${product.stockQuantity} items to cart.`);
      error.status = 400;
      throw error;
    }
    cart.items[existingItemIndex].quantity = newQty;
    cart.items[existingItemIndex].price = verifiedPrice;
  } else {
    cart.items.push({
      product: productId,
      sku: sku || product.sku,
      size,
      color,
      quantity,
      price: verifiedPrice,
    });
  }

  await cart.save();
  return getCart({ userId, guestId });
};

export const updateCartItemQuantity = async ({ userId, guestId, itemId, quantity }) => {
  let cart;
  if (userId) cart = await Cart.findOne({ user: userId });
  else if (guestId) cart = await Cart.findOne({ guestId });

  if (!cart) {
    const error = new Error('Cart not found.');
    error.status = 404;
    throw error;
  }

  const item = cart.items.id(itemId);
  if (!item) {
    const error = new Error('Cart item not found.');
    error.status = 404;
    throw error;
  }

  if (quantity <= 0) {
    cart.items.pull(itemId);
  } else {
    // Check product stock
    const product = await Product.findById(item.product);
    if (product && quantity > product.stockQuantity) {
      const error = new Error(`Only ${product.stockQuantity} available in stock.`);
      error.status = 400;
      throw error;
    }
    item.quantity = quantity;
  }

  await cart.save();
  return getCart({ userId, guestId });
};

export const mergeGuestCartIntoUserCart = async (guestId, userId) => {
  if (!guestId || !userId) return;

  const guestCart = await Cart.findOne({ guestId });
  if (!guestCart || guestCart.items.length === 0) return;

  let userCart = await Cart.findOne({ user: userId });
  if (!userCart) {
    guestCart.user = userId;
    guestCart.guestId = null;
    await guestCart.save();
    return;
  }

  // Merge items
  for (const guestItem of guestCart.items) {
    const existing = userCart.items.find(
      (ui) =>
        ui.product.toString() === guestItem.product.toString() &&
        ui.size === guestItem.size &&
        ui.color.name === guestItem.color.name
    );
    if (existing) {
      existing.quantity += guestItem.quantity;
    } else {
      userCart.items.push(guestItem);
    }
  }

  await userCart.save();
  await Cart.findByIdAndDelete(guestCart._id);
};
