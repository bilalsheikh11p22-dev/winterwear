import React, { useState, useEffect } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  X,
  Loader2,
  AlertTriangle,
  Check,
  Video,
  Calendar,
  Link as LinkIcon,
  Tag,
  Play,
  Globe,
} from 'lucide-react';
import { campaignApi } from '../../services/api';
import { InlineLoader } from '../../components/common/Loader';

const SECTION_OPTIONS = [
  { value: 'homepage_hero', label: 'Homepage Hero' },
  { value: 'promotional_editorial', label: 'Promotional / Editorial' },
  { value: 'brand_story', label: 'Brand Story' },
  { value: 'lookbook', label: 'Lookbook' },
  { value: 'seasonal', label: 'Seasonal' },
  { value: 'product_launch', label: 'Product Launch' },
  { value: 'collaboration', label: 'Collaboration' },
];

const INITIAL_FORM = {
  title: '',
  slug: '',
  description: '',
  targetSection: 'promotional_editorial',
  isActive: true,
  isFeatured: false,
  startDate: '',
  endDate: '',
  ctaText: '',
  ctaLink: '',
  videoUrl: '',
  posterUrl: '',
  videoDuration: '',
  autoplay: true,
  loop: true,
  muted: true,
};

const slugify = (str) =>
  str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const CampaignFormModal = ({ campaign, onClose, onSaved }) => {
  const [form, setForm] = useState(
    campaign
      ? {
          title: campaign.title || '',
          slug: campaign.slug || '',
          description: campaign.description || '',
          targetSection: campaign.targetSection || 'promotional_editorial',
          isActive: campaign.isActive !== false,
          isFeatured: campaign.isFeatured === true,
          startDate: campaign.startDate ? campaign.startDate.slice(0, 10) : '',
          endDate: campaign.endDate ? campaign.endDate.slice(0, 10) : '',
          ctaText: campaign.ctaText || '',
          ctaLink: campaign.ctaLink || '',
          videoUrl: campaign.video?.secureUrl || '',
          posterUrl: campaign.video?.posterUrl || '',
          videoDuration: campaign.video?.duration || '',
          autoplay: campaign.video?.autoplay !== false,
          loop: campaign.video?.loop !== false,
          muted: campaign.video?.muted !== false,
        }
      : { ...INITIAL_FORM }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleTitleChange = (e) => {
    const title = e.target.value;
    setForm((prev) => ({
      ...prev,
      title,
      slug: campaign ? prev.slug : slugify(title),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        title: form.title,
        slug: form.slug,
        description: form.description,
        targetSection: form.targetSection,
        isActive: form.isActive,
        isFeatured: form.isFeatured,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
        ctaText: form.ctaText || undefined,
        ctaLink: form.ctaLink || undefined,
        video: form.videoUrl
          ? {
              secureUrl: form.videoUrl,
              posterUrl: form.posterUrl || undefined,
              duration: form.videoDuration ? Number(form.videoDuration) : undefined,
              autoplay: form.autoplay,
              loop: form.loop,
              muted: form.muted,
            }
          : undefined,
      };
      if (campaign?._id) {
        await campaignApi.updateCampaign(campaign._id, payload);
      } else {
        await campaignApi.createCampaign(payload);
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save campaign.');
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
            {campaign ? 'Edit Campaign' : 'Create New Campaign'}
          </h2>
          <button onClick={onClose} className="text-silver hover:text-snow transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-sm">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Title + Slug */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-silver mb-1.5">
                Campaign Title <span className="text-red-400">*</span>
              </label>
              <input
                name="title"
                value={form.title}
                onChange={handleTitleChange}
                required
                className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-snow text-sm focus:outline-none focus:border-ice/50"
                placeholder="e.g. Alpine Summit 2026"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-silver mb-1.5">
                Slug <span className="text-red-400">*</span>
              </label>
              <input
                name="slug"
                value={form.slug}
                onChange={handleChange}
                required
                className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-snow text-sm font-mono focus:outline-none focus:border-ice/50"
                placeholder="alpine-summit-2026"
              />
            </div>
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
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-snow text-sm focus:outline-none focus:border-ice/50 resize-none"
              placeholder="Editorial copy for the campaign section…"
            />
          </div>

          {/* Target Section */}
          <div>
            <label className="block text-xs uppercase tracking-wider text-silver mb-1.5">
              Target Section <span className="text-red-400">*</span>
            </label>
            <select
              name="targetSection"
              value={form.targetSection}
              onChange={handleChange}
              className="w-full bg-[#17191C] border border-white/10 rounded px-3 py-2 text-snow text-sm focus:outline-none focus:border-ice/50"
            >
              {SECTION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
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
                placeholder="Discover the Collection"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-silver mb-1.5">
                CTA Link
              </label>
              <input
                name="ctaLink"
                value={form.ctaLink}
                onChange={handleChange}
                className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-snow text-sm focus:outline-none focus:border-ice/50"
                placeholder="/shop?category=puffer-jackets"
              />
            </div>
          </div>

          {/* Video Section */}
          <div className="border border-white/10 rounded-lg p-4 space-y-4">
            <h3 className="text-xs uppercase tracking-wider text-ice font-semibold flex items-center gap-2">
              <Video className="w-4 h-4" />
              Campaign Video
            </h3>
            <div>
              <label className="block text-xs uppercase tracking-wider text-silver mb-1.5">
                Video URL (Cloudinary)
              </label>
              <input
                name="videoUrl"
                value={form.videoUrl}
                onChange={handleChange}
                className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-snow text-sm focus:outline-none focus:border-ice/50"
                placeholder="https://res.cloudinary.com/…/video/upload/…"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-silver mb-1.5">
                Poster / Thumbnail URL
              </label>
              <input
                name="posterUrl"
                value={form.posterUrl}
                onChange={handleChange}
                className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-snow text-sm focus:outline-none focus:border-ice/50"
                placeholder="https://res.cloudinary.com/…/image/upload/…"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-silver mb-1.5">
                Duration (seconds)
              </label>
              <input
                type="number"
                name="videoDuration"
                value={form.videoDuration}
                onChange={handleChange}
                min="0"
                className="w-32 bg-white/5 border border-white/10 rounded px-3 py-2 text-snow text-sm focus:outline-none focus:border-ice/50"
                placeholder="e.g. 30"
              />
            </div>
            <div className="flex flex-wrap gap-6">
              {[
                { name: 'autoplay', label: 'Autoplay' },
                { name: 'loop', label: 'Loop' },
                { name: 'muted', label: 'Muted' },
              ].map(({ name, label }) => (
                <label key={name} className="flex items-center gap-2 cursor-pointer text-sm text-silver">
                  <input
                    type="checkbox"
                    name={name}
                    checked={form[name]}
                    onChange={handleChange}
                    className="w-4 h-4 accent-[#C9DDE8]"
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          {/* Scheduling */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-silver mb-1.5">Start Date</label>
              <input
                type="date"
                name="startDate"
                value={form.startDate}
                onChange={handleChange}
                className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-snow text-sm focus:outline-none focus:border-ice/50"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-silver mb-1.5">End Date</label>
              <input
                type="date"
                name="endDate"
                value={form.endDate}
                onChange={handleChange}
                className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-snow text-sm focus:outline-none focus:border-ice/50"
              />
            </div>
          </div>

          {/* Toggles */}
          <div className="flex gap-8">
            <label className="flex items-center gap-2 cursor-pointer text-sm text-silver">
              <input
                type="checkbox"
                name="isActive"
                checked={form.isActive}
                onChange={handleChange}
                className="w-4 h-4 accent-[#C9DDE8]"
              />
              Active
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm text-silver">
              <input
                type="checkbox"
                name="isFeatured"
                checked={form.isFeatured}
                onChange={handleChange}
                className="w-4 h-4 accent-[#762B3D]"
              />
              Featured
            </label>
          </div>

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
              {saving ? 'Saving…' : campaign ? 'Update Campaign' : 'Create Campaign'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const AdminCampaigns = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [filterSection, setFilterSection] = useState('all');

  const fetchCampaigns = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await campaignApi.listAllCampaigns();
      setCampaigns(res.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load campaigns.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const handleSaved = () => {
    setShowModal(false);
    setEditingCampaign(null);
    fetchCampaigns();
    showSuccess('Campaign saved successfully.');
  };

  const handleDeleteConfirm = async () => {
    if (!confirmDeleteId) return;
    setDeletingId(confirmDeleteId);
    setConfirmDeleteId(null);
    try {
      await campaignApi.deleteCampaign(confirmDeleteId);
      setCampaigns((prev) => prev.filter((c) => c._id !== confirmDeleteId));
      showSuccess('Campaign deleted.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete campaign.');
    } finally {
      setDeletingId(null);
    }
  };

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const filteredCampaigns =
    filterSection === 'all'
      ? campaigns
      : campaigns.filter((c) => c.targetSection === filterSection);

  return (
    <div className="min-h-screen bg-[#17191C] text-snow">
      {/* Top Bar */}
      <div className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-snow">Campaign Management</h1>
          <p className="text-xs text-silver mt-0.5">
            Manage editorial campaigns, video sections, and brand story content.
          </p>
        </div>
        <button
          onClick={() => { setEditingCampaign(null); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-ice text-charcoal text-sm font-semibold rounded hover:bg-ice/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Campaign
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

      {/* Section Filters */}
      <div className="px-6 pt-6 pb-2 flex flex-wrap gap-2">
        <button
          onClick={() => setFilterSection('all')}
          className={`px-3 py-1.5 text-xs rounded font-medium transition-colors ${
            filterSection === 'all' ? 'bg-ice text-charcoal' : 'bg-white/5 text-silver hover:text-snow'
          }`}
        >
          All Sections
        </button>
        {SECTION_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setFilterSection(opt.value)}
            className={`px-3 py-1.5 text-xs rounded font-medium transition-colors ${
              filterSection === opt.value
                ? 'bg-ice text-charcoal'
                : 'bg-white/5 text-silver hover:text-snow'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Campaign List */}
      <div className="p-6">
        {loading ? (
          <InlineLoader label="Loading campaigns" />
        ) : filteredCampaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-silver">
            <Video className="w-10 h-10 opacity-30" />
            <p className="text-sm">No campaigns found. Create your first campaign.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredCampaigns.map((campaign) => (
              <div
                key={campaign._id}
                className="bg-white/3 border border-white/8 rounded-lg p-4 flex items-start gap-4 hover:border-white/15 transition-colors"
              >
                {/* Poster / Video indicator */}
                <div className="w-20 h-14 rounded overflow-hidden bg-white/5 flex-shrink-0 relative">
                  {campaign.video?.posterUrl ? (
                    <>
                      <img
                        src={campaign.video.posterUrl}
                        alt={campaign.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Play className="w-5 h-5 text-white drop-shadow-lg" />
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Video className="w-6 h-6 text-silver/30" />
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-semibold text-snow">{campaign.title}</h3>
                      <p className="text-[11px] font-mono text-silver/60 mt-0.5">/{campaign.slug}</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {campaign.isFeatured && (
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-burgundy/20 text-burgundy-light border border-burgundy/30">
                          Featured
                        </span>
                      )}
                      {campaign.isActive ? (
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
                      <Globe className="w-3 h-3" />
                      {SECTION_OPTIONS.find((o) => o.value === campaign.targetSection)?.label ||
                        campaign.targetSection}
                    </span>
                    {campaign.ctaLink && (
                      <span className="flex items-center gap-1">
                        <LinkIcon className="w-3 h-3" />
                        {campaign.ctaLink}
                      </span>
                    )}
                    {campaign.video?.secureUrl && (
                      <span className="flex items-center gap-1 text-ice">
                        <Video className="w-3 h-3" />
                        Video attached
                      </span>
                    )}
                    {(campaign.startDate || campaign.endDate) && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {campaign.startDate
                          ? new Date(campaign.startDate).toLocaleDateString()
                          : '—'}
                        {' → '}
                        {campaign.endDate
                          ? new Date(campaign.endDate).toLocaleDateString()
                          : '—'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => { setEditingCampaign(campaign); setShowModal(true); }}
                    className="p-1.5 rounded text-silver hover:text-snow hover:bg-white/10 transition-colors"
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(campaign._id)}
                    disabled={deletingId === campaign._id}
                    className="p-1.5 rounded text-silver hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40"
                    title="Delete"
                  >
                    {deletingId === campaign._id ? (
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
        <CampaignFormModal
          campaign={editingCampaign}
          onClose={() => { setShowModal(false); setEditingCampaign(null); }}
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
                <h3 className="text-sm font-semibold text-snow">Delete Campaign?</h3>
                <p className="text-xs text-silver mt-1">
                  This action cannot be undone. The campaign will be permanently removed.
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

export default AdminCampaigns;
