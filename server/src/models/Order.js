import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  sku: { type: String, required: true },
  name: { type: String, required: true },
  image: { type: String, required: true },
  size: { type: String, required: true },
  color: {
    name: { type: String, required: true },
    hex: { type: String, required: true },
  },
  price: { type: Number, required: true, min: 0 },
  quantity: { type: Number, required: true, min: 1 },
  totalItemPrice: { type: Number, required: true, min: 0 },
});

const orderStatusHistorySchema = new mongoose.Schema({
  status: { type: String, required: true },
  changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  role: { type: String },
  comment: { type: String, default: '' },
  timestamp: { type: Date, default: Date.now },
});

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    items: [orderItemSchema],
    shippingAddress: {
      fullName: { type: String, required: true },
      phone: { type: String, required: true },
      street: { type: String, required: true },
      apartment: { type: String, default: '' },
      city: { type: String, required: true },
      state: { type: String, required: true },
      postalCode: { type: String, required: true },
      country: { type: String, default: 'Pakistan' },
    },
    // Geocoded drop-off point (filled lazily the first time a rider opens the delivery)
    deliveryLocation: {
      lat: Number,
      lng: Number,
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    couponCode: {
      type: String,
      default: '',
    },
    shippingFee: {
      type: Number,
      default: 0,
      min: 0,
    },
    taxAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    currency: {
      type: String,
      default: 'PKR',
      uppercase: true,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    idempotencyKey: {
      type: String,
      sparse: true,
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: ['COD', 'Stripe', 'Safepay', 'PayFast', 'Card'],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded', 'partially_refunded'],
      default: 'pending',
    },
    paymentDetails: {
      transactionId: { type: String, default: '' },
      provider: { type: String, default: '' },
      paidAt: { type: Date },
      webhookPayloadRef: { type: String, default: '' },
    },
    orderStatus: {
      type: String,
      enum: [
        'pending_payment',
        'checkout_pending',
        'confirmed',
        'processing',
        'packing',
        'ready_for_dispatch',
        'assigned_to_rider',
        'picked_up',
        'out_for_delivery',
        'delivered',
        'delivery_rescheduled',
        'delivery_failed',
        'cancellation_requested',
        'cancelled',
        'return_requested',
        'returned',
        'returned_to_warehouse',
        'refund_pending',
        'refunded',
        'failed',
      ],
      default: 'confirmed',
    },
    statusHistory: [orderStatusHistorySchema],
    assignedRider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    deliveryNotes: {
      type: String,
      default: '',
    },
    trackingCode: {
      type: String,
      default: '',
    },
    proofOfDelivery: {
      otp: { type: String, default: '' },
      photoUrl: { type: String, default: '' },
      recipientSignature: { type: String, default: '' },
      deliveredAt: { type: Date },
    },
    codCollected: {
      type: Boolean,
      default: false,
    },
    codReconciled: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

orderSchema.index({ customer: 1, createdAt: -1 });
orderSchema.index({ orderStatus: 1, createdAt: -1 });
orderSchema.index({ assignedRider: 1, orderStatus: 1 });

export default mongoose.model('Order', orderSchema);
