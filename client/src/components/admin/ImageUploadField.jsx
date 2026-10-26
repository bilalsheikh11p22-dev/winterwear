import React, { useRef, useState } from 'react';
import { UploadCloud, X, RefreshCw, Link as LinkIcon, AlertTriangle } from 'lucide-react';
import { mediaApi } from '../../services/api';
import { Spinner } from '../common/Loader';

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const MAX_BYTES = 10 * 1024 * 1024; // matches the server limit for images

const formatBytes = (bytes) =>
  bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

/**
 * Image picker for admin forms: choose a file from the computer (click or drag & drop),
 * upload it through the media API and hand the resulting URL back to the form.
 *
 *  <ImageUploadField value={url} onChange={(url, asset) => ...} category="banner" altText="..." />
 */
const ImageUploadField = ({
  value,
  onChange,
  category = 'general',
  altText = '',
  label = 'Image',
  hint = 'JPG, PNG, WebP or AVIF, up to 10 MB.',
}) => {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);

  const upload = async (file) => {
    if (!file) return;
    setError('');

    if (!ACCEPTED.includes(file.type)) {
      setError('Unsupported file type. Please choose a JPG, PNG, WebP or AVIF image.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError(`Image is too large (${formatBytes(file.size)}). Maximum size is 10 MB.`);
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);
    if (altText) formData.append('altText', altText);

    setUploading(true);
    setProgress(0);
    try {
      const res = await mediaApi.uploadMedia(formData, (event) => {
        if (event.total) setProgress(Math.round((event.loaded / event.total) * 100));
      });
      const asset = res.data?.data;
      const url = asset?.secureUrl || asset?.url;
      if (!url) throw new Error('Upload finished but no image URL was returned.');
      onChange(url, asset);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    if (!uploading) upload(e.dataTransfer.files?.[0]);
  };

  return (
    <div>
      <label className="block text-xs uppercase tracking-wider text-silver mb-1.5">{label}</label>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(',')}
        className="hidden"
        onChange={(e) => upload(e.target.files?.[0])}
      />

      {value && !uploading ? (
        <div className="flex items-center gap-4 p-3 rounded border border-white/10 bg-white/5">
          <img
            src={value}
            alt="Selected preview"
            className="w-28 h-16 object-cover rounded border border-white/10 bg-black/30"
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-snow truncate">{value}</p>
            <div className="flex items-center gap-4 mt-2">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="inline-flex items-center gap-1.5 text-xs text-ice hover:text-snow transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Replace
              </button>
              <button
                type="button"
                onClick={() => onChange('', null)}
                className="inline-flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors"
              >
                <X className="w-3.5 h-3.5" /> Remove
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={`w-full flex flex-col items-center justify-center gap-2 px-4 py-8 rounded border border-dashed text-center transition-colors disabled:cursor-wait ${
            dragging
              ? 'border-ice bg-ice/10'
              : 'border-white/20 bg-white/[0.03] hover:border-ice/60 hover:bg-white/5'
          }`}
        >
          {uploading ? (
            <>
              <Spinner size={24} className="text-ice" label="Uploading image" />
              <span className="text-sm text-snow">Uploading… {progress}%</span>
              <span className="w-48 h-1 rounded-full bg-white/10 overflow-hidden">
                <span
                  className="block h-full bg-ice transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </span>
            </>
          ) : (
            <>
              <UploadCloud className="w-7 h-7 text-silver" />
              <span className="text-sm text-snow">
                Click to choose an image from your computer
              </span>
              <span className="text-[11px] text-silver/60">or drag and drop it here · {hint}</span>
            </>
          )}
        </button>
      )}

      {error && (
        <p role="alert" className="mt-2 flex items-start gap-1.5 text-xs text-red-300">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {error}
        </p>
      )}

      <div className="mt-2">
        <button
          type="button"
          onClick={() => setShowUrlInput((v) => !v)}
          className="inline-flex items-center gap-1.5 text-[11px] text-silver/70 hover:text-snow transition-colors"
        >
          <LinkIcon className="w-3 h-3" />
          {showUrlInput ? 'Hide image URL' : 'Or paste an image URL'}
        </button>
        {showUrlInput && (
          <input
            type="url"
            value={value || ''}
            onChange={(e) => onChange(e.target.value, null)}
            placeholder="https://res.cloudinary.com/..."
            className="mt-2 w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-snow text-sm focus:outline-none focus:border-ice/50"
          />
        )}
      </div>
    </div>
  );
};

export default ImageUploadField;
