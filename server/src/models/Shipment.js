import mongoose from 'mongoose';

const deliveryEventSchema = new mongoose.Schema({
  status: { type: String, required: true },
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  comment: { type: String, default: '' },
  location: {
    lat: Number,
    lng: Number,
    address: String,
  },
});

const shipmentSchema = new mongoose.Schema(
  {
    shipmentNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },
    trackingCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      index: true,
    },
    carrier: {
      type: String,
      default: 'WinterWear White Glove Courier',
    },
    originWarehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
      required: true,
    },
    destinationAddress: {
      fullName: String,
      phone: String,
      street: String,
      city: String,
      state: String,
      postalCode: String,
      country: String,
    },
    status: {
      type: String,
      enum: [
        'manifested',
        'ready_for_dispatch',
        'assigned_to_rider',
        'picked_up',
        'out_for_delivery',
        'delivered',
        'delivery_failed',
        'rescheduled',
        'returned_to_warehouse',
      ],
      default: 'manifested',
      index: true,
    },
    assignedRider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    events: [deliveryEventSchema],
    proofOfDelivery: {
      otp: String,
      verifiedOtp: Boolean,
      recipientName: String,
      signatureUrl: String,
      photoUrl: String,
      deliveredAt: Date,
    },
    isCod: {
      type: Boolean,
      default: false,
    },
    codAmount: {
      type: Number,
      default: 0,
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

export default mongoose.model('Shipment', shipmentSchema);
