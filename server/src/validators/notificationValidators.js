import { z } from 'zod';
import { FILTERS } from '../services/notifications/catalog.js';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const num = (def, min, max) => z.coerce.number().int().min(min).max(max).default(def);

export const listNotificationsSchema = z.object({
  query: z.object({
    page: num(1, 1, 10000),
    limit: num(20, 1, 50),
    filter: z.enum(Object.keys(FILTERS)).default('all'),
    sort: z.enum(['newest', 'oldest']).default('newest'),
  }),
});

export const notificationIdSchema = z.object({ params: z.object({ id: objectId }) });

export const markAllSchema = z.object({
  body: z.object({ filter: z.enum(Object.keys(FILTERS)).optional() }).strict().optional().default({}),
});

const pair = z.object({ inApp: z.boolean().optional(), email: z.boolean().optional() }).strict();
export const updatePreferencesSchema = z.object({
  body: z
    .object({
      orderUpdates: pair.optional(),
      newArrivals: pair.optional(),
      backInStock: pair.optional(),
      priceDrop: pair.optional(),
      discounts: pair.optional(),
      marketingEmails: z.boolean().optional(),
    })
    .strict()
    .refine((b) => Object.keys(b).length > 0, 'Nothing to update'),
});

export const subscribeSchema = z.object({
  params: z.object({ id: objectId }),
  body: z.object({ type: z.enum(['back_in_stock', 'price_drop']).default('back_in_stock') }).strict().optional().default({}),
});

export const latestProductsSchema = z.object({ query: z.object({ limit: num(12, 1, 50), category: objectId.optional() }) });

// ── Admin: notification campaigns ───────────────────────────────────────────
const audience = z
  .object({
    segment: z.enum(['all_customers', 'previous_buyers', 'new_customers', 'wishlist_of_product', 'specific_users']).default('all_customers'),
    userIds: z.array(objectId).max(1000).optional(),
    newCustomerDays: z.number().int().min(1).max(365).optional(),
  })
  .strict();

const campaignBody = z.object({
  name: z.string().trim().min(2).max(120),
  kind: z.enum(['product_announcement', 'coupon', 'custom']),
  products: z.array(objectId).max(10).optional(),
  coupon: objectId.optional(),
  title: z.string().trim().max(160).optional(),
  message: z.string().trim().max(600).optional(),
  actionUrl: z.string().trim().max(300).optional(),
  audience: audience.optional(),
  sendEmail: z.boolean().optional(),
  scheduledAt: z.union([z.string(), z.date()]).transform((v) => new Date(v)).refine((d) => !Number.isNaN(d.getTime()), 'Invalid date').optional(),
  eventKey: z.string().trim().max(120).optional(),
});

export const createCampaignSchema = z.object({
  body: campaignBody.strict().superRefine((b, ctx) => {
    if (b.kind === 'product_announcement' && !b.products?.length) ctx.addIssue({ code: 'custom', path: ['products'], message: 'Select at least one product' });
    if (b.kind === 'coupon' && !b.coupon) ctx.addIssue({ code: 'custom', path: ['coupon'], message: 'Select a coupon' });
  }),
});

export const campaignIdSchema = z.object({ params: z.object({ id: objectId }) });

export const activityQuerySchema = z.object({
  query: z.object({
    page: num(1, 1, 10000),
    limit: num(25, 1, 100),
    type: z.string().max(60).optional(),
    recipient: objectId.optional(),
    emailStatus: z.enum(['not_requested', 'pending', 'sent', 'failed', 'skipped']).optional(),
    from: z.string().optional(),
    to: z.string().optional(),
  }),
});

export const metricsQuerySchema = z.object({ query: z.object({ days: num(30, 1, 365) }) });
