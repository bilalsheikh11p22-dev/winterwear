import mongoose from 'mongoose';

const bannerMediaSchema = new mongoose.Schema(
  {
    public_id: { type: String, default: '' },
    url: { type: String, required: true },
    altText: { type: String, default: '' },
  },
  { _id: false }
);

const bannerVideoSchema = new mongoose.Schema(
  {
    public_id: { type: String, default: '' },
    url: { type: String, default: '' },
    posterUrl: { type: String, default: '' },
    autoplay: { type: Boolean, default: true },
    loop: { type: Boolean, default: true },
    muted: { type: Boolean, default: true },
  },
  { _id: false }
);

const bannerSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Banner internal title is required'],
      trim: true,
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
    placement: {
      type: String,
      enum: [
        'hero',
        'top_announcement',
        'seasonal_sale',
        'new_arrivals',
        'best_sellers',
        'category_spotlight',
        'campaign_story',
        'mid_page_feature',
        'footer_newsletter',
        // placements offered by the admin banner form
        'category_top',
        'announcement',
        'promotional_strip',
        'sidebar',
        'cart_upsell',
        'checkout',
        'email',
      ],
      required: true,
      index: true,
    },
    desktopMedia: bannerMediaSchema,
    mobileMedia: bannerMediaSchema,
    backgroundVideo: bannerVideoSchema,
    // Legacy support fields
    mediaUrl: {
      type: String,
      default: '',
    },
    mobileMediaUrl: {
      type: String,
      default: '',
    },
    ctaText: {
      type: String,
      default: 'Explore Collection',
      trim: true,
    },
    ctaLink: {
      type: String,
      default: '/shop',
      trim: true,
    },
    targetCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
    },
    discountCode: {
      type: String,
      default: '',
      trim: true,
    },
    displayOrder: {
      type: Number,
      default: 0,
      index: true,
    },
    startDate: {
      type: Date,
      default: null,
    },
    endDate: {
      type: Date,
      default: null,
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

// Virtual to check if banner is currently active within schedule
bannerSchema.virtual('isCurrentlyActive').get(function () {
  if (!this.isActive) return false;
  const now = new Date();
  if (this.startDate && this.startDate > now) return false;
  if (this.endDate && this.endDate < now) return false;
  return true;
});

bannerSchema.index({ placement: 1, isActive: 1, displayOrder: 1 });

export default mongoose.model('Banner', bannerSchema);
