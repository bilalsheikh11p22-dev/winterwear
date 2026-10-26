import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import {
  listInventory,
  adjustStock,
  getStockMovements,
  listWarehouses,
  createWarehouse,
  updateWarehouse,
  getInventoryDashboard,
} from '../../controllers/inventoryController.js';

const router = Router();

router.use(authenticate);

// GET /api/v1/inventory/dashboard  (read-only summary, also open to warehouse staff)
router.get(
  '/dashboard',
  authorize(['admin', 'super_admin', 'inventory_manager', 'warehouse_staff']),
  getInventoryDashboard
);

router.use(authorize(['admin', 'super_admin', 'inventory_manager']));

// GET /api/v1/inventory
router.get('/', listInventory);

// POST /api/v1/inventory/adjust
router.post('/adjust', adjustStock);

// GET /api/v1/inventory/movements
router.get('/movements', getStockMovements);

// Warehouses
router.get('/warehouses', listWarehouses);
router.post('/warehouses', createWarehouse);
router.patch('/warehouses/:id', updateWarehouse);

export default router;
