import mongoose from 'mongoose';

const stockMovementSchema = new mongoose.Schema(
  {
    warehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
      required: true,
      index: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    variant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProductVariant',
      required: true,
      index: true,
    },
    sku: {
      type: String,
      required: true,
      uppercase: true,
      index: true,
    },
    movementType: {
      type: String,
      enum: [
        'purchase_in',
        'sales_out',
        'reservation_hold',
        'reservation_release',
        'return_in',
        'damage_writeoff',
        'transfer_in',
        'transfer_out',
        'manual_adjustment',
      ],
      required: true,
      index: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    previousOnHand: {
      type: Number,
      required: true,
    },
    newOnHand: {
      type: Number,
      required: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    referenceOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
    },
    referencePurchaseOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PurchaseOrder',
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('StockMovement', stockMovementSchema);
