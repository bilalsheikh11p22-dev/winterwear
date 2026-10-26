import { z } from 'zod';

export const addItemSchema = z.object({
  body: z.object({
    productId: z.string().min(1, 'Product ID is required'),
    sku: z.string().optional(),
    size: z.string().min(1, 'Size is required'),
    color: z.object({
      name: z.string().min(1, 'Color name is required'),
      hex: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Valid hex color code required'),
    }),
    quantity: z.number().int().min(1, 'Quantity must be at least 1').max(50, 'Quantity cannot exceed 50').default(1),
  }),
});

export const updateItemSchema = z.object({
  body: z.object({
    quantity: z.number().int().min(0, 'Quantity must be at least 0').max(50, 'Quantity cannot exceed 50'),
  }),
});
