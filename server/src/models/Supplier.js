import mongoose from 'mongoose';

const supplierSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    contactPerson: String,
    email: String,
    phone: String,
    country: {
      type: String,
      default: 'Italy',
    },
    materialsSupplied: [String], // e.g. 'Virgin Wool', 'Goose Down', 'Shearling'
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('Supplier', supplierSchema);
