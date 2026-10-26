/**
 * Cloudinary Media Configuration for WinterWear Client
 * Provides responsive URL helpers, quality/format transformations,
 * and verified winter fashion media assets with graceful fallbacks.
 */

export const CLOUDINARY_CONFIG = {
  cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'winterwear-archive',
  defaultQuality: 'auto',
  defaultFormat: 'auto',
};

/**
 * Transforms a Cloudinary URL or returns the fallback directly if it's an external URL
 */
export const getOptimizedMediaUrl = (url, options = {}) => {
  if (!url) return '';
  const { width, height, crop = 'fill', quality = 'auto', format = 'auto' } = options;

  // If already a Cloudinary URL, inject transformations
  if (url.includes('res.cloudinary.com')) {
    const transformationParts = [`f_${format}`, `q_${quality}`];
    if (width) transformationParts.push(`w_${width}`);
    if (height) transformationParts.push(`h_${height}`);
    if (crop) transformationParts.push(`c_${crop}`);

    const transformationString = transformationParts.join(',');
    return url.replace('/upload/', `/upload/${transformationString}/`);
  }

  // Return standard URL for direct CDN or external fallbacks
  return url;
};

/**
 * Editorial Campaign Assets (Cloudinary-compatible with verified CDN fallbacks)
 */
export const CAMPAIGN_MEDIA = {
  hero: {
    videoUrl: import.meta.env.VITE_HERO_VIDEO_URL || 'https://assets.mixkit.co/videos/preview/mixkit-winter-fashion-model-in-snow-40611-large.mp4',
    posterUrl: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=2200&auto=format&fit=crop',
    alt: 'WinterWear Haute Outerwear Winter Campaign Film',
  },
  pinnedStory: [
    {
      id: 'story-1',
      title: 'Forged in Sub-Zero Squalls',
      subtitle: 'Alpine Terrain Testing in the Lyngen Ridge',
      tag: 'Extreme Environment Tolerance',
      imageUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=1600&auto=format&fit=crop',
      alt: 'Alpine expedition in sub-zero snow squalls',
    },
    {
      id: 'story-2',
      title: 'Architectural Goose Down',
      subtitle: '850-Fill Power European Ethically Certified Loft',
      tag: 'RDS Certified Insulation',
      imageUrl: 'https://images.unsplash.com/photo-1544923246-77307dd654cb?q=80&w=1600&auto=format&fit=crop',
      alt: 'Sculpted matte micro-ripstop down parka',
    },
    {
      id: 'story-3',
      title: 'Sartorial Italian Heritage',
      subtitle: 'Biella Virgin Wool Mills & Grade-A Mongolian Cashmere',
      tag: 'Piedmont Hand-Finishing',
      imageUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=1600&auto=format&fit=crop',
      alt: 'Bespoke double-faced virgin wool coat',
    },
  ],
  campaignFilm: {
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-winter-fashion-model-in-snow-40611-large.mp4',
    posterUrl: 'https://images.unsplash.com/photo-1548883354-7622d03aca27?q=80&w=2000&auto=format&fit=crop',
    title: 'The Northern Ridge Cinema',
  },
};
