import mongoose from 'mongoose';

const deliveryAssignmentSchema = new mongoose.Schema(
  {
    rider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    shipment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shipment',
      required: true,
      index: true,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['pending_pickup', 'picked_up', 'in_transit', 'completed', 'failed', 'reassigned'],
      default: 'pending_pickup',
      index: true,
    },
    priority: {
      type: String,
      enum: ['standard', 'express', 'vip_atelier'],
      default: 'express',
    },
    notes: String,
    riderNotes: String,
    pickedUpAt: Date,
    completedAt: Date,
    failureReason: String,
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('DeliveryAssignment', deliveryAssignmentSchema);
