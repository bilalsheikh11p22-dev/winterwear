import React, { useState, useEffect } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  X,
  Loader2,
  AlertTriangle,
  Check,
  Image as ImageIcon,
  Calendar,
  Link as LinkIcon,
  Tag,
  Monitor,
  Smartphone,
} from 'lucide-react';
import { bannerApi } from '../../services/api';
import { InlineLoader } from '../../components/common/Loader';
import ImageUploadField from '../../components/admin/ImageUploadField';

const PLACEMENT_OPTIONS = [
  { value: 'hero', label: 'Hero (Homepage)' },
  { value: 'seasonal_sale', label: 'Seasonal Sale Banners' },
  { value: 'category_top', label: 'Category Page Top' },
  { value: 'announcement', label: 'Announcement Bar' },
  { value: 'promotional_strip', label: 'Promotional Strip' },
  { value: 'sidebar', label: 'Sidebar' },
  { value: 'cart_upsell', label: 'Cart Upsell' },
  { value: 'checkout', label: 'Checkout Page' },
  { value: 'email', label: 'Email Banner' },
];

const INITIAL_FORM = {
  headline: '',
  description: '',
  ctaText: '',
  ctaLink: '',
  placement: 'hero',
  isActive: true,
  startDate: '',
  endDate: '',
  discountCode: '',
  mediaUrl: '',
  altText: '',
};

const BannerFormModal = ({ banner, onClose, onSaved }) => {
  const [form, setForm] = useState(
    banner
      ? {
          headline: banner.headline || '',
          description: banner.description || '',
          ctaText: banner.ctaText || '',
          ctaLink: banner.ctaLink || '',
          placement: banner.placement || 'hero',
          isActive: banner.isActive !== false,
          startDate: banner.startDate ? banner.startDate.slice(0, 10) : '',
          endDate: banner.endDate ? banner.endDate.slice(0, 10) : '',
          discountCode: banner.discountCode || '',
          mediaUrl: banner.desktopMedia?.url || banner.mediaUrl || '',
          altText: banner.desktopMedia?.altText || banner.altText || '',
        }
      : { ...INITIAL_FORM }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      // Tidy the CTA link: trim spaces and turn "shop" into "/shop"
      let ctaLink = (form.ctaLink || '').trim();
      if (ctaLink && !ctaLink.startsWith('/') && !/^https:\/\//i.test(ctaLink) && !/^[a-z][a-z0-9+.-]*:/i.test(ctaLink)) {
        ctaLink = `/${ctaLink}`;
      }
      const payload = {
        ...form,
        ctaLink,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
        discountCode: form.discountCode || undefined,
        desktopMedia: form.mediaUrl ? { url: form.mediaUrl, altText: form.altText } : undefined,
      };
      if (banner?._id) {
        await bannerApi.updateBanner(banner._id, payload);
      } else {
        await bannerApi.createBanner(payload);
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save banner.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#1e2024] border border-white/10 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-lg font-semibold text-snow">
            {banner ? 'Edit Banner' : 'Create New Banner'}
          </h2>
          <button onClick={onClose} className="text-silver hover:text-snow transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-sm">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Headline */}
          <div>
            <label className="block text-xs uppercase tracking-wider text-silver mb-1.5">
              Headline <span className="text-red-400">*</span>
            </label>
            <input
              name="headline"
              value={form.headline}
              onChange={handleChange}
              required
              className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-snow text-sm focus:outline-none focus:border-ice/50"
              placeholder="e.g. Winter Clearance — Up to 60% Off"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs uppercase tracking-wider text-silver mb-1.5">
              Description
            </label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={2}
              className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-snow text-sm focus:outline-none focus:border-ice/50 resize-none"
              placeholder="Optional supporting copy"
            />
          </div>

          {/* CTA */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-silver mb-1.5">
                CTA Button Text
              </label>
              <input
                name="ctaText"
                value={form.ctaText}
                onChange={handleChange}
                className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-snow text-sm focus:outline-none focus:border-ice/50"
                placeholder="e.g. Shop Now"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-silver mb-1.5">
                CTA Link <span className="text-xs text-silver/60">(relative path)</span>
              </label>
              <input
                name="ctaLink"
                value={form.ctaLink}
                onChange={handleChange}
                className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-snow text-sm focus:outline-none focus:border-ice/50"
                placeholder="/shop?sale=true"
              />
            </div>
          </div>

          {/* Placement */}
          <div>
            <label className="block text-xs uppercase tracking-wider text-silver mb-1.5">
              Placement <span className="text-red-400">*</span>
            </label>
            <select
              name="placement"
              value={form.placement}
              onChange={handleChange}
              required
              className="w-full bg-[#17191C] border border-white/10 rounded px-3 py-2 text-snow text-sm focus:outline-none focus:border-ice/50"
            >
              {PLACEMENT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Banner image (upload from computer) */}
          <ImageUploadField
            label="Desktop Banner Image"
            category="banner"
            altText={form.altText}
            value={form.mediaUrl}
            onChange={(url) => setForm((prev) => ({ ...prev, mediaUrl: url }))}
            hint="Recommended 1920×900 · JPG, PNG, WebP or AVIF, up to 10 MB."
          />

          {/* Alt Text */}
          <div>
            <label className="block text-xs uppercase tracking-wider text-silver mb-1.5">
              Image Alt Text
            </label>
            <input
              name="altText"
              value={form.altText}
              onChange={handleChange}
              className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-snow text-sm focus:outline-none focus:border-ice/50"
              placeholder="Descriptive alt text for accessibility"
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-silver mb-1.5">
                Start Date
              </label>
              <input
                type="date"
                name="startDate"
                value={form.startDate}
                onChange={handleChange}
                className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-snow text-sm focus:outline-none focus:border-ice/50"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-silver mb-1.5">
                End Date
              </label>
              <input
                type="date"
                name="endDate"
                value={form.endDate}
                onChange={handleChange}
                className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-snow text-sm focus:outline-none focus:border-ice/50"
              />
            </div>
          </div>

          {/* Discount Code */}
          <div>
            <label className="block text-xs uppercase tracking-wider text-silver mb-1.5">
              Linked Discount Code
            </label>
            <input
              name="discountCode"
              value={form.discountCode}
              onChange={handleChange}
              className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-snow text-sm focus:outline-none focus:border-ice/50 uppercase"
              placeholder="e.g. WINTER25"
            />
          </div>

          {/* isActive toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              name="isActive"
              checked={form.isActive}
              onChange={handleChange}
              className="w-4 h-4 accent-[#C9DDE8]"
            />
            <span className="text-sm text-silver">Active (visible to customers)</span>
          </label>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 text-sm text-silver hover:text-snow border border-white/10 hover:border-white/30 rounded transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-sm font-semibold bg-ice text-charcoal rounded hover:bg-ice/90 transition-colors disabled:opacity-60 flex items-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {saving ? 'Saving…' : banner ? 'Update Banner' : 'Create Banner'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const AdminBanners = () => {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [filterPlacement, setFilterPlacement] = useState('all');

  const fetchBanners = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await bannerApi.listAllBanners();
      setBanners(res.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load banners.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  const handleSaved = () => {
    setShowModal(false);
    setEditingBanner(null);
    fetchBanners();
    showSuccess('Banner saved successfully.');
  };

  const handleDeleteConfirm = async () => {
    if (!confirmDeleteId) return;
    setDeletingId(confirmDeleteId);
    setConfirmDeleteId(null);
    try {
      await bannerApi.deleteBanner(confirmDeleteId);
      setBanners((prev) => prev.filter((b) => b._id !== confirmDeleteId));
      showSuccess('Banner deleted.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete banner.');
    } finally {
      setDeletingId(null);
    }
  };

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const openCreate = () => {
    setEditingBanner(null);
    setShowModal(true);
  };

  const openEdit = (banner) => {
    setEditingBanner(banner);
    setShowModal(true);
  };

  const filteredBanners = filterPlacement === 'all'
    ? banners
    : banners.filter((b) => b.placement === filterPlacement);

  return (
    <div className="min-h-screen bg-[#17191C] text-snow">
      {/* Top Bar */}
      <div className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-snow">Banner Management</h1>
          <p className="text-xs text-silver mt-0.5">
            Manage homepage hero banners, sale banners, and promotional strips.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-ice text-charcoal text-sm font-semibold rounded hover:bg-ice/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Banner
        </button>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="mx-6 mt-4 flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded">
          <Check className="w-4 h-4" />
          {successMsg}
        </div>
      )}
      {error && (
        <div className="mx-6 mt-4 flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded">
          <AlertTriangle className="w-4 h-4" />
          {error}
          <button onClick={() => setError('')} className="ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="px-6 pt-6 pb-2 flex flex-wrap gap-2">
        <button
          onClick={() => setFilterPlacement('all')}
          className={`px-3 py-1.5 text-xs rounded font-medium transition-colors ${
            filterPlacement === 'all'
              ? 'bg-ice text-charcoal'
              : 'bg-white/5 text-silver hover:text-snow'
          }`}
        >
          All Placements
        </button>
        {PLACEMENT_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setFilterPlacement(opt.value)}
            className={`px-3 py-1.5 text-xs rounded font-medium transition-colors ${
              filterPlacement === opt.value
                ? 'bg-ice text-charcoal'
                : 'bg-white/5 text-silver hover:text-snow'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Banner List */}
      <div className="p-6">
        {loading ? (
          <InlineLoader label="Loading banners" />
        ) : filteredBanners.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-silver">
            <ImageIcon className="w-10 h-10 opacity-30" />
            <p className="text-sm">No banners found. Create your first banner.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredBanners.map((banner) => (
              <div
                key={banner._id}
                className="bg-white/3 border border-white/8 rounded-lg p-4 flex items-start gap-4 hover:border-white/15 transition-colors"
              >
                {/* Thumbnail */}
                <div className="w-20 h-14 rounded overflow-hidden bg-white/5 flex-shrink-0">
                  {banner.desktopMedia?.url || banner.mediaUrl ? (
                    <img
                      src={banner.desktopMedia?.url || banner.mediaUrl}
                      alt={banner.headline}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-6 h-6 text-silver/30" />
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-semibold text-snow truncate">{banner.headline}</h3>
                      {banner.description && (
                        <p className="text-xs text-silver mt-0.5 line-clamp-1">{banner.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {banner.isActive ? (
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-green-500/15 text-green-400 border border-green-500/30">
                          Active
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-white/5 text-silver border border-white/10">
                          Inactive
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-silver/70">
                    <span className="flex items-center gap-1">
                      <Tag className="w-3 h-3" />
                      {PLACEMENT_OPTIONS.find((o) => o.value === banner.placement)?.label || banner.placement}
                    </span>
                    {banner.ctaLink && (
                      <span className="flex items-center gap-1">
                        <LinkIcon className="w-3 h-3" />
                        {banner.ctaLink}
                      </span>
                    )}
                    {(banner.startDate || banner.endDate) && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {banner.startDate ? new Date(banner.startDate).toLocaleDateString() : '—'}
                        {' → '}
                        {banner.endDate ? new Date(banner.endDate).toLocaleDateString() : '—'}
                      </span>
                    )}
                    {banner.discountCode && (
                      <span className="font-mono px-1.5 py-0.5 bg-burgundy/20 text-burgundy-light rounded text-[10px]">
                        {banner.discountCode}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => openEdit(banner)}
                    className="p-1.5 rounded text-silver hover:text-snow hover:bg-white/10 transition-colors"
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(banner._id)}
                    disabled={deletingId === banner._id}
                    className="p-1.5 rounded text-silver hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40"
                    title="Delete"
                  >
                    {deletingId === banner._id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showModal && (
        <BannerFormModal
          banner={editingBanner}
          onClose={() => {
            setShowModal(false);
            setEditingBanner(null);
          }}
          onSaved={handleSaved}
        />
      )}

      {/* Delete Confirmation */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#1e2024] border border-white/10 rounded-lg p-6 max-w-sm w-full shadow-2xl">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-semibold text-snow">Delete Banner?</h3>
                <p className="text-xs text-silver mt-1">
                  This action cannot be undone. The banner will be permanently removed.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="px-4 py-2 text-sm text-silver hover:text-snow border border-white/10 hover:border-white/30 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 text-sm font-semibold bg-red-600 hover:bg-red-500 text-white rounded transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBanners;
