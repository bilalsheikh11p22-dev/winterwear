import mongoose from 'mongoose';

const campaignVideoSchema = new mongoose.Schema(
  {
    public_id: { type: String, default: '' },
    secureUrl: { type: String, default: '' },
    posterUrl: { type: String, default: '' },
    duration: { type: Number, default: 0 },
    aspectRatio: { type: String, default: '16/9' },
    autoplay: { type: Boolean, default: true },
    loop: { type: Boolean, default: true },
    muted: { type: Boolean, default: true },
    playsInline: { type: Boolean, default: true },
  },
  { _id: false }
);

const campaignSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Campaign title is required'],
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    headline: {
      type: String,
      default: '',
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    targetSection: {
      type: String,
      enum: [
        'hero_video',
        'winter_collection',
        'jacket_campaign',
        'sweater_campaign',
        'accessories_campaign',
        'brand_story',
        'promotional_editorial',
      ],
      default: 'brand_story',
      index: true,
    },
    video: campaignVideoSchema,
    heroMedia: {
      type: { type: String, enum: ['image', 'video'], default: 'image' },
      url: { type: String, default: '' },
      public_id: { type: String, default: '' },
      posterUrl: { type: String, default: '' },
    },
    associatedCollection: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Collection',
    },
    associatedProducts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
      },
    ],
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
      default: () => new Date(+new Date() + 365 * 24 * 60 * 60 * 1000), // Default 1 year ahead
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Virtual to check if campaign is active within date range
campaignSchema.virtual('isCurrentlyActive').get(function () {
  if (!this.isActive) return false;
  const now = new Date();
  if (this.startDate && this.startDate > now) return false;
  if (this.endDate && this.endDate < now) return false;
  return true;
});

export default mongoose.model('Campaign', campaignSchema);
