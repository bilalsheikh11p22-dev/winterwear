import { z } from 'zod';

export const checkoutSchema = z.object({
  body: z.object({
    items: z
      .array(
        z.object({
          productId: z.string().min(1),
          quantity: z.number().int().positive(),
          size: z.string().min(1),
          color: z.union([
            z.string(),
            z.object({
              name: z.string(),
              hex: z.string().optional(),
            }),
          ]),
        })
      )
      .optional(),
    shippingAddressId: z.string().optional(),
    shippingAddress: z
      .object({
        fullName: z.string().min(2),
        phone: z.string().min(5),
        street: z.string().min(3),
        apartment: z.string().optional(),
        city: z.string().min(2),
        state: z.string().min(2),
        postalCode: z.string().min(2),
        country: z.string().default('Pakistan'),
      })
      .optional(),
    paymentMethod: z.enum(['COD', 'Stripe', 'Safepay', 'PayFast', 'Card']),
    couponCode: z.string().optional(),
    deliveryNotes: z.string().max(500).optional(),
    idempotencyKey: z.string().min(4, 'Idempotency key required to avoid duplicate charges').optional(),
  }),
});

export const orderStatusTransitionSchema = z.object({
  body: z.object({
    status: z.enum([
      'pending_payment',
      'confirmed',
      'processing',
      'packing',
      'ready_for_dispatch',
      'assigned_to_rider',
      'picked_up',
      'out_for_delivery',
      'delivered',
      'cancellation_requested',
      'cancelled',
      'return_requested',
      'returned',
      'refund_pending',
      'refunded',
      'failed',
    ]),
    comment: z.string().max(500).optional(),
  }),
});
