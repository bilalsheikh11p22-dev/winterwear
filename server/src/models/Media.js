import mongoose from 'mongoose';

const mediaSchema = new mongoose.Schema(
  {
    filename: {
      type: String,
      required: true,
      trim: true,
    },
    publicId: {
      type: String,
      required: [true, 'Cloudinary public_id is required'],
      unique: true,
      trim: true,
      index: true,
    },
    secureUrl: {
      type: String,
      required: [true, 'Secure Cloudinary asset URL is required'],
      trim: true,
    },
    resourceType: {
      type: String,
      enum: ['image', 'video', 'raw'],
      default: 'image',
      index: true,
    },
    format: {
      type: String,
      lowercase: true,
      trim: true,
    },
    mimeType: {
      type: String,
      trim: true,
    },
    width: {
      type: Number,
      default: 0,
    },
    height: {
      type: Number,
      default: 0,
    },
    duration: {
      type: Number,
      default: 0, // Video duration in seconds
    },
    bytes: {
      type: Number,
      default: 0,
    },
    category: {
      type: String,
      enum: ['product', 'banner', 'campaign', 'brand', 'lookbook', 'general'],
      default: 'general',
      index: true,
    },
    folder: {
      type: String,
      default: 'winterwear',
      index: true,
    },
    altText: {
      type: String,
      default: '',
      trim: true,
    },
    caption: {
      type: String,
      default: '',
      trim: true,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    associatedProducts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
      },
    ],
    associatedBanners: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Banner',
      },
    ],
    associatedCampaigns: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Campaign',
      },
    ],
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual to determine if the asset is currently referenced/in use
mediaSchema.virtual('inUse').get(function () {
  const prodCount = this.associatedProducts?.length || 0;
  const bannerCount = this.associatedBanners?.length || 0;
  const campCount = this.associatedCampaigns?.length || 0;
  return prodCount + bannerCount + campCount > 0;
});

// Compound indexes for searching and filtering
mediaSchema.index({ category: 1, resourceType: 1, createdAt: -1 });
mediaSchema.index({ filename: 'text', altText: 'text', tags: 'text' });

export default mongoose.model('Media', mediaSchema);
