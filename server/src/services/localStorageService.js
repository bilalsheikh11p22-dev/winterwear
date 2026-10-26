import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

/**
 * Development fallback used when Cloudinary credentials are missing.
 * Files are written to <server>/uploads/<category>/ and served from /uploads.
 */
export const UPLOADS_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../uploads'
);

const EXTENSIONS = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
};

const safeSegment = (value) => String(value || 'general').replace(/[^a-z0-9_-]/gi, '').slice(0, 40) || 'general';

export const saveBufferLocally = async (file, { category = 'general', origin = '' } = {}) => {
  const segment = safeSegment(category);
  const ext = EXTENSIONS[file.mimetype] || 'bin';
  const name = `${Date.now()}-${crypto.randomBytes(5).toString('hex')}`;

  const dir = path.join(UPLOADS_ROOT, segment);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, `${name}.${ext}`), file.buffer);

  const publicId = `local/${segment}/${name}`;
  const url = `${origin}/uploads/${segment}/${name}.${ext}`;

  return {
    public_id: publicId,
    secure_url: url,
    url,
    resource_type: file.mimetype.startsWith('video/') ? 'video' : 'image',
    format: ext,
    bytes: file.size,
    original_filename: file.originalname,
  };
};

export const isLocalAsset = (publicId) => typeof publicId === 'string' && publicId.startsWith('local/');

export const deleteLocalAsset = async (publicId, format) => {
  const [, segment, name] = String(publicId).split('/');
  if (!segment || !name) return;
  const file = path.join(UPLOADS_ROOT, safeSegment(segment), `${name.replace(/[^a-z0-9-]/gi, '')}.${format}`);
  if (file.startsWith(UPLOADS_ROOT)) await fs.rm(file, { force: true });
};
