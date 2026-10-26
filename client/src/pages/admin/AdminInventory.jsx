import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { inventoryApi } from '../../services/api';
import {
  Boxes,
  Plus,
  Search,
  Filter,
  RefreshCw,
  AlertTriangle,
  Warehouse,
  History,
  CheckCircle,
  X,
  SlidersHorizontal,
  ArrowRightLeft,
  Building2,
} from 'lucide-react';

const AdminInventory = () => {
  const [activeTab, setActiveTab] = useState('stock'); // 'stock' | 'movements' | 'warehouses'
  const [inventory, setInventory] = useState([]);
  const [movements, setMovements] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [skuSearch, setSkuSearch] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [lowStockFilter, setLowStockFilter] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [toastMessage, setToastMessage] = useState('');

  // Stock Adjustment Modal State
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustData, setAdjustData] = useState({
    warehouseId: '',
    sku: '',
    adjustmentType: 'add',
    quantity: '',
    reason: '',
  });
  const [adjustSubmitting, setAdjustSubmitting] = useState(false);
  const [adjustError, setAdjustError] = useState('');

  // Warehouse Modal State
  const [isWarehouseModalOpen, setIsWarehouseModalOpen] = useState(false);
  const [warehouseForm, setWarehouseForm] = useState({
    name: '',
    code: '',
    location: { city: '', address: '', contactPerson: '', phone: '' },
  });
  const [warehouseSubmitting, setWarehouseSubmitting] = useState(false);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const fetchWarehouses = async () => {
    try {
      const res = await inventoryApi.listWarehouses();
      const list = res.data?.data || [];
      setWarehouses(list);
      if (list.length > 0 && !adjustData.warehouseId) {
        setAdjustData((prev) => ({ ...prev, warehouseId: list[0]._id }));
      }
    } catch (err) {
      console.error('[Warehouses Fetch Error]', err);
    }
  };

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: 15,
      };
      if (skuSearch) params.sku = skuSearch;
      if (warehouseFilter) params.warehouseId = warehouseFilter;
      if (lowStockFilter) params.lowStock = 'true';

      const res = await inventoryApi.listInventory(params);
      setInventory(res.data?.data || []);
      setTotalPages(res.data?.meta?.pages || 1);
    } catch (err) {
      console.error('[Inventory Fetch Error]', err);
    } finally {
      setLoading(false);
    }
  }, [page, skuSearch, warehouseFilter, lowStockFilter]);

  const fetchMovements = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: 20,
      };
      if (skuSearch) params.sku = skuSearch;
      if (warehouseFilter) params.warehouseId = warehouseFilter;

      const res = await inventoryApi.getStockMovements(params);
      setMovements(res.data?.data || []);
      setTotalPages(res.data?.meta?.pages || 1);
    } catch (err) {
      console.error('[Movements Fetch Error]', err);
    } finally {
      setLoading(false);
    }
  }, [page, skuSearch, warehouseFilter]);

  useEffect(() => {
    fetchWarehouses();
  }, []);

  useEffect(() => {
    if (activeTab === 'stock') {
      fetchInventory();
    } else if (activeTab === 'movements') {
      fetchMovements();
    } else if (activeTab === 'warehouses') {
      fetchWarehouses();
      setLoading(false);
    }
  }, [activeTab, fetchInventory, fetchMovements]);

  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    setAdjustSubmitting(true);
    setAdjustError('');
    try {
      await inventoryApi.adjustStock({
        ...adjustData,
        quantity: Number(adjustData.quantity),
      });
      showToast(`Stock for SKU ${adjustData.sku} adjusted successfully.`);
      setIsAdjustModalOpen(false);
      setAdjustData({
        warehouseId: warehouses[0]?._id || '',
        sku: '',
        adjustmentType: 'add',
        quantity: '',
        reason: '',
      });
      fetchInventory();
    } catch (err) {
      setAdjustError(err.response?.data?.message || err.message || 'Stock adjustment failed.');
    } finally {
      setAdjustSubmitting(false);
    }
  };

  const handleWarehouseSubmit = async (e) => {
    e.preventDefault();
    setWarehouseSubmitting(true);
    try {
      await inventoryApi.createWarehouse(warehouseForm);
      showToast('Warehouse logistics facility added.');
      setIsWarehouseModalOpen(false);
      setWarehouseForm({
        name: '',
        code: '',
        location: { city: '', address: '', contactPerson: '', phone: '' },
      });
      fetchWarehouses();
    } catch (err) {
      alert(err.response?.data?.message || 'Error registering warehouse');
    } finally {
      setWarehouseSubmitting(false);
    }
  };

  const openAdjustWithSku = (sku, warehouseId) => {
    setAdjustData((prev) => ({
      ...prev,
      sku,
      warehouseId: warehouseId || warehouses[0]?._id || '',
    }));
    setIsAdjustModalOpen(true);
  };

  return (
    <AdminLayout
      title="Inventory & Multi-Warehouse Operations"
      subtitle="SKU-level stock tracking, automated reservations & warehouse movement ledger"
    >
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-burgundy border border-white/20 text-snow px-4 py-2.5 rounded shadow-lg text-xs flex items-center gap-2">
          <CheckCircle size={14} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Navigation Tabs Bar */}
      <div className="bg-[#17191C] border border-white/10 p-3 rounded-sm mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setActiveTab('stock');
              setPage(1);
            }}
            className={`flex items-center gap-2 px-4 py-2 text-xs rounded transition uppercase tracking-wider font-medium ${
              activeTab === 'stock'
                ? 'bg-burgundy text-snow'
                : 'text-silver hover:text-snow hover:bg-white/5'
            }`}
          >
            <Boxes size={14} /> SKU Stock Levels
          </button>
          <button
            onClick={() => {
              setActiveTab('movements');
              setPage(1);
            }}
            className={`flex items-center gap-2 px-4 py-2 text-xs rounded transition uppercase tracking-wider font-medium ${
              activeTab === 'movements'
                ? 'bg-burgundy text-snow'
                : 'text-silver hover:text-snow hover:bg-white/5'
            }`}
          >
            <History size={14} /> Stock Movements Audit
          </button>
          <button
            onClick={() => {
              setActiveTab('warehouses');
              setPage(1);
            }}
            className={`flex items-center gap-2 px-4 py-2 text-xs rounded transition uppercase tracking-wider font-medium ${
              activeTab === 'warehouses'
                ? 'bg-burgundy text-snow'
                : 'text-silver hover:text-snow hover:bg-white/5'
            }`}
          >
            <Building2 size={14} /> Warehouses ({warehouses.length})
          </button>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'warehouses' ? (
            <button
              onClick={() => setIsWarehouseModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-burgundy hover:bg-burgundy/90 text-snow text-xs tracking-wider uppercase rounded transition"
            >
              <Plus size={14} /> New Warehouse
            </button>
          ) : (
            <button
              onClick={() => setIsAdjustModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-burgundy hover:bg-burgundy/90 text-snow text-xs tracking-wider uppercase rounded transition"
            >
              <SlidersHorizontal size={14} /> Adjust Stock
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: SKU STOCK LEVELS */}
      {activeTab === 'stock' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-[#17191C] border border-white/10 p-3 rounded-sm flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
              <div className="relative flex-1 max-w-sm">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-silver"
                />
                <input
                  type="text"
                  placeholder="Filter by SKU..."
                  value={skuSearch}
                  onChange={(e) => setSkuSearch(e.target.value)}
                  className="w-full bg-[#1F2226] border border-white/10 rounded pl-9 pr-3 py-1.5 text-snow focus:outline-none focus:border-ice"
                />
              </div>

              <select
                value={warehouseFilter}
                onChange={(e) => setWarehouseFilter(e.target.value)}
                className="bg-[#1F2226] border border-white/10 rounded px-3 py-1.5 text-snow focus:outline-none focus:border-ice"
              >
                <option value="">All Warehouses</option>
                {warehouses.map((w) => (
                  <option key={w._id} value={w._id}>
                    {w.name} ({w.code})
                  </option>
                ))}
              </select>

              <button
                onClick={() => setLowStockFilter(!lowStockFilter)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded border transition ${
                  lowStockFilter
                    ? 'bg-amber-500/20 border-amber-500 text-amber-400 font-medium'
                    : 'bg-white/5 border-white/10 text-silver hover:text-snow'
                }`}
              >
                <AlertTriangle size={13} />
                <span>Low Stock (&lt; 10 Available)</span>
              </button>
            </div>

            <button
              onClick={fetchInventory}
              className="p-1.5 bg-white/5 hover:bg-white/10 text-silver hover:text-snow border border-white/10 rounded"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          {/* Inventory Table */}
          <div className="bg-[#17191C] border border-white/10 rounded-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#1F2226] text-[10px] uppercase tracking-wider text-silver border-b border-white/10">
                  <tr>
                    <th className="py-3 px-4">Warehouse</th>
                    <th className="py-3 px-4">Garment / Piece</th>
                    <th className="py-3 px-4">SKU</th>
                    <th className="py-3 px-4 text-center">On Hand</th>
                    <th className="py-3 px-4 text-center">Reserved</th>
                    <th className="py-3 px-4 text-center">Damaged</th>
                    <th className="py-3 px-4 text-center">Available Net</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-silver">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-silver/60">
                        <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-ice" />
                        Scanning multi-warehouse inventory matrix...
                      </td>
                    </tr>
                  ) : inventory.length > 0 ? (
                    inventory.map((item) => {
                      const available = Math.max(
                        0,
                        (item.onHand || 0) - (item.reserved || 0) - (item.damaged || 0)
                      );
                      return (
                        <tr key={item._id} className="hover:bg-white/5 transition">
                          <td className="py-3 px-4 text-snow font-medium">
                            {item.warehouse?.name || 'Central Hub'}
                            <span className="block text-[10px] font-mono text-silver/70">
                              {item.warehouse?.code || 'WH-01'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-serif text-snow block truncate max-w-[200px]">
                              {item.product?.name || 'Garment Piece'}
                            </span>
                            {item.variant?.size && (
                              <span className="text-[10px] text-ice">
                                Size: {item.variant.size}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] text-ice">{item.sku}</td>
                          <td className="py-3 px-4 text-center font-medium text-snow">
                            {item.onHand}
                          </td>
                          <td className="py-3 px-4 text-center text-amber-400">
                            {item.reserved || 0}
                          </td>
                          <td className="py-3 px-4 text-center text-red-400">
                            {item.damaged || 0}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                available === 0
                                  ? 'bg-red-500/20 text-red-400'
                                  : available < 10
                                  ? 'bg-amber-500/20 text-amber-400'
                                  : 'bg-emerald-500/20 text-emerald-400'
                              }`}
                            >
                              {available} units
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => openAdjustWithSku(item.sku, item.warehouse?._id)}
                              className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-ice hover:text-snow border border-white/10 rounded text-[11px] transition"
                            >
                              Adjust
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-silver/60">
                        No inventory records matching query.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-white/10 flex items-center justify-between text-xs text-silver">
                <span>
                  Page {page} of {totalPages}
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1 bg-white/5 hover:bg-white/10 disabled:opacity-30 rounded transition"
                  >
                    Previous
                  </button>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="px-3 py-1 bg-white/5 hover:bg-white/10 disabled:opacity-30 rounded transition"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: STOCK MOVEMENTS AUDIT TRAIL */}
      {activeTab === 'movements' && (
        <div className="bg-[#17191C] border border-white/10 rounded-sm overflow-hidden">
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-serif text-snow tracking-wider uppercase">
                Stock Movements Log
              </h3>
              <p className="text-xs text-silver/70">
                Immutable audit trail of inventory holds, releases, adjustments and write-offs
              </p>
            </div>
            <button
              onClick={fetchMovements}
              className="p-1.5 bg-white/5 hover:bg-white/10 text-silver border border-white/10 rounded"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#1F2226] text-[10px] uppercase tracking-wider text-silver border-b border-white/10">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Warehouse</th>
                  <th className="py-3 px-4">SKU</th>
                  <th className="py-3 px-4">Movement Type</th>
                  <th className="py-3 px-4 text-center">Qty</th>
                  <th className="py-3 px-4 text-center">Before &rarr; After</th>
                  <th className="py-3 px-4">Reason / Notes</th>
                  <th className="py-3 px-4">Staff</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-silver">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-silver/60">
                      Loading movements log...
                    </td>
                  </tr>
                ) : movements.length > 0 ? (
                  movements.map((m) => (
                    <tr key={m._id} className="hover:bg-white/5">
                      <td className="py-3 px-4 text-silver/80">
                        {new Date(m.createdAt).toLocaleString('en-PK', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </td>
                      <td className="py-3 px-4 text-snow font-medium">
                        {m.warehouse?.name || 'Warehouse'}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-ice">{m.sku}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] uppercase font-semibold bg-white/5 text-snow">
                          {m.movementType?.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-medium text-snow">
                        {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-[11px]">
                        {m.previousOnHand} &rarr;{' '}
                        <span className="text-emerald-400">{m.newOnHand}</span>
                      </td>
                      <td className="py-3 px-4 truncate max-w-[200px] text-silver/80">
                        {m.reason}
                      </td>
                      <td className="py-3 px-4 text-silver">
                        {m.performedBy?.name || m.performedBy?.email || 'System'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-silver/60">
                      No stock movements recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: WAREHOUSES MANAGEMENT */}
      {activeTab === 'warehouses' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {warehouses.map((w) => (
            <div key={w._id} className="bg-[#17191C] border border-white/10 p-5 rounded-sm">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="text-sm font-serif text-snow font-semibold tracking-wide">
                    {w.name}
                  </h4>
                  <span className="text-[11px] font-mono text-ice">{w.code}</span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] uppercase font-semibold ${
                    w.isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-silver'
                  }`}
                >
                  {w.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-silver/80 border-t border-white/5 pt-3">
                <p>
                  <strong className="text-silver">City:</strong> {w.location?.city}
                </p>
                <p>
                  <strong className="text-silver">Address:</strong> {w.location?.address}
                </p>
                {w.location?.contactPerson && (
                  <p>
                    <strong className="text-silver">Contact:</strong> {w.location.contactPerson} (
                    {w.location?.phone || 'N/A'})
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* STOCK ADJUSTMENT MODAL */}
      {isAdjustModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#17191C] border border-white/15 rounded-sm max-w-md w-full shadow-2xl">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-sm font-serif text-snow uppercase tracking-wider">
                Adjust Physical Stock
              </h3>
              <button
                onClick={() => setIsAdjustModalOpen(false)}
                className="text-silver hover:text-snow"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAdjustSubmit} className="p-5 space-y-3 text-xs">
              {adjustError && (
                <div className="p-2.5 bg-red-500/10 border border-red-500/30 text-red-300 rounded text-xs">
                  {adjustError}
                </div>
              )}

              <div>
                <label className="block text-silver mb-1">Target Warehouse *</label>
                <select
                  required
                  value={adjustData.warehouseId}
                  onChange={(e) => setAdjustData({ ...adjustData, warehouseId: e.target.value })}
                  className="w-full bg-[#1F2226] border border-white/10 rounded px-3 py-2 text-snow focus:outline-none focus:border-ice"
                >
                  {warehouses.map((w) => (
                    <option key={w._id} value={w._id}>
                      {w.name} ({w.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-silver mb-1">SKU *</label>
                <input
                  type="text"
                  required
                  value={adjustData.sku}
                  onChange={(e) =>
                    setAdjustData({ ...adjustData, sku: e.target.value.toUpperCase() })
                  }
                  className="w-full bg-[#1F2226] border border-white/10 rounded px-3 py-2 text-snow font-mono focus:outline-none focus:border-ice uppercase"
                  placeholder="e.g. WW-COAT-01"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-silver mb-1">Action Type *</label>
                  <select
                    value={adjustData.adjustmentType}
                    onChange={(e) =>
                      setAdjustData({ ...adjustData, adjustmentType: e.target.value })
                    }
                    className="w-full bg-[#1F2226] border border-white/10 rounded px-3 py-2 text-snow focus:outline-none focus:border-ice"
                  >
                    <option value="add">Add (+ Stock)</option>
                    <option value="remove">Remove (- Stock)</option>
                    <option value="damage">Mark Damaged</option>
                    <option value="correct">Set Exact Total</option>
                  </select>
                </div>
                <div>
                  <label className="block text-silver mb-1">Quantity *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={adjustData.quantity}
                    onChange={(e) => setAdjustData({ ...adjustData, quantity: e.target.value })}
                    className="w-full bg-[#1F2226] border border-white/10 rounded px-3 py-2 text-snow focus:outline-none focus:border-ice"
                    placeholder="10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-silver mb-1">Audit Reason / Justification *</label>
                <textarea
                  rows={2}
                  required
                  value={adjustData.reason}
                  onChange={(e) => setAdjustData({ ...adjustData, reason: e.target.value })}
                  className="w-full bg-[#1F2226] border border-white/10 rounded px-3 py-2 text-snow focus:outline-none focus:border-ice"
                  placeholder="Supplier restock shipment received from atelier..."
                />
              </div>

              <div className="pt-3 border-t border-white/10 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="px-4 py-2 border border-white/20 text-snow rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adjustSubmitting}
                  className="px-5 py-2 bg-burgundy hover:bg-burgundy/90 text-snow uppercase tracking-wider text-[11px] font-medium rounded transition"
                >
                  {adjustSubmitting ? 'Adjusting...' : 'Commit Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NEW WAREHOUSE MODAL */}
      {isWarehouseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#17191C] border border-white/15 rounded-sm max-w-md w-full shadow-2xl">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-sm font-serif text-snow uppercase tracking-wider">
                Add Warehouse Logistics Hub
              </h3>
              <button
                onClick={() => setIsWarehouseModalOpen(false)}
                className="text-silver hover:text-snow"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleWarehouseSubmit} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block text-silver mb-1">Warehouse Name *</label>
                <input
                  type="text"
                  required
                  value={warehouseForm.name}
                  onChange={(e) => setWarehouseForm({ ...warehouseForm, name: e.target.value })}
                  className="w-full bg-[#1F2226] border border-white/10 rounded px-3 py-2 text-snow focus:outline-none focus:border-ice"
                  placeholder="Islamabad Regional Dispatch"
                />
              </div>

              <div>
                <label className="block text-silver mb-1">Facility Code *</label>
                <input
                  type="text"
                  required
                  value={warehouseForm.code}
                  onChange={(e) =>
                    setWarehouseForm({ ...warehouseForm, code: e.target.value.toUpperCase() })
                  }
                  className="w-full bg-[#1F2226] border border-white/10 rounded px-3 py-2 text-snow font-mono uppercase focus:outline-none focus:border-ice"
                  placeholder="WH-ISB-01"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-silver mb-1">City *</label>
                  <input
                    type="text"
                    required
                    value={warehouseForm.location.city}
                    onChange={(e) =>
                      setWarehouseForm({
                        ...warehouseForm,
                        location: { ...warehouseForm.location, city: e.target.value },
                      })
                    }
                    className="w-full bg-[#1F2226] border border-white/10 rounded px-3 py-2 text-snow focus:outline-none focus:border-ice"
                    placeholder="Islamabad"
                  />
                </div>
                <div>
                  <label className="block text-silver mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={warehouseForm.location.contactPerson}
                    onChange={(e) =>
                      setWarehouseForm({
                        ...warehouseForm,
                        location: { ...warehouseForm.location, contactPerson: e.target.value },
                      })
                    }
                    className="w-full bg-[#1F2226] border border-white/10 rounded px-3 py-2 text-snow focus:outline-none focus:border-ice"
                    placeholder="Logistics Lead"
                  />
                </div>
              </div>

              <div>
                <label className="block text-silver mb-1">Address *</label>
                <input
                  type="text"
                  required
                  value={warehouseForm.location.address}
                  onChange={(e) =>
                    setWarehouseForm({
                      ...warehouseForm,
                      location: { ...warehouseForm.location, address: e.target.value },
                    })
                  }
                  className="w-full bg-[#1F2226] border border-white/10 rounded px-3 py-2 text-snow focus:outline-none focus:border-ice"
                  placeholder="Sector I-9/3 Industrial Area"
                />
              </div>

              <div className="pt-3 border-t border-white/10 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsWarehouseModalOpen(false)}
                  className="px-4 py-2 border border-white/20 text-snow rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={warehouseSubmitting}
                  className="px-5 py-2 bg-burgundy hover:bg-burgundy/90 text-snow uppercase tracking-wider text-[11px] font-medium rounded transition"
                >
                  {warehouseSubmitting ? 'Registering...' : 'Add Facility'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminInventory;
