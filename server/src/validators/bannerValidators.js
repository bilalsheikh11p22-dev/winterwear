import { z } from 'zod';

// Relative path or a valid https URL
const safeUrl = z
  .string()
  .trim()
  .refine(
    (val) => !val || (val.startsWith('/') && !val.startsWith('//')) || /^https:\/\//i.test(val),
    { message: 'CTA link must start with / (for example /shop?sale=true) or be a full https:// URL' }
  )
  .optional();

const PLACEMENT_VALUES = [
  'hero',
  'seasonal_sale',
  'category_top',
  'announcement',
  'promotional_strip',
  'sidebar',
  'cart_upsell',
  'checkout',
  'email',
];

const mediaSubSchema = z
  .object({
    url: z.string().url({ message: 'Media URL must be a valid URL' }),
    publicId: z.string().optional(),
    altText: z.string().max(255).optional(),
  })
  .optional();

// Base object schema (no refine) — allows .partial() for updates
const bannerBaseObject = z.object({
  headline: z
    .string({ required_error: 'Headline is required' })
    .min(2, 'Headline must be at least 2 characters')
    .max(200, 'Headline cannot exceed 200 characters'),

  description: z.string().max(1000).optional(),

  ctaText: z.string().max(100).optional(),

  ctaLink: safeUrl,

  placement: z.enum(PLACEMENT_VALUES, {
    errorMap: () => ({ message: `Placement must be one of: ${PLACEMENT_VALUES.join(', ')}` }),
  }),

  isActive: z.boolean().optional().default(true),

  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),

  discountCode: z.string().max(50).optional(),

  desktopMedia: mediaSubSchema,
  mobileMedia: mediaSubSchema,

  targetCategory: z.string().optional(),
});

// Create — full object with date-range cross-field validation
export const createBannerSchema = z.object({
  body: bannerBaseObject.refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return data.endDate >= data.startDate;
      }
      return true;
    },
    { message: 'endDate must be on or after startDate', path: ['endDate'] }
  ),
});

// Update — all fields optional; same cross-field check where both dates are present
export const updateBannerSchema = z.object({
  body: bannerBaseObject.partial().refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return data.endDate >= data.startDate;
      }
      return true;
    },
    { message: 'endDate must be on or after startDate', path: ['endDate'] }
  ),
});
