import mongoose from 'mongoose';
import User from '../../models/User.js';
import Category from '../../models/Category.js';
import Product from '../../models/Product.js';
import Warehouse from '../../models/Warehouse.js';
import Inventory from '../../models/Inventory.js';

let n = 0;
const uniq = () => `${Date.now().toString(36)}${(n += 1)}`;

export const makeUser = (role = 'customer', extra = {}) =>
  User.create({ name: `${role} ${uniq()}`, email: `${role}.${uniq()}@example.test`, password: 'Str0ng!Passw0rd', role, isActive: true, ...extra });

export const makeCategory = (name = 'Jackets') => Category.create({ name: `${name} ${uniq()}`, slug: `cat-${uniq()}` });

export const makeProduct = async (over = {}) => {
  const category = over.category || (await makeCategory())._id;
  const id = uniq();
  return Product.create({
    name: `Parka ${id}`, sku: `SKU-${id}`, slug: `parka-${id}`, description: 'Warm winter parka for cold seasons.',
    category, regularPrice: 10000, stockQuantity: 20, isPublished: true,
    images: [{ public_id: 'winterwear/parka', url: 'https://res.cloudinary.com/demo/image/upload/parka.jpg', isPrimary: true }],
    ...over,
  });
};

export const ensureWarehouse = async () =>
  (await Warehouse.findOne({ isActive: true })) ||
  Warehouse.create({ name: 'Test Hub', code: `WH-${uniq()}`, location: { city: 'Lahore', address: 'Test Street 1' } });

/** Inventory row the order flow reserves against (variant === product id, as the order service does). */
export const stockProduct = async (product, onHand = 50) => {
  const wh = await ensureWarehouse();
  return Inventory.create({ warehouse: wh._id, product: product._id, variant: product._id, sku: product.sku, onHand });
};

export const oid = () => new mongoose.Types.ObjectId();
