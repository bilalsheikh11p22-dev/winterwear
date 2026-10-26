/**
 * Converts a product document coming from the REST API into the shape used by the storefront
 * (the same shape as the demo fixtures), so the shop, search, cards and detail page can treat
 * database products and demo products identically.
 */
const uniqueBy = (arr, keyFn) => {
  const seen = new Set();
  return arr.filter((item) => {
    const key = keyFn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export const mapApiProduct = (p) => {
  const variants = Array.isArray(p.variants) ? p.variants : [];
  const regularPrice = Number(p.regularPrice ?? p.price ?? 0);
  const salePrice = p.salePrice != null && Number(p.salePrice) < regularPrice ? Number(p.salePrice) : null;

  const inStockVariants = variants.filter((v) => v.stock == null || v.stock > 0);
  let sizes = [...new Set(inStockVariants.map((v) => v.size).filter(Boolean))];
  if (sizes.length === 0 && variants.length === 0 && (p.stockQuantity ?? 1) > 0) sizes = ['One Size'];

  let colors = uniqueBy(
    variants.map((v) => v.color).filter((c) => c && c.name),
    (c) => c.name
  );
  if (colors.length === 0) colors = [{ name: 'Default', hex: '#17191C' }];

  const images = Array.isArray(p.images) && p.images.length
    ? p.images.map((img) => ({ url: img.url, alt: img.altText || img.alt || p.name }))
    : [{ url: p.image || '', alt: p.name }];

  return {
    id: p._id || p.id,
    _id: p._id || p.id,
    sku: p.sku,
    slug: p.slug,
    name: p.name,
    description: p.description || '',
    shortDescription: p.shortDescription || '',
    category: p.category?.slug || (typeof p.category === 'string' ? p.category : ''),
    categoryName: p.category?.name || 'Winterwear',
    collection: p.collectionGender || p.collection || '',
    regularPrice,
    salePrice,
    isOnSale: salePrice != null,
    isNewArrival: !!p.isNewArrival,
    isBestSeller: !!p.isBestSeller,
    isFeatured: !!p.isFeatured,
    stockQuantity: p.stockQuantity ?? 0,
    lowStockThreshold: p.lowStockThreshold ?? 5,
    averageRating: Number(p.averageRating || p.rating || 0),
    reviewCount: p.reviewCount || 0,
    images,
    videoUrl: typeof p.videoUrl === 'string' ? p.videoUrl : p.videoUrl?.url || '',
    sizes,
    colors,
    specifications: p.specifications || [],
    materials: p.materials || [],
    careInstructions: p.careInstructions || [],
    createdAt: p.createdAt,
  };
};
