import mongoose from 'mongoose';

const variantSchema = new mongoose.Schema({
  sku: {
    type: String,
    required: true,
    uppercase: true,
    trim: true,
  },
  size: {
    type: String,
    required: true,
    enum: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'One Size'],
  },
  color: {
    name: { type: String, required: true },
    hex: { type: String, required: true },
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  salePrice: {
    type: Number,
    min: 0,
    default: null,
  },
  costPrice: {
    type: Number,
    min: 0,
    default: 0,
  },
  stock: {
    type: Number,
    required: true,
    min: 0,
    default: 0,
  },
  reservedStock: {
    type: Number,
    min: 0,
    default: 0,
  },
  barcode: {
    type: String,
    default: '',
  },
});

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      maxlength: [200, 'Product name cannot exceed 200 characters'],
    },
    sku: {
      type: String,
      required: [true, 'Base SKU is required'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Product description is required'],
    },
    shortDescription: {
      type: String,
      trim: true,
      maxlength: [300, 'Short description cannot exceed 300 characters'],
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Product category is required'],
    },
    collectionGender: {
      type: String,
      enum: ["Men's Collection", "Women's Collection", "Unisex Collection", "Kids' Collection"],
      default: "Unisex Collection",
    },
    images: [
      {
        public_id: { type: String, required: true },
        url: { type: String, required: true },
        isPrimary: { type: Boolean, default: false },
        altText: { type: String, default: '' },
      },
    ],
    videoUrl: {
      public_id: { type: String, default: '' },
      url: { type: String, default: '' },
      posterUrl: { type: String, default: '' },
    },
    regularPrice: {
      type: Number,
      required: [true, 'Regular price is required'],
      min: 0,
    },
    salePrice: {
      type: Number,
      min: 0,
      default: null,
    },
    costPrice: {
      type: Number,
      min: 0,
      default: 0,
    },
    stockQuantity: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    lowStockThreshold: {
      type: Number,
      default: 5,
    },
    variants: [variantSchema],
    specifications: [
      {
        key: { type: String, required: true },
        value: { type: String, required: true },
      },
    ],
    materials: [
      {
        type: String,
      },
    ],
    careInstructions: [
      {
        type: String,
      },
    ],
    weightKg: {
      type: Number,
      default: 0.8,
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
    // First time the product became publicly visible. Drives "New Arrivals" + announcements.
    publishedAt: {
      type: Date,
      default: null,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    isNewArrival: {
      type: Boolean,
      default: false,
    },
    isBestSeller: {
      type: Boolean,
      default: false,
    },
    isOnSale: {
      type: Boolean,
      default: false,
    },
    tags: [String],
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    reviewCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

productSchema.index({ name: 'text', description: 'text', tags: 'text' });
productSchema.index({ category: 1, isPublished: 1, createdAt: -1 });
productSchema.index({ isPublished: 1, publishedAt: -1 });

// New products that are born published get a publication timestamp automatically.
productSchema.pre('validate', function (next) {
  if (this.isPublished && !this.publishedAt) this.publishedAt = new Date();
  next();
});

export default mongoose.model('Product', productSchema);
