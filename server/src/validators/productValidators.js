import { z } from 'zod';

const imageSchema = z.object({
  public_id: z.string().min(1),
  url: z.string().min(1),
  isPrimary: z.boolean().optional(),
  altText: z.string().optional(),
});

const variantSchema = z.object({
  sku: z.string().min(1),
  size: z.enum(['XS', 'S', 'M', 'L', 'XL', 'XXL', 'One Size']),
  color: z.object({ name: z.string().min(1), hex: z.string().min(1) }),
  price: z.number().nonnegative(),
  salePrice: z.number().nonnegative().nullable().optional(),
  costPrice: z.number().nonnegative().optional(),
  stock: z.number().int().nonnegative(),
});

const extraFields = {
  images: z.array(imageSchema).optional(),
  variants: z.array(variantSchema).optional(),
  tags: z.array(z.string()).optional(),
  isBestSeller: z.boolean().optional(),
};

export const createProductSchema = z.object({
  body: z.object({
    name: z.string().min(3).max(200),
    sku: z.string().min(3).toUpperCase(),
    slug: z.string().min(3).toLowerCase().optional(),
    description: z.string().min(10),
    shortDescription: z.string().max(300).optional(),
    category: z.string().min(24, 'Valid category ObjectId required'),
    collectionGender: z.enum([
      "Men's Collection",
      "Women's Collection",
      "Unisex Collection",
      "Kids' Collection",
    ]).optional(),
    regularPrice: z.number().positive(),
    salePrice: z.number().positive().nullable().optional(),
    costPrice: z.number().nonnegative().optional(),
    stockQuantity: z.number().int().nonnegative(),
    lowStockThreshold: z.number().int().nonnegative().optional(),
    specifications: z.array(z.object({ key: z.string(), value: z.string() })).optional(),
    materials: z.array(z.string()).optional(),
    careInstructions: z.array(z.string()).optional(),
    isPublished: z.boolean().optional(),
    isFeatured: z.boolean().optional(),
    isNewArrival: z.boolean().optional(),
    isOnSale: z.boolean().optional(),
    ...extraFields,
  }),
});

export const updateProductSchema = z.object({
  body: z.object({
    name: z.string().min(3).max(200).optional(),
    sku: z.string().min(3).toUpperCase().optional(),
    slug: z.string().min(3).toLowerCase().optional(),
    description: z.string().min(10).optional(),
    shortDescription: z.string().max(300).optional(),
    category: z.string().min(24).optional(),
    collectionGender: z.enum([
      "Men's Collection",
      "Women's Collection",
      "Unisex Collection",
      "Kids' Collection",
    ]).optional(),
    regularPrice: z.number().positive().optional(),
    salePrice: z.number().positive().nullable().optional(),
    costPrice: z.number().nonnegative().optional(),
    stockQuantity: z.number().int().nonnegative().optional(),
    lowStockThreshold: z.number().int().nonnegative().optional(),
    specifications: z.array(z.object({ key: z.string(), value: z.string() })).optional(),
    materials: z.array(z.string()).optional(),
    careInstructions: z.array(z.string()).optional(),
    isPublished: z.boolean().optional(),
    isFeatured: z.boolean().optional(),
    isNewArrival: z.boolean().optional(),
    isOnSale: z.boolean().optional(),
    ...extraFields,
  }),
});

export const productQuerySchema = z.object({
  query: z.object({
    category: z.string().optional(),
    collection: z.string().optional(),
    minPrice: z.coerce.number().optional(),
    maxPrice: z.coerce.number().optional(),
    size: z.string().optional(),
    color: z.string().optional(),
    search: z.string().optional(),
    sort: z.enum(['newest', 'price-low', 'price-high', 'rating', 'bestseller']).optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(50).default(12),
  }),
});
