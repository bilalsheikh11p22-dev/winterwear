import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  Image as ImageIcon,
  Video,
  Search,
  Filter,
  Grid,
  List,
  Copy,
  Check,
  Trash2,
  Edit2,
  ExternalLink,
  AlertTriangle,
  X,
  Loader2,
  FileText,
  RefreshCw,
  Folder,
} from 'lucide-react';
import { mediaApi } from '../../services/api';
import { InlineLoader } from '../../components/common/Loader';

const AdminMediaLibrary = () => {
  const [mediaList, setMediaList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [assetToDelete, setAssetToDelete] = useState(null);
  const [deleteReferences, setDeleteReferences] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Filters & Pagination State
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [resourceType, setResourceType] = useState('all');
  const [sort, setSort] = useState('-createdAt');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, pages: 1 });

  // Upload Form State
  const [uploadCategory, setUploadCategory] = useState('product');
  const [uploadAlt, setUploadAlt] = useState('');
  const [uploadCaption, setUploadCaption] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const fetchMedia = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const params = {
        page,
        limit: 18,
        sort,
        ...(search && { search }),
        ...(category !== 'all' && { category }),
        ...(resourceType !== 'all' && { resourceType }),
      };
      const res = await mediaApi.listMedia(params);
      setMediaList(res.data.data || []);
      setMeta(res.data.meta || { total: 0, pages: 1 });
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to load media assets.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedia();
  }, [page, category, resourceType, sort]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchMedia();
  };

  const handleFileUpload = async (files) => {
    if (!files || files.length === 0) return;
    const file = files[0];

    // Client-side validation
    const isVideo = file.type.startsWith('video/');
    const maxImg = 10 * 1024 * 1024;
    const maxVid = 50 * 1024 * 1024;

    if (!isVideo && file.size > maxImg) {
      setErrorMsg(`Image exceeds 10MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB).`);
      return;
    }
    if (isVideo && file.size > maxVid) {
      setErrorMsg(`Video exceeds 50MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB).`);
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);
      setErrorMsg(null);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', uploadCategory);
      formData.append('altText', uploadAlt);
      formData.append('caption', uploadCaption);

      await mediaApi.uploadMedia(formData, (progressEvent) => {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        setUploadProgress(percent);
      });

      setSuccessMsg(`Asset "${file.name}" uploaded successfully.`);
      setUploadAlt('');
      setUploadCaption('');
      fetchMedia();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Upload failed. Verify Cloudinary credentials.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const copyToClipboard = (url, id) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const confirmDelete = async (asset) => {
    setAssetToDelete(asset);
    try {
      const refRes = await mediaApi.getReferences(asset._id);
      setDeleteReferences(refRes.data.data);
    } catch {
      setDeleteReferences(null);
    }
  };

  const executeDelete = async () => {
    if (!assetToDelete) return;
    try {
      setIsDeleting(true);
      await mediaApi.deleteMedia(assetToDelete._id);
      setSuccessMsg(`Asset "${assetToDelete.filename}" deleted permanently.`);
      setAssetToDelete(null);
      setDeleteReferences(null);
      if (selectedAsset?._id === assetToDelete._id) {
        setSelectedAsset(null);
      }
      fetchMedia();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to delete asset. It may be in use.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUpdateMetadata = async (e) => {
    e.preventDefault();
    if (!selectedAsset) return;
    try {
      const res = await mediaApi.updateMedia(selectedAsset._id, {
        altText: selectedAsset.altText,
        caption: selectedAsset.caption,
        category: selectedAsset.category,
      });
      setSelectedAsset(res.data.data);
      setSuccessMsg('Asset metadata saved.');
      fetchMedia();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to update metadata.');
    }
  };

  return (
    <div className="min-h-screen bg-charcoal text-snow p-6 md:p-10">
      {/* Page Header */}
      <div className="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <span className="text-xs uppercase tracking-widest text-burgundy font-semibold">Atelier CMS</span>
          <h1 className="text-3xl font-serif tracking-wide text-cream mt-1">Cloudinary Media Library</h1>
          <p className="text-sm text-silver mt-1">
            Manage high-fidelity fashion galleries, editorial campaign videos, and banner assets.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-5 py-2.5 bg-burgundy hover:bg-burgundy-light text-snow text-xs tracking-wider uppercase font-medium rounded transition-all shadow-lg"
          >
            <Upload className="w-4 h-4" />
            Upload Asset
          </button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm"
            onChange={(e) => handleFileUpload(e.target.files)}
          />
        </div>
      </div>

      {/* Alert Messages */}
      {errorMsg && (
        <div className="max-w-7xl mx-auto mb-6 p-4 bg-red-950/60 border border-red-800/80 rounded flex items-center justify-between text-sm text-red-200">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-red-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="max-w-7xl mx-auto mb-6 p-4 bg-emerald-950/60 border border-emerald-800/80 rounded flex items-center justify-between text-sm text-emerald-200">
          <div className="flex items-center gap-3">
            <Check className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Upload Zone & Metadata Pre-selection */}
      <div className="max-w-7xl mx-auto mb-8 bg-charcoal-surface border border-white/10 rounded-lg p-6">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            handleFileUpload(e.dataTransfer.files);
          }}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer ${
            dragActive
              ? 'border-burgundy bg-burgundy/10'
              : 'border-white/15 hover:border-white/30 bg-charcoal/50'
          }`}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? (
            <div className="flex flex-col items-center">
              <Loader2 className="w-8 h-8 text-burgundy animate-spin mb-3" />
              <p className="text-sm font-medium text-cream">Uploading & Optimizing with Cloudinary...</p>
              <div className="w-64 bg-charcoal-light h-2 rounded-full overflow-hidden mt-3 border border-white/10">
                <div
                  className="bg-burgundy h-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <span className="text-xs text-silver mt-2">{uploadProgress}% Completed</span>
            </div>
          ) : (
            <div>
              <Upload className="w-10 h-10 text-silver mx-auto mb-3" />
              <h3 className="text-base font-medium text-cream">
                Drag and drop your editorial files here, or <span className="text-ice underline">browse</span>
              </h3>
              <p className="text-xs text-silver mt-1">
                Images (JPEG, PNG, WebP, AVIF up to 10MB) • Videos (MP4, WebM up to 50MB)
              </p>
            </div>
          )}
        </div>

        {/* Upload Category Selector */}
        <div className="mt-4 flex flex-wrap items-center gap-4 text-xs">
          <span className="text-silver uppercase tracking-wider">Assign Category:</span>
          {['product', 'banner', 'campaign', 'brand', 'lookbook', 'general'].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setUploadCategory(cat)}
              className={`px-3 py-1 rounded-full uppercase tracking-wider transition-colors ${
                uploadCategory === cat
                  ? 'bg-burgundy text-white font-medium'
                  : 'bg-charcoal text-silver hover:text-white border border-white/10'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="max-w-7xl mx-auto mb-6 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="w-4 h-4 text-silver absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by filename, public ID, tags..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-charcoal-surface border border-white/10 rounded text-sm text-snow placeholder:text-silver-dark focus:outline-none focus:border-burgundy"
          />
        </form>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Resource Type */}
          <select
            value={resourceType}
            onChange={(e) => {
              setResourceType(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-charcoal-surface border border-white/10 rounded text-xs text-cream focus:outline-none focus:border-burgundy"
          >
            <option value="all">All Media Types</option>
            <option value="image">Images Only</option>
            <option value="video">Videos Only</option>
          </select>

          {/* Category */}
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-charcoal-surface border border-white/10 rounded text-xs text-cream focus:outline-none focus:border-burgundy"
          >
            <option value="all">All Categories</option>
            <option value="product">Product Media</option>
            <option value="banner">Storefront Banners</option>
            <option value="campaign">Campaigns & Films</option>
            <option value="brand">Brand Storytelling</option>
            <option value="lookbook">Lookbooks</option>
          </select>

          {/* Sort */}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="px-3 py-2 bg-charcoal-surface border border-white/10 rounded text-xs text-cream focus:outline-none focus:border-burgundy"
          >
            <option value="-createdAt">Newest First</option>
            <option value="createdAt">Oldest First</option>
            <option value="filename">Filename (A-Z)</option>
            <option value="-bytes">Largest Size</option>
          </select>

          {/* View Mode Toggle */}
          <div className="flex items-center border border-white/10 rounded bg-charcoal-surface p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-white/10 text-cream' : 'text-silver'}`}
              aria-label="Grid view"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-white/10 text-cream' : 'text-silver'}`}
              aria-label="List view"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={fetchMedia}
            className="p-2 bg-charcoal-surface border border-white/10 hover:border-white/30 rounded text-silver hover:text-cream"
            title="Refresh assets"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Asset View */}
      <div className="max-w-7xl mx-auto">
        {loading ? (
          <InlineLoader label="Accessing Cloudinary archive" />
        ) : mediaList.length === 0 ? (
          <div className="text-center py-20 bg-charcoal-surface border border-white/10 rounded-lg">
            <Folder className="w-12 h-12 text-silver-dark mx-auto mb-3" />
            <h3 className="text-lg font-serif text-cream">No media assets located</h3>
            <p className="text-xs text-silver mt-1 max-w-sm mx-auto">
              No files match your search criteria or category filter. Upload high-res winter imagery above.
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          /* Grid View */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {mediaList.map((asset) => (
              <div
                key={asset._id}
                className="group relative bg-charcoal-surface border border-white/10 rounded-lg overflow-hidden hover:border-burgundy/60 transition-all flex flex-col"
              >
                {/* Media Preview Box */}
                <div
                  className="aspect-[4/5] bg-charcoal relative overflow-hidden cursor-pointer"
                  onClick={() => setSelectedAsset(asset)}
                >
                  {asset.resourceType === 'video' ? (
                    <div className="w-full h-full relative flex items-center justify-center bg-charcoal-dark">
                      <video
                        src={asset.secureUrl}
                        className="w-full h-full object-cover"
                        muted
                        playsInline
                        onMouseOver={(e) => e.target.play().catch(() => {})}
                        onMouseOut={(e) => e.target.pause()}
                      />
                      <div className="absolute top-2 left-2 bg-charcoal/80 text-snow px-1.5 py-0.5 rounded text-[10px] flex items-center gap-1">
                        <Video className="w-3 h-3 text-burgundy" />
                        <span>VIDEO</span>
                      </div>
                    </div>
                  ) : (
                    <img
                      src={asset.secureUrl}
                      alt={asset.altText || asset.filename}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                  )}

                  {/* Badges */}
                  <div className="absolute bottom-2 left-2 flex gap-1">
                    <span className="bg-charcoal/90 text-snow text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded">
                      {asset.category}
                    </span>
                    {asset.inUse && (
                      <span className="bg-emerald-900/90 text-emerald-200 text-[10px] px-1.5 py-0.5 rounded">
                        In Use
                      </span>
                    )}
                  </div>
                </div>

                {/* Footer Details */}
                <div className="p-2.5 flex-1 flex flex-col justify-between">
                  <div>
                    <h4
                      className="text-xs font-medium text-snow truncate"
                      title={asset.filename}
                    >
                      {asset.filename}
                    </h4>
                    <p className="text-[10px] text-silver mt-0.5">
                      {asset.width > 0 ? `${asset.width}×${asset.height}` : ''}{' '}
                      {(asset.bytes / 1024).toFixed(0)} KB
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-white/5 mt-2">
                    <button
                      type="button"
                      onClick={() => copyToClipboard(asset.secureUrl, asset._id)}
                      className="p-1 hover:text-cream text-silver transition-colors"
                      title="Copy Secure URL"
                    >
                      {copiedId === asset._id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedAsset(asset)}
                      className="p-1 hover:text-cream text-silver transition-colors"
                      title="Inspect & Edit Metadata"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => confirmDelete(asset)}
                      className="p-1 hover:text-red-400 text-silver transition-colors"
                      title="Delete Asset"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* List View */
          <div className="bg-charcoal-surface border border-white/10 rounded-lg overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-charcoal border-b border-white/10 text-silver uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Preview</th>
                  <th className="py-3 px-4">Filename / Public ID</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Format</th>
                  <th className="py-3 px-4">Dimensions</th>
                  <th className="py-3 px-4">Size</th>
                  <th className="py-3 px-4">Usage</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {mediaList.map((asset) => (
                  <tr key={asset._id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-2.5 px-4">
                      <div className="w-12 h-14 rounded overflow-hidden bg-charcoal shrink-0">
                        {asset.resourceType === 'video' ? (
                          <div className="w-full h-full flex items-center justify-center bg-charcoal-dark">
                            <Video className="w-4 h-4 text-burgundy" />
                          </div>
                        ) : (
                          <img
                            src={asset.secureUrl}
                            alt={asset.filename}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="font-medium text-snow block truncate max-w-xs">{asset.filename}</span>
                      <span className="text-[10px] text-silver-dark block truncate max-w-xs">{asset.publicId}</span>
                    </td>
                    <td className="py-2.5 px-4 uppercase text-[10px] tracking-wider text-cream">
                      {asset.category}
                    </td>
                    <td className="py-2.5 px-4 uppercase text-silver">{asset.format}</td>
                    <td className="py-2.5 px-4 text-silver">
                      {asset.width > 0 ? `${asset.width}×${asset.height}` : '-'}
                    </td>
                    <td className="py-2.5 px-4 text-silver">{(asset.bytes / 1024).toFixed(0)} KB</td>
                    <td className="py-2.5 px-4">
                      {asset.inUse ? (
                        <span className="bg-emerald-950 text-emerald-300 border border-emerald-800/60 px-2 py-0.5 rounded text-[10px]">
                          Referenced
                        </span>
                      ) : (
                        <span className="text-silver-dark text-[10px]">Unreferenced</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => copyToClipboard(asset.secureUrl, asset._id)}
                          className="p-1 hover:text-white text-silver"
                          title="Copy URL"
                        >
                          {copiedId === asset._id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedAsset(asset)}
                          className="p-1 hover:text-white text-silver"
                          title="Inspect Metadata"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => confirmDelete(asset)}
                          className="p-1 hover:text-red-400 text-silver"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {meta.pages > 1 && (
          <div className="flex items-center justify-between border-t border-white/10 pt-4 mt-6 text-xs text-silver">
            <span>
              Showing Page {meta.page} of {meta.pages} ({meta.total} Total Assets)
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 bg-charcoal-surface border border-white/10 rounded disabled:opacity-40 hover:text-white"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= meta.pages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 bg-charcoal-surface border border-white/10 rounded disabled:opacity-40 hover:text-white"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Selected Asset Inspection & Editing Modal */}
      {selectedAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/80 backdrop-blur-sm">
          <div className="bg-charcoal-surface border border-white/15 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
              <div>
                <span className="text-xs text-burgundy uppercase tracking-widest font-semibold">Asset Inspection</span>
                <h3 className="text-lg font-serif text-cream">{selectedAsset.filename}</h3>
              </div>
              <button
                onClick={() => setSelectedAsset(null)}
                className="text-silver hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Media Preview Box */}
              <div className="bg-charcoal rounded overflow-hidden flex items-center justify-center border border-white/10 aspect-[4/5]">
                {selectedAsset.resourceType === 'video' ? (
                  <video src={selectedAsset.secureUrl} controls className="w-full h-full object-contain" />
                ) : (
                  <img src={selectedAsset.secureUrl} alt={selectedAsset.altText} className="w-full h-full object-contain" />
                )}
              </div>

              {/* Metadata Form & Technical Specs */}
              <form onSubmit={handleUpdateMetadata} className="space-y-4 text-xs">
                <div>
                  <label className="block text-silver uppercase tracking-wider mb-1">Public ID (Cloudinary)</label>
                  <input
                    type="text"
                    readOnly
                    value={selectedAsset.publicId}
                    className="w-full p-2 bg-charcoal border border-white/10 rounded text-silver-dark font-mono text-[11px]"
                  />
                </div>

                <div>
                  <label className="block text-silver uppercase tracking-wider mb-1">Secure Delivery URL</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={selectedAsset.secureUrl}
                      className="w-full p-2 bg-charcoal border border-white/10 rounded text-silver-dark font-mono text-[11px]"
                    />
                    <button
                      type="button"
                      onClick={() => copyToClipboard(selectedAsset.secureUrl, 'modal')}
                      className="px-3 py-1 bg-charcoal hover:bg-white/10 border border-white/10 rounded text-cream flex items-center gap-1"
                    >
                      {copiedId === 'modal' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/5">
                  <div>
                    <span className="text-silver block text-[10px] uppercase">Format</span>
                    <span className="text-cream uppercase font-medium">{selectedAsset.format}</span>
                  </div>
                  <div>
                    <span className="text-silver block text-[10px] uppercase">Dimensions</span>
                    <span className="text-cream font-medium">
                      {selectedAsset.width > 0 ? `${selectedAsset.width} × ${selectedAsset.height} px` : '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-silver block text-[10px] uppercase">File Weight</span>
                    <span className="text-cream font-medium">{(selectedAsset.bytes / 1024).toFixed(1)} KB</span>
                  </div>
                  <div>
                    <span className="text-silver block text-[10px] uppercase">Uploaded</span>
                    <span className="text-cream font-medium">{new Date(selectedAsset.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/5">
                  <label className="block text-silver uppercase tracking-wider mb-1">Category</label>
                  <select
                    value={selectedAsset.category}
                    onChange={(e) => setSelectedAsset({ ...selectedAsset, category: e.target.value })}
                    className="w-full p-2 bg-charcoal border border-white/10 rounded text-cream"
                  >
                    <option value="product">Product Media</option>
                    <option value="banner">Storefront Banner</option>
                    <option value="campaign">Campaign Video / Lookbook</option>
                    <option value="brand">Brand Storytelling</option>
                    <option value="general">General</option>
                  </select>
                </div>

                <div>
                  <label className="block text-silver uppercase tracking-wider mb-1">Accessibility Alt Text</label>
                  <input
                    type="text"
                    value={selectedAsset.altText || ''}
                    onChange={(e) => setSelectedAsset({ ...selectedAsset, altText: e.target.value })}
                    placeholder="Describe image for visually impaired users..."
                    className="w-full p-2 bg-charcoal border border-white/10 rounded text-snow focus:border-burgundy"
                  />
                </div>

                <div>
                  <label className="block text-silver uppercase tracking-wider mb-1">Editorial Caption</label>
                  <textarea
                    rows={2}
                    value={selectedAsset.caption || ''}
                    onChange={(e) => setSelectedAsset({ ...selectedAsset, caption: e.target.value })}
                    placeholder="Optional editorial note or subtitle..."
                    className="w-full p-2 bg-charcoal border border-white/10 rounded text-snow focus:border-burgundy"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => confirmDelete(selectedAsset)}
                    className="px-4 py-2 border border-red-800 text-red-300 hover:bg-red-950/40 rounded uppercase text-[11px] tracking-wider"
                  >
                    Delete Asset
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-burgundy hover:bg-burgundy-light text-snow font-medium rounded uppercase text-[11px] tracking-wider"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Destructive Deletion Guard Modal */}
      {assetToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/85 backdrop-blur-sm">
          <div className="bg-charcoal-surface border border-red-900/60 rounded-lg max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-red-400 mb-3">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-lg font-serif text-cream">Confirm Safe Deletion</h3>
            </div>

            <p className="text-xs text-silver mb-4 leading-relaxed">
              Are you sure you want to permanently delete asset{' '}
              <strong className="text-white">"{assetToDelete.filename}"</strong> from both Cloudinary CDN and
              database records?
            </p>

            {deleteReferences?.inUse && (
              <div className="p-3 bg-red-950/60 border border-red-800/80 rounded mb-4 text-xs text-red-200">
                <span className="font-semibold block mb-1">Warning: Asset Currently In Use!</span>
                This asset is actively referenced by:
                <ul className="list-disc list-inside mt-1 text-[11px] space-y-0.5">
                  {deleteReferences.products.length > 0 && (
                    <li>{deleteReferences.products.length} Product(s)</li>
                  )}
                  {deleteReferences.banners.length > 0 && (
                    <li>{deleteReferences.banners.length} Storefront Banner(s)</li>
                  )}
                  {deleteReferences.campaigns.length > 0 && (
                    <li>{deleteReferences.campaigns.length} Campaign(s)</li>
                  )}
                </ul>
                <p className="mt-2 text-[10px] text-red-300">
                  Deletion will be rejected by the server while these associations exist.
                </p>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  setAssetToDelete(null);
                  setDeleteReferences(null);
                }}
                className="px-4 py-2 border border-white/10 hover:border-white/30 text-silver rounded uppercase text-xs tracking-wider"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeDelete}
                disabled={isDeleting || deleteReferences?.inUse}
                className="px-5 py-2 bg-red-800 hover:bg-red-700 disabled:opacity-40 text-white font-medium rounded uppercase text-xs tracking-wider flex items-center gap-2"
              >
                {isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMediaLibrary;
