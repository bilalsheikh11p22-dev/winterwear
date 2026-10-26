import Inventory from '../models/Inventory.js';
import StockMovement from '../models/StockMovement.js';
import Warehouse from '../models/Warehouse.js';
import Product from '../models/Product.js';
import { logAuditEvent } from '../services/auditService.js';
import { publishStockChanged, publishStockReceived } from '../services/notifications/events.js';

export const listInventory = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const { warehouseId, sku, lowStock } = req.query;

    const query = {};
    if (warehouseId) query.warehouse = warehouseId;
    if (sku) query.sku = new RegExp(sku, 'i');
    if (lowStock === 'true') {
      // available stock < 10
      query.$expr = {
        $lt: [{ $subtract: [{ $subtract: ['$onHand', '$reserved'] }, '$damaged'] }, 10],
      };
    }

    const total = await Inventory.countDocuments(query);
    const items = await Inventory.find(query)
      .populate('warehouse', 'name code location')
      .populate('product', 'name slug images regularPrice salePrice')
      .populate('variant', 'sku size color')
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return res.status(200).json({
      success: true,
      message: 'Inventory records retrieved',
      data: items,
      meta: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const adjustStock = async (req, res, next) => {
  try {
    const { warehouseId, variantId, productId, sku, adjustmentType, quantity, reason } = req.body;
    const actorId = req.user._id;

    if (!warehouseId || !quantity || quantity <= 0) {
      const error = new Error('Warehouse ID and valid positive quantity are required');
      error.status = 400;
      throw error;
    }

    let inv = await Inventory.findOne({ warehouse: warehouseId, sku });
    if (!inv && (variantId || productId)) {
      inv = await Inventory.create({
        warehouse: warehouseId,
        product: productId,
        variant: variantId || productId,
        sku,
        onHand: 0,
        reserved: 0,
        damaged: 0,
      });
    }

    if (!inv) {
      const error = new Error('Inventory record not found for SKU: ' + sku);
      error.status = 404;
      throw error;
    }

    const previousOnHand = inv.onHand;
    let newOnHand = previousOnHand;

    switch (adjustmentType) {
      case 'add':
        newOnHand = previousOnHand + quantity;
        inv.onHand = newOnHand;
        break;
      case 'remove':
        if (inv.onHand < quantity) {
          const error = new Error(`Cannot remove ${quantity} items. Only ${inv.onHand} on hand.`);
          error.status = 400;
          throw error;
        }
        newOnHand = previousOnHand - quantity;
        inv.onHand = newOnHand;
        break;
      case 'damage':
        if (inv.onHand < quantity) {
          const error = new Error(`Cannot mark ${quantity} as damaged. Only ${inv.onHand} on hand.`);
          error.status = 400;
          throw error;
        }
        inv.onHand -= quantity;
        inv.damaged += quantity;
        newOnHand = inv.onHand;
        break;
      case 'correct':
        newOnHand = quantity;
        inv.onHand = newOnHand;
        break;
      default: {
        const error = new Error('Invalid adjustmentType. Use add, remove, damage, or correct.');
        error.status = 400;
        throw error;
      }
    }

    await inv.save();

    // Create Stock Movement Audit Record
    const movementTypeMap = {
      add: 'manual_adjustment',
      remove: 'manual_adjustment',
      damage: 'damage_writeoff',
      correct: 'manual_adjustment',
    };

    await StockMovement.create({
      warehouse: warehouseId,
      product: inv.product,
      variant: inv.variant,
      sku: inv.sku,
      movementType: movementTypeMap[adjustmentType] || 'manual_adjustment',
      quantity,
      previousOnHand,
      newOnHand,
      reason: reason || 'Manual adjustment by staff',
      performedBy: actorId,
    });

    // Update product cached stock
    if (inv.product) {
      const totalStockForProduct = await Inventory.aggregate([
        { $match: { product: inv.product } },
        { $group: { _id: null, total: { $sum: '$onHand' } } },
      ]);
      const currentStock = totalStockForProduct[0]?.total || inv.onHand;
      const before = await Product.findByIdAndUpdate(inv.product, { stockQuantity: currentStock }, { new: false });
      if (before && before.stockQuantity !== currentStock) {
        await publishStockChanged({ productId: inv.product, prevQty: before.stockQuantity, newQty: currentStock });
      }
      if (adjustmentType === 'add') {
        await publishStockReceived({ productId: inv.product, sku: inv.sku, quantity, key: `${inv._id}:${newOnHand}:${Date.now()}` });
      }    }

    await logAuditEvent({
      userId: actorId,
      userEmail: req.user.email,
      role: req.user.role,
      action: 'STOCK_ADJUSTMENT',
      resource: 'Inventory',
      resourceId: inv._id,
      details: { sku, adjustmentType, quantity, previousOnHand, newOnHand, reason },
    });

    return res.status(200).json({
      success: true,
      message: 'Stock adjusted successfully',
      data: inv,
    });
  } catch (error) {
    next(error);
  }
};

export const getStockMovements = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 25;
    const { sku, movementType, warehouseId } = req.query;

    const query = {};
    if (sku) query.sku = new RegExp(sku, 'i');
    if (movementType) query.movementType = movementType;
    if (warehouseId) query.warehouse = warehouseId;

    const total = await StockMovement.countDocuments(query);
    const movements = await StockMovement.find(query)
      .populate('warehouse', 'name code')
      .populate('performedBy', 'name email')
      .populate('product', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return res.status(200).json({
      success: true,
      message: 'Stock movement history retrieved',
      data: movements,
      meta: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const listWarehouses = async (req, res, next) => {
  try {
    const warehouses = await Warehouse.find().sort({ isActive: -1, name: 1 });
    return res.status(200).json({
      success: true,
      message: 'Warehouses retrieved',
      data: warehouses,
    });
  } catch (error) {
    next(error);
  }
};

export const createWarehouse = async (req, res, next) => {
  try {
    const { name, code, location, isActive } = req.body;
    if (!name || !code || !location?.city || !location?.address) {
      const error = new Error('Warehouse name, uppercase code, city, and address are required.');
      error.status = 400;
      throw error;
    }

    const warehouse = await Warehouse.create({
      name,
      code: code.toUpperCase(),
      location,
      isActive: isActive !== false,
    });

    await logAuditEvent({
      userId: req.user._id,
      userEmail: req.user.email,
      role: req.user.role,
      action: 'WAREHOUSE_CREATED',
      resource: 'Warehouse',
      resourceId: warehouse._id,
      details: { name: warehouse.name, code: warehouse.code },
    });

    return res.status(201).json({
      success: true,
      message: 'Warehouse created successfully',
      data: warehouse,
    });
  } catch (error) {
    next(error);
  }
};

export const updateWarehouse = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, location, isActive } = req.body;

    const warehouse = await Warehouse.findByIdAndUpdate(
      id,
      { ...(name && { name }), ...(location && { location }), ...(isActive !== undefined && { isActive }) },
      { new: true }
    );

    if (!warehouse) {
      const error = new Error('Warehouse not found');
      error.status = 404;
      throw error;
    }

    return res.status(200).json({
      success: true,
      message: 'Warehouse updated successfully',
      data: warehouse,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /inventory/dashboard
 * One-call summary for the inventory manager dashboard.
 */
export const getInventoryDashboard = async (req, res, next) => {
  try {
    const days = 14;
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    since.setDate(since.getDate() - (days - 1));

    const availableExpr = {
      $max: [0, { $subtract: [{ $subtract: ['$onHand', '$reserved'] }, '$damaged'] }],
    };

    const [facets] = await Inventory.aggregate([
      { $addFields: { availableQty: availableExpr } },
      {
        $facet: {
          totals: [
            {
              $group: {
                _id: null,
                skuRecords: { $sum: 1 },
                onHand: { $sum: '$onHand' },
                reserved: { $sum: '$reserved' },
                damaged: { $sum: '$damaged' },
                available: { $sum: '$availableQty' },
                outOfStock: { $sum: { $cond: [{ $eq: ['$availableQty', 0] }, 1, 0] } },
                lowStock: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $gt: ['$availableQty', 0] },
                          { $lte: ['$availableQty', '$reorderThreshold'] },
                        ],
                      },
                      1,
                      0,
                    ],
                  },
                },
              },
            },
          ],
          byWarehouse: [
            {
              $group: {
                _id: '$warehouse',
                skuRecords: { $sum: 1 },
                onHand: { $sum: '$onHand' },
                available: { $sum: '$availableQty' },
                attention: {
                  $sum: { $cond: [{ $lte: ['$availableQty', '$reorderThreshold'] }, 1, 0] },
                },
              },
            },
          ],
          attention: [
            { $match: { $expr: { $lte: ['$availableQty', '$reorderThreshold'] } } },
            { $sort: { availableQty: 1, updatedAt: -1 } },
            { $limit: 8 },
          ],
        },
      },
    ]);

    const totals = facets.totals[0] || {
      skuRecords: 0,
      onHand: 0,
      reserved: 0,
      damaged: 0,
      available: 0,
      outOfStock: 0,
      lowStock: 0,
    };
    delete totals._id;

    const warehouses = await Warehouse.find().select('name code location isActive').lean();
    const warehouseMap = new Map(warehouses.map((w) => [w._id.toString(), w]));

    const byWarehouse = facets.byWarehouse
      .map((w) => ({
        warehouseId: w._id,
        name: warehouseMap.get(w._id?.toString())?.name || 'Unknown warehouse',
        code: warehouseMap.get(w._id?.toString())?.code || '',
        city: warehouseMap.get(w._id?.toString())?.location?.city || '',
        skuRecords: w.skuRecords,
        onHand: w.onHand,
        available: w.available,
        attention: w.attention,
      }))
      .sort((a, b) => b.onHand - a.onHand);

    const attentionItems = await Inventory.populate(facets.attention, [
      { path: 'warehouse', select: 'name code' },
      { path: 'product', select: 'name slug' },
      { path: 'variant', select: 'size color' },
    ]);

    const flow = await StockMovement.aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $addFields: {
          delta: { $subtract: ['$newOnHand', '$previousOnHand'] },
          day: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        },
      },
      {
        $group: {
          _id: '$day',
          stockIn: { $sum: { $cond: [{ $gt: ['$delta', 0] }, '$delta', 0] } },
          stockOut: { $sum: { $cond: [{ $lt: ['$delta', 0] }, { $abs: '$delta' }, 0] } },
          movements: { $sum: 1 },
        },
      },
    ]);
    const flowMap = new Map(flow.map((f) => [f._id, f]));
    const stockFlow = [];
    for (let i = 0; i < days; i += 1) {
      const d = new Date(since);
      d.setDate(since.getDate() + i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate()
      ).padStart(2, '0')}`;
      const f = flowMap.get(key);
      stockFlow.push({
        date: key,
        stockIn: f?.stockIn || 0,
        stockOut: f?.stockOut || 0,
        movements: f?.movements || 0,
      });
    }

    const recentMovements = await StockMovement.find()
      .populate('warehouse', 'name code')
      .populate('performedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(8)
      .lean();

    return res.status(200).json({
      success: true,
      message: 'Inventory dashboard retrieved',
      data: {
        totals: { ...totals, warehouses: warehouses.filter((w) => w.isActive !== false).length },
        byWarehouse,
        attentionItems,
        stockFlow,
        recentMovements,
      },
    });
  } catch (error) {
    next(error);
  }
};
