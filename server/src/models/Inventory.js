import mongoose from 'mongoose';

const inventorySchema = new mongoose.Schema(
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
      trim: true,
      index: true,
    },
    onHand: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    reserved: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    damaged: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    reorderThreshold: {
      type: Number,
      default: 5,
      min: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Available stock = on-hand stock - reserved stock - damaged stock
inventorySchema.virtual('available').get(function () {
  return Math.max(0, (this.onHand || 0) - (this.reserved || 0) - (this.damaged || 0));
});

inventorySchema.index({ warehouse: 1, variant: 1 }, { unique: true });

export default mongoose.model('Inventory', inventorySchema);
