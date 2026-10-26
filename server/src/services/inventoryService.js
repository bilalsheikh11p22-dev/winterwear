import Inventory from '../models/Inventory.js';
import StockMovement from '../models/StockMovement.js';
import Product from '../models/Product.js';
import { publishStockChanged } from './notifications/events.js';

/**
 * Checks available stock for a specific variant or base product.
 * Formula: Available = onHand - reserved - damaged
 */
export const getAvailableStock = async (warehouseId, variantId) => {
  const inv = await Inventory.findOne({ warehouse: warehouseId, variant: variantId });
  if (!inv) return 0;
  return Math.max(0, inv.onHand - inv.reserved - inv.damaged);
};

/**
 * Products created from the admin catalogue (or the demo seed) only carry a stockQuantity.
 * Make sure they also have the warehouse inventory record that reservations work against,
 * starting from that stock level. Safe to call repeatedly.
 */
export const ensureInventoryRecord = async ({ warehouseId, productId, sku }) => {
  const exists = await Inventory.exists({ warehouse: warehouseId, variant: productId });
  if (exists) return;
  const product = await Product.findById(productId).select('sku stockQuantity');
  if (!product) return;
  try {
    await Inventory.create({
      warehouse: warehouseId,
      product: productId,
      variant: productId, // base inventory item is keyed by the product id
      sku: product.sku || sku,
      onHand: product.stockQuantity || 0,
    });
  } catch (err) {
    if (err.code !== 11000) throw err; // created concurrently by another request
  }
};

/**
 * Keeps the warehouse record in step when an admin edits a product's stock quantity.
 * stockQuantity is what can be sold, so onHand = sellable + reserved + damaged.
 */
export const syncInventoryToProductStock = async (productId, stockQuantity) => {
  await Inventory.updateMany({ variant: productId }, [
    { $set: { onHand: { $add: [stockQuantity, '$reserved', '$damaged'] } } },
  ]);
};

/**
 * Atomically reserves inventory during checkout to prevent overselling.
 */
export const reserveStock = async ({
  warehouseId,
  productId,
  variantId,
  sku,
  quantity,
  orderId,
  actorId,
}) => {
  await ensureInventoryRecord({ warehouseId, productId: variantId || productId, sku });

  // Atomic conditional update: ensure onHand - reserved - damaged >= quantity
  const inv = await Inventory.findOneAndUpdate(
    {
      warehouse: warehouseId,
      variant: variantId,
      $expr: {
        $gte: [
          { $subtract: [{ $subtract: ['$onHand', '$reserved'] }, '$damaged'] },
          quantity,
        ],
      },
    },
    { $inc: { reserved: quantity } },
    { new: true }
  );

  if (!inv) {
    const error = new Error(`Insufficient inventory available for SKU ${sku}.`);
    error.code = 'OUT_OF_STOCK';
    error.status = 409;
    throw error;
  }

  // Audit movement
  await StockMovement.create({
    warehouse: warehouseId,
    product: productId,
    variant: variantId,
    sku,
    movementType: 'reservation_hold',
    quantity,
    previousOnHand: inv.onHand,
    newOnHand: inv.onHand,
    reason: `Temporary reservation held for Order ${orderId || 'checkout'}`,
    performedBy: actorId,
    referenceOrder: orderId,
  });

  return inv;
};

/**
 * Releases reserved stock if checkout expires, is cancelled, or fails.
 */
export const releaseReservedStock = async ({
  warehouseId,
  productId,
  variantId,
  sku,
  quantity,
  orderId,
  actorId,
  reason = 'Reservation expired or order cancelled',
}) => {
  const inv = await Inventory.findOneAndUpdate(
    {
      warehouse: warehouseId,
      variant: variantId,
      reserved: { $gte: quantity },
    },
    { $inc: { reserved: -quantity } },
    { new: true }
  );

  if (inv) {
    await StockMovement.create({
      warehouse: warehouseId,
      product: productId,
      variant: variantId,
      sku,
      movementType: 'reservation_release',
      quantity,
      previousOnHand: inv.onHand,
      newOnHand: inv.onHand,
      reason,
      performedBy: actorId,
      referenceOrder: orderId,
    });
  }

  return inv;
};

/**
 * Commits stock out upon confirmed sale/packing (reduces both onHand and reserved).
 */
export const commitStockSale = async ({
  warehouseId,
  productId,
  variantId,
  sku,
  quantity,
  orderId,
  actorId,
}) => {
  const prevInv = await Inventory.findOne({ warehouse: warehouseId, variant: variantId });
  const prevOnHand = prevInv?.onHand || quantity;

  const inv = await Inventory.findOneAndUpdate(
    {
      warehouse: warehouseId,
      variant: variantId,
      onHand: { $gte: quantity },
      reserved: { $gte: quantity },
    },
    {
      $inc: {
        onHand: -quantity,
        reserved: -quantity,
      },
    },
    { new: true }
  );

  if (inv) {
    await StockMovement.create({
      warehouse: warehouseId,
      product: productId,
      variant: variantId,
      sku,
      movementType: 'sales_out',
      quantity,
      previousOnHand: prevOnHand,
      newOnHand: inv.onHand,
      reason: `Fulfillment dispatch for Order ${orderId}`,
      performedBy: actorId,
      referenceOrder: orderId,
    });

    // Also update parent Product cached stockQuantity
    const updated = await Product.findByIdAndUpdate(productId, { $inc: { stockQuantity: -quantity } }, { new: true });
    if (updated) await publishStockChanged({ productId, prevQty: updated.stockQuantity + quantity, newQty: updated.stockQuantity });
  }

  return inv;
};
