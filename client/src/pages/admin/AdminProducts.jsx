import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { productApi } from '../../services/api';
import ImageUploadField from '../../components/admin/ImageUploadField';
import {
  Package,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  RefreshCw,
  X,
  Layers,
  Tag,
  DollarSign,
  AlertCircle,
  Image as ImageIcon,
} from 'lucide-react';

const GENDER_TO_API = {
  men: "Men's Collection",
  women: "Women's Collection",
  unisex: 'Unisex Collection',
  kids: "Kids' Collection",
};
const GENDER_FROM_API = Object.fromEntries(Object.entries(GENDER_TO_API).map(([k, v]) => [v, k]));
const SIZE_OPTIONS = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'One Size'];
const MAX_IMAGES = 6;

const slugify = (text) =>
  String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const AdminProducts = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  // Form State
  const initialForm = {
    name: '',
    subtitle: '',
    description: '',
    slug: '',
    category: '',
    collectionGender: 'unisex',
    regularPrice: '',
    salePrice: '',
    sku: '',
    stockQuantity: '',
    isPublished: true,
    fabric: '',
    tags: '',
    images: [{ url: '', public_id: '' }],
    variants: [
      { size: 'M', color: { name: 'Charcoal', hex: '#17191C' }, sku: '', stock: 10 },
    ],
  };
  const [formData, setFormData] = useState(initialForm);

  const fetchCategories = async () => {
    try {
      const res = await productApi.getCategories();
      setCategories(res.data?.data || []);
    } catch (err) {
      console.error('[Categories Error]', err);
    }
  };

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: 12,
        includeUnpublished: true,
      };
      if (search) params.search = search;
      if (categoryFilter) params.category = categoryFilter;

      const res = await productApi.getProducts(params);
      setProducts(res.data?.data || []);
      setTotalPages(res.data?.meta?.pages || 1);
    } catch (err) {
      console.error('[Products Load Error]', err);
    } finally {
      setLoading(false);
    }
  }, [page, search, categoryFilter]);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const handleOpenCreate = () => {
    setEditingProduct(null);
    setFormData(initialForm);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p) => {
    setEditingProduct(p);
    setFormData({
      name: p.name || '',
      subtitle: p.subtitle || '',
      description: p.description || '',
      slug: p.slug || '',
      category: p.category?._id || p.category || '',
      collectionGender: GENDER_FROM_API[p.collectionGender] || p.collectionGender || 'unisex',
      regularPrice: p.regularPrice || '',
      salePrice: p.salePrice || '',
      sku: p.sku || '',
      stockQuantity: p.stockQuantity ?? '',
      isPublished: p.isPublished ?? true,
      fabric: p.fabric || '',
      tags: Array.isArray(p.tags) ? p.tags.join(', ') : '',
      images: p.images?.length
        ? p.images.map((img) => ({ url: img.url, public_id: img.public_id, altText: img.altText || img.alt || '' }))
        : [{ url: '', public_id: '' }],
      variants: p.variants?.length
        ? p.variants
        : [{ size: 'M', color: { name: 'Charcoal', hex: '#17191C' }, sku: '', stock: 10 }],
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to archive or remove '${name}'?`)) return;
    try {
      await productApi.deleteProduct(id);
      showToast(`Piece '${name}' status updated.`);
      fetchProducts();
    } catch (err) {
      alert(err.response?.data?.message || 'Error deleting piece');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormError('');

    try {
      const regularPrice = Number(formData.regularPrice);
      const salePrice = formData.salePrice ? Number(formData.salePrice) : null;
      const baseSku = String(formData.sku || '').toUpperCase();

      const images = formData.images
        .filter((img) => img.url)
        .map((img, i) => ({
          public_id: img.public_id || `external/${slugify(formData.name) || 'product'}-${Date.now()}-${i}`,
          url: img.url,
          isPrimary: i === 0,
          altText: img.altText || formData.name,
        }));

      const variants = formData.variants
        .filter((v) => v.size && v.color?.name)
        .map((v) => ({
          sku:
            v.sku ||
            `${baseSku}-${String(v.size).replace(/\s+/g, '')}-${String(v.color.name).replace(/\s+/g, '').slice(0, 3)}`.toUpperCase(),
          size: v.size,
          color: { name: v.color.name, hex: v.color.hex || '#17191C' },
          price: Number(v.price) || regularPrice,
          salePrice: v.salePrice ? Number(v.salePrice) : salePrice,
          stock: Number(v.stock) || 0,
        }));

      const payload = {
        name: formData.name,
        description: formData.description,
        slug: formData.slug || (editingProduct ? undefined : slugify(formData.name)),
        category: formData.category,
        collectionGender: GENDER_TO_API[formData.collectionGender] || undefined,
        regularPrice,
        salePrice,
        sku: baseSku,
        stockQuantity: Number(formData.stockQuantity),
        isPublished: formData.isPublished,
        tags: formData.tags
          ? formData.tags.split(',').map((t) => t.trim()).filter(Boolean)
          : [],
        images,
        variants,
      };
      if (formData.subtitle) payload.shortDescription = formData.subtitle.slice(0, 300);

      if (!payload.category) {
        throw new Error('Please select a garment category.');
      }

      if (editingProduct) {
        await productApi.updateProduct(editingProduct._id, payload);
        showToast('Garment updated successfully.');
      } else {
        await productApi.createProduct(payload);
        showToast('New garment piece cataloged.');
      }

      setIsModalOpen(false);
      fetchProducts();
    } catch (err) {
      setFormError(err.response?.data?.message || err.message || 'Error saving product piece.');
    } finally {
      setSaving(false);
    }
  };

  const addVariantRow = () => {
    setFormData((prev) => ({
      ...prev,
      variants: [
        ...prev.variants,
        { size: 'L', color: { name: 'Snow White', hex: '#F8F7F4' }, sku: '', stock: 10 },
      ],
    }));
  };

  const removeVariantRow = (index) => {
    setFormData((prev) => ({
      ...prev,
      variants: prev.variants.filter((_, idx) => idx !== index),
    }));
  };

  const updateVariant = (index, field, value) => {
    setFormData((prev) => {
      const updated = [...prev.variants];
      if (field.startsWith('color.')) {
        const sub = field.split('.')[1];
        updated[index].color = { ...updated[index].color, [sub]: value };
      } else {
        updated[index][field] = value;
      }
      return { ...prev, variants: updated };
    });
  };

  return (
    <AdminLayout
      title="Product Catalog & Variants"
      subtitle="Comprehensive inventory of WinterWear garments, pricing, and sizing"
    >
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-burgundy border border-white/20 text-snow px-4 py-2.5 rounded shadow-lg text-xs flex items-center gap-2">
          <CheckCircle size={14} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Control Bar */}
      <div className="bg-[#17191C] border border-white/10 p-4 rounded-sm mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1 max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-silver" />
            <input
              type="text"
              placeholder="Search by title, SKU, tags..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#1F2226] border border-white/10 rounded pl-9 pr-3 py-1.5 text-xs text-snow focus:outline-none focus:border-ice"
            />
          </div>

          <div className="relative">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-[#1F2226] border border-white/10 rounded px-3 py-1.5 text-xs text-snow focus:outline-none focus:border-ice"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c._id} value={c.slug || c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchProducts}
            className="p-1.5 bg-white/5 hover:bg-white/10 text-silver hover:text-snow border border-white/10 rounded text-xs transition"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-1.5 bg-burgundy hover:bg-burgundy/90 text-snow text-xs tracking-wider uppercase font-medium rounded transition"
          >
            <Plus size={15} /> Add Piece
          </button>
        </div>
      </div>

      {/* Catalog Table */}
      <div className="bg-[#17191C] border border-white/10 rounded-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#1F2226] text-[10px] uppercase tracking-wider text-silver border-b border-white/10">
              <tr>
                <th className="py-3 px-4">Garment</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">SKU</th>
                <th className="py-3 px-4">Price</th>
                <th className="py-3 px-4 text-center">Stock</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-silver">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-silver/60">
                    <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-ice" />
                    Synchronizing collection archive...
                  </td>
                </tr>
              ) : products.length > 0 ? (
                products.map((p) => (
                  <tr key={p._id} className="hover:bg-white/5 transition">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        {p.images?.[0]?.url ? (
                          <img
                            src={p.images[0].url}
                            alt={p.name}
                            className="w-9 h-9 object-cover rounded bg-white/5"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded bg-white/5 flex items-center justify-center text-xs text-ice">
                            W
                          </div>
                        )}
                        <div>
                          <p className="font-serif text-snow font-medium truncate max-w-[200px]">
                            {p.name}
                          </p>
                          <span className="text-[10px] text-silver/70 capitalize block">
                            {p.collectionGender}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-snow font-medium">
                      {p.category?.name || 'Unassigned'}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-ice">{p.sku}</td>
                    <td className="py-3 px-4">
                      <div className="text-snow font-medium">
                        PKR {Number(p.salePrice || p.regularPrice).toLocaleString()}
                      </div>
                      {p.salePrice && p.salePrice < p.regularPrice && (
                        <span className="line-through text-[10px] text-silver/60">
                          PKR {Number(p.regularPrice).toLocaleString()}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          p.stockQuantity === 0
                            ? 'bg-red-500/20 text-red-400'
                            : p.stockQuantity < 10
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-emerald-500/20 text-emerald-400'
                        }`}
                      >
                        {p.stockQuantity} units
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] uppercase font-semibold ${
                          p.isPublished
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-white/5 text-silver border border-white/10'
                        }`}
                      >
                        {p.isPublished ? 'Published' : 'Draft'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEdit(p)}
                          className="p-1.5 text-silver hover:text-ice hover:bg-white/5 rounded transition"
                          title="Edit Piece"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(p._id, p.name)}
                          className="p-1.5 text-silver hover:text-red-400 hover:bg-red-500/10 rounded transition"
                          title="Archive / Remove"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-silver/60">
                    No garments matching the query.
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

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#17191C] border border-white/15 rounded-sm max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div>
                <h2 className="text-base font-serif text-snow tracking-wide">
                  {editingProduct ? 'Edit Garment Piece' : 'Catalog New Garment'}
                </h2>
                <p className="text-[11px] text-silver/70">
                  Update inventory metadata, sizing, color variants, and publication status
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-silver hover:text-snow p-1"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
              {formError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-300 rounded flex items-center gap-2">
                  <AlertCircle size={15} />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-silver mb-1">Title / Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-[#1F2226] border border-white/10 rounded px-3 py-2 text-snow focus:outline-none focus:border-ice"
                    placeholder="Cashmere Overcoat"
                  />
                </div>
                <div>
                  <label className="block text-silver mb-1">Subtitle</label>
                  <input
                    type="text"
                    value={formData.subtitle}
                    onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                    className="w-full bg-[#1F2226] border border-white/10 rounded px-3 py-2 text-snow focus:outline-none focus:border-ice"
                    placeholder="Italian Wool & Silk Lining"
                  />
                </div>
              </div>

              <div>
                <label className="block text-silver mb-1">Description</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-[#1F2226] border border-white/10 rounded px-3 py-2 text-snow focus:outline-none focus:border-ice"
                  placeholder="Tailored silhouette engineered for sub-zero climates..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-silver mb-1">Category *</label>
                  <select
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-[#1F2226] border border-white/10 rounded px-3 py-2 text-snow focus:outline-none focus:border-ice"
                  >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-silver mb-1">Collection</label>
                  <select
                    value={formData.collectionGender}
                    onChange={(e) =>
                      setFormData({ ...formData, collectionGender: e.target.value })
                    }
                    className="w-full bg-[#1F2226] border border-white/10 rounded px-3 py-2 text-snow focus:outline-none focus:border-ice"
                  >
                    <option value="men">Men's Atelier</option>
                    <option value="women">Women's Atelier</option>
                    <option value="unisex">Unisex / Neutral</option>
                  </select>
                </div>
                <div>
                  <label className="block text-silver mb-1">SKU *</label>
                  <input
                    type="text"
                    required
                    value={formData.sku}
                    onChange={(e) =>
                      setFormData({ ...formData, sku: e.target.value.toUpperCase() })
                    }
                    className="w-full bg-[#1F2226] border border-white/10 rounded px-3 py-2 text-snow font-mono focus:outline-none focus:border-ice uppercase"
                    placeholder="WW-COAT-01"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-silver mb-1">Regular Price (PKR) *</label>
                  <input
                    type="number"
                    required
                    value={formData.regularPrice}
                    onChange={(e) => setFormData({ ...formData, regularPrice: e.target.value })}
                    className="w-full bg-[#1F2226] border border-white/10 rounded px-3 py-2 text-snow focus:outline-none focus:border-ice"
                    placeholder="25000"
                  />
                </div>
                <div>
                  <label className="block text-silver mb-1">Sale Price (Optional)</label>
                  <input
                    type="number"
                    value={formData.salePrice}
                    onChange={(e) => setFormData({ ...formData, salePrice: e.target.value })}
                    className="w-full bg-[#1F2226] border border-white/10 rounded px-3 py-2 text-snow focus:outline-none focus:border-ice"
                    placeholder="22000"
                  />
                </div>
                <div>
                  <label className="block text-silver mb-1">Total Stock Quantity *</label>
                  <input
                    type="number"
                    required
                    value={formData.stockQuantity}
                    onChange={(e) => setFormData({ ...formData, stockQuantity: e.target.value })}
                    className="w-full bg-[#1F2226] border border-white/10 rounded px-3 py-2 text-snow focus:outline-none focus:border-ice"
                    placeholder="50"
                  />
                </div>
              </div>

              {/* Product images — upload from the computer */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-silver font-medium">
                    Product Images <span className="text-silver/60">(first image is the main photo)</span>
                  </span>
                  {formData.images.length < MAX_IMAGES && (
                    <button
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({ ...prev, images: [...prev.images, { url: '', public_id: '' }] }))
                      }
                      className="text-ice hover:underline flex items-center gap-1 text-[11px]"
                    >
                      <Plus size={12} /> Add Image
                    </button>
                  )}
                </div>
                {formData.images.map((img, idx) => (
                  <div key={idx} className="relative">
                    <ImageUploadField
                      label={idx === 0 ? 'Main Image' : `Image ${idx + 1}`}
                      category="product"
                      altText={formData.name}
                      value={img.url}
                      onChange={(url, asset) =>
                        setFormData((prev) => {
                          const images = [...prev.images];
                          images[idx] = {
                            url,
                            public_id: asset?.publicId || asset?.public_id || '',
                            altText: prev.name,
                          };
                          return { ...prev, images };
                        })
                      }
                    />
                    {formData.images.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({ ...prev, images: prev.images.filter((_, i) => i !== idx) }))
                        }
                        className="absolute top-0 right-0 text-[11px] text-silver hover:text-red-400 flex items-center gap-1"
                      >
                        <Trash2 size={12} /> Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Variants Section */}
              <div className="pt-2 border-t border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-silver font-medium">Garment Variants (Size & Color)</span>
                  <button
                    type="button"
                    onClick={addVariantRow}
                    className="text-ice hover:underline flex items-center gap-1 text-[11px]"
                  >
                    <Plus size={12} /> Add Variant
                  </button>
                </div>

                <div className="space-y-2">
                  {formData.variants.map((v, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 bg-[#1F2226] border border-white/5 rounded grid grid-cols-1 sm:grid-cols-5 gap-2 items-center"
                    >
                      <div>
                        <select
                          value={v.size}
                          onChange={(e) => updateVariant(idx, 'size', e.target.value)}
                          className="w-full bg-[#17191C] border border-white/10 rounded px-2 py-1 text-snow text-xs"
                        >
                          {SIZE_OPTIONS.map((sz) => (
                            <option key={sz} value={sz}>
                              {sz}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <input
                          type="text"
                          placeholder="Color Name"
                          value={v.color?.name || ''}
                          onChange={(e) => updateVariant(idx, 'color.name', e.target.value)}
                          className="w-full bg-[#17191C] border border-white/10 rounded px-2 py-1 text-snow text-xs"
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="color"
                          value={v.color?.hex || '#17191C'}
                          onChange={(e) => updateVariant(idx, 'color.hex', e.target.value)}
                          className="w-7 h-7 bg-transparent cursor-pointer rounded"
                        />
                        <span className="text-[10px] font-mono text-silver truncate">
                          {v.color?.hex}
                        </span>
                      </div>
                      <div>
                        <input
                          type="number"
                          placeholder="Variant Stock"
                          value={v.stock}
                          onChange={(e) => updateVariant(idx, 'stock', Number(e.target.value))}
                          className="w-full bg-[#17191C] border border-white/10 rounded px-2 py-1 text-snow text-xs"
                        />
                      </div>
                      <div className="flex items-center justify-end">
                        {formData.variants.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeVariantRow(idx)}
                            className="p-1 text-silver hover:text-red-400"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Publication Status */}
              <div className="pt-2 flex items-center justify-between border-t border-white/10">
                <span className="text-silver">Publish to Public Storefront</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isPublished}
                    onChange={(e) =>
                      setFormData({ ...formData, isPublished: e.target.checked })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-burgundy"></div>
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-white/10 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-white/20 hover:border-white text-snow rounded transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-burgundy hover:bg-burgundy/90 disabled:opacity-50 text-snow uppercase tracking-widest text-[11px] font-medium rounded transition flex items-center gap-2"
                >
                  {saving && <RefreshCw size={13} className="animate-spin" />}
                  <span>{editingProduct ? 'Save Changes' : 'Catalog Piece'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminProducts;
