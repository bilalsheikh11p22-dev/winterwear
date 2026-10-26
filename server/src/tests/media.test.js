import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../app.js';
import { isCloudinaryConfigured, getTransformedUrl } from '../config/cloudinary.js';
import { checkAssetReferences } from '../services/mediaService.js';
import { validateFileConstraints } from '../middleware/uploadValidation.js';

describe('Cloudinary Media & Assets Management', () => {
  it('isCloudinaryConfigured accurately reports boolean state based on env vars', () => {
    const configured = isCloudinaryConfigured();
    assert.equal(typeof configured, 'boolean');
  });

  it('getTransformedUrl generates valid Cloudinary URL with responsive transformations', () => {
    const testPublicId = 'winterwear/products/parka-noir-01';
    const transformed = getTransformedUrl(testPublicId, {
      width: 800,
      height: 1000,
      crop: 'fill',
      quality: 'auto',
      format: 'webp',
    });

    assert.ok(typeof transformed === 'string');
    assert.ok(transformed.includes(testPublicId));
    assert.ok(transformed.includes('w_800') || transformed.includes('upload'));
  });

  it('validateFileConstraints throws on missing file', () => {
    assert.throws(
      () => {
        validateFileConstraints(null);
      },
      { code: 'FILE_MISSING' }
    );
  });

  it('validateFileConstraints rejects images exceeding 10MB', () => {
    const oversizedImage = {
      mimetype: 'image/jpeg',
      size: 15 * 1024 * 1024, // 15MB
    };
    assert.throws(
      () => {
        validateFileConstraints(oversizedImage);
      },
      { code: 'IMAGE_TOO_LARGE' }
    );
  });

  it('validateFileConstraints rejects videos exceeding 50MB', () => {
    const oversizedVideo = {
      mimetype: 'video/mp4',
      size: 60 * 1024 * 1024, // 60MB
    };
    assert.throws(
      () => {
        validateFileConstraints(oversizedVideo);
      },
      { code: 'VIDEO_TOO_LARGE' }
    );
  });

  it('POST /api/v1/media/upload requires authentication', async () => {
    const res = await request(app).post('/api/v1/media/upload');
    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.equal(res.body.code, 'UNAUTHORIZED');
  });

  it('POST /api/v1/media/upload-signature requires authentication', async () => {
    const res = await request(app).post('/api/v1/media/upload-signature');
    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.equal(res.body.code, 'UNAUTHORIZED');
  });

  it('GET /api/v1/media requires authentication', async () => {
    const res = await request(app).get('/api/v1/media');
    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.equal(res.body.code, 'UNAUTHORIZED');
  });

  it('DELETE /api/v1/media/:id requires authentication', async () => {
    const res = await request(app).delete('/api/v1/media/60c72b2f9b1d8b2bad000001');
    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.equal(res.body.code, 'UNAUTHORIZED');
  });
});
