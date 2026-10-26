import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const dateLike = z.union([z.string(), z.date()]).transform((v) => new Date(v)).refine((d) => !Number.isNaN(d.getTime()), 'Invalid date');

const couponFields = {
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,30}$/, 'Code must be 3-30 letters, numbers, - or _'),
  name: z.string().trim().max(120).optional(),
  description: z.string().trim().max(400).optional(),
  // "fixed" is accepted as an alias for "fixed_amount" for older clients.
  discountType: z.enum(['percentage', 'fixed', 'fixed_amount', 'free_shipping']).transform((t) => (t === 'fixed' ? 'fixed_amount' : t)),
  discountValue: z.number().nonnegative(),
  minOrderAmount: z.number().nonnegative().optional(),
  maxDiscountAmount: z.number().positive().nullable().optional(),
  validFrom: dateLike.optional(),
  validUntil: dateLike,
  isActive: z.boolean().optional(),
  maxUsageCount: z.number().int().positive().nullable().optional(),
  usageLimit: z.number().int().positive().nullable().optional(), // legacy alias
  perCustomerLimit: z.number().int().min(1).max(10).optional(),
  applicableCategories: z.array(objectId).optional(),
  eligibleProducts: z.array(objectId).optional(),
  excludeSaleItems: z.boolean().optional(),
  firstOrderOnly: z.boolean().optional(),
  customerSegment: z.enum(['all', 'new_customers', 'returning_customers', 'specific']).optional(),
  eligibleCustomers: z.array(objectId).optional(),
  visibility: z.enum(['public', 'hidden']).optional(),
};

const normaliseLegacy = (b) => {
  const { usageLimit, ...rest } = b;
  if (usageLimit !== undefined && rest.maxUsageCount === undefined) rest.maxUsageCount = usageLimit;
  return rest;
};

export const createCouponSchema = z.object({
  body: z.object(couponFields).strict().transform(normaliseLegacy),
});

export const updateCouponSchema = z.object({
  params: z.object({ id: objectId }),
  body: z.object(couponFields).partial().strict().transform(normaliseLegacy),
});

export const couponStatusSchema = z.object({
  params: z.object({ id: objectId }),
  body: z.object({ isActive: z.boolean() }).strict(),
});

export const couponIdSchema = z.object({ params: z.object({ id: objectId }) });

// Validation is cart-based. `subtotal` is still accepted for older clients, but then product-level
// rules cannot be checked, so coupons with item restrictions are refused on that path.
export const validateCouponSchema = z.object({
  body: z
    .object({
      code: z.string().min(1, 'Coupon code is required').trim().toUpperCase(),
      items: z.array(z.object({ productId: objectId, quantity: z.number().int().min(1).max(50) })).min(1).max(50).optional(),
      subtotal: z.number().positive('Subtotal must be positive').optional(),
    })
    .refine((b) => b.items || b.subtotal, { message: 'Provide cart items to validate the coupon against.', path: ['items'] }),
});
