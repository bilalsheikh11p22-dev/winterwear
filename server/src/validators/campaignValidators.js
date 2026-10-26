import { z } from 'zod';

const TARGET_SECTION_VALUES = [
  'homepage_hero',
  'promotional_editorial',
  'brand_story',
  'lookbook',
  'seasonal',
  'product_launch',
  'collaboration',
];

const videoSubSchema = z
  .object({
    secureUrl: z.string().url({ message: 'Video secureUrl must be a valid URL' }),
    publicId: z.string().optional(),
    posterUrl: z.string().url({ message: 'Poster URL must be a valid URL' }).optional(),
    duration: z.number().nonnegative().optional(),
    aspectRatio: z.string().optional(),
    autoplay: z.boolean().optional().default(true),
    loop: z.boolean().optional().default(true),
    muted: z.boolean().optional().default(true),
    playsInline: z.boolean().optional().default(true),
  })
  .optional();

// Base object schema (no refine) — allows .partial() for updates
const campaignBaseObject = z.object({
  title: z
    .string({ required_error: 'Title is required' })
    .min(2, 'Title must be at least 2 characters')
    .max(200, 'Title cannot exceed 200 characters'),

  slug: z
    .string({ required_error: 'Slug is required' })
    .min(2, 'Slug must be at least 2 characters')
    .max(100, 'Slug cannot exceed 100 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug may only contain lowercase letters, numbers, and hyphens'),

  description: z.string().max(5000).optional(),

  targetSection: z.enum(TARGET_SECTION_VALUES, {
    errorMap: () => ({
      message: `targetSection must be one of: ${TARGET_SECTION_VALUES.join(', ')}`,
    }),
  }),

  isActive: z.boolean().optional().default(true),
  isFeatured: z.boolean().optional().default(false),

  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),

  ctaText: z.string().max(100).optional(),
  ctaLink: z
    .string()
    .refine(
      (val) => !val || val.startsWith('/') || /^https:\/\//i.test(val),
      { message: 'ctaLink must be a relative path or valid https URL' }
    )
    .optional(),

  video: videoSubSchema,
});

// Create — required fields + date-range cross-field validation
export const createCampaignSchema = z.object({
  body: campaignBaseObject.refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return data.endDate >= data.startDate;
      }
      return true;
    },
    { message: 'endDate must be on or after startDate', path: ['endDate'] }
  ),
});

// Update — all fields optional; same cross-field check where both dates present
export const updateCampaignSchema = z.object({
  body: campaignBaseObject.partial().refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return data.endDate >= data.startDate;
      }
      return true;
    },
    { message: 'endDate must be on or after startDate', path: ['endDate'] }
  ),
});
