import mongoose from 'mongoose';

const returnRequestSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },
    orderNumber: {
      type: String,
      required: true,
      index: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    items: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
        variant: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductVariant' },
        sku: String,
        name: String,
        quantity: { type: Number, required: true, min: 1 },
        unitPrice: Number,
        reason: {
          type: String,
          enum: ['Defective / Damaged', 'Size Mismatch', 'Different from Description', 'Changed Mind'],
          required: true,
        },
      },
    ],
    customerNotes: String,
    images: [{ url: String, public_id: String }],
    status: {
      type: String,
      enum: [
        'requested',
        'under_review',
        'approved_for_return',
        'item_received_at_warehouse',
        'inspected_passed',
        'inspected_failed',
        'refund_issued',
        'rejected',
      ],
      default: 'requested',
      index: true,
    },
    reviewNotes: String,
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('ReturnRequest', returnRequestSchema);
