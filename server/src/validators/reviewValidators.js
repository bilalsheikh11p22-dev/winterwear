import { z } from 'zod';

export const createReviewSchema = z.object({
  body: z.object({
    productId: z.string().min(1, 'Product ID is required'),
    orderId: z.string().optional(),
    rating: z.number().int().min(1).max(5, 'Rating must be between 1 and 5'),
    title: z.string().min(3, 'Title must be at least 3 characters').max(100, 'Title cannot exceed 100 characters'),
    comment: z.string().min(10, 'Review must be at least 10 characters').max(2000, 'Review cannot exceed 2000 characters'),
    fitFeedback: z.enum(['Runs Small', 'True to Size', 'Runs Large']).default('True to Size'),
    images: z.array(z.object({
      public_id: z.string().optional(),
      url: z.string().url('Must be a valid image URL'),
    })).optional(),
  }),
});
