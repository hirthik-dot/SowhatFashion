import mongoose from 'mongoose';
import slugify from 'slugify';
import ProductVariant from '../models/ProductVariant';

export type ProductVariantRecord = {
  _id: mongoose.Types.ObjectId | string;
  parentProductId: mongoose.Types.ObjectId | string;
  sizeVariantId?: mongoose.Types.ObjectId | string;
  slug: string;
  colorName: string;
  colorHex: string;
  images: string[];
  price?: number;
  discountPrice?: number;
  stock?: number;
  sku?: string;
  sortOrder: number;
  isActive: boolean;
};

export const buildColorVariantSlug = (baseSlug: string, colorName: string) => {
  const base = String(baseSlug || '').trim();
  const colorPart = slugify(String(colorName || 'variant'), { lower: true, strict: true });
  return `${base}-${colorPart}`;
};

export const uniqueVariantSlug = async (baseSlug: string, colorName: string, excludeId?: string) => {
  let candidate = buildColorVariantSlug(baseSlug, colorName);
  let counter = 1;
  while (true) {
    const filter: Record<string, unknown> = { slug: candidate };
    if (excludeId) filter._id = { $ne: new mongoose.Types.ObjectId(excludeId) };
    const existing = await ProductVariant.findOne(filter).select('_id').lean();
    if (!existing) return candidate;
    counter += 1;
    candidate = `${buildColorVariantSlug(baseSlug, colorName)}-${counter}`;
  }
};

export function resolveVariantFields(parent: Record<string, unknown>, variant: ProductVariantRecord) {
  const price =
    variant.price != null && variant.price >= 0 ? variant.price : Number(parent.price) || 0;
  const discountPrice =
    variant.discountPrice != null && variant.discountPrice >= 0
      ? variant.discountPrice
      : Number(parent.discountPrice) || 0;
  const stock =
    variant.stock != null && variant.stock >= 0 ? variant.stock : Number(parent.stock) || 0;
  const sku = variant.sku?.trim() ? variant.sku : String(parent.sku || '');

  return { price, discountPrice, stock, sku };
}

export function buildColorVariantPayload(
  parent: Record<string, unknown>,
  variant: ProductVariantRecord,
  siblings: ProductVariantRecord[] = []
) {
  const { price, discountPrice, stock } = resolveVariantFields(parent, variant);
  const images = variant.images?.length ? variant.images : (parent.images as string[]) || [];
  const activeSiblings = siblings.filter((s) => s.isActive !== false);

  return {
    _id: String(variant._id),
    slug: variant.slug,
    colorName: variant.colorName,
    colorHex: variant.colorHex,
    images: variant.images?.length ? variant.images : [],
    price,
    discountPrice,
    stock,
    isActive: variant.isActive !== false,
    thumbnail: (variant.images?.[0] || images[0] || (parent.images as string[])?.[0]) ?? '',
  };
}

export function buildColorVariantsList(
  parent: Record<string, unknown>,
  variants: ProductVariantRecord[]
) {
  const active = variants.filter((v) => v.isActive !== false);
  return active.map((v) => buildColorVariantPayload(parent, v, active));
}

export function mergeVariantWithParent(
  parent: Record<string, unknown>,
  variant: ProductVariantRecord,
  siblings: ProductVariantRecord[] = []
) {
  const { price, discountPrice, stock, sku } = resolveVariantFields(parent, variant);
  const images = variant.images?.length ? variant.images : (parent.images as string[]) || [];
  const activeSiblings = siblings.filter((s) => s.isActive !== false);

  return {
    ...parent,
    _id: parent._id,
    slug: variant.slug,
    name: parent.name,
    images,
    price,
    discountPrice,
    stock,
    sku,
    variantId: String(variant._id),
    parentProductId: String(parent._id),
    sizeVariantId: variant.sizeVariantId ? String(variant.sizeVariantId) : undefined,
    colorName: variant.colorName,
    colorHex: variant.colorHex,
    isColorVariant: true,
    variants: buildColorVariantsList(parent, activeSiblings),
    // Legacy shape for components still reading colors[]
    colors: activeSiblings.map((s) => ({
      name: s.colorName,
      hex: s.colorHex,
      slug: s.slug,
      _id: String(s._id),
    })),
  };
}

const productLevelVariantFilter = {
  $or: [{ sizeVariantId: null }, { sizeVariantId: { $exists: false } }],
};

export async function getVariantsByProductIds(
  productIds: Array<mongoose.Types.ObjectId | string>,
  opts?: { productLevelOnly?: boolean }
): Promise<Map<string, ProductVariantRecord[]>> {
  const ids = productIds.filter(Boolean).map((id) => new mongoose.Types.ObjectId(String(id)));
  const result = new Map<string, ProductVariantRecord[]>();
  if (!ids.length) return result;

  const filter: Record<string, unknown> = { parentProductId: { $in: ids } };
  if (opts?.productLevelOnly !== false) {
    Object.assign(filter, productLevelVariantFilter);
  }

  const variants = (await ProductVariant.find(filter)
    .sort({ sortOrder: 1, createdAt: 1 })
    .lean()) as ProductVariantRecord[];

  for (const id of ids) {
    result.set(String(id), []);
  }
  for (const variant of variants) {
    const key = String(variant.parentProductId);
    result.get(key)?.push(variant);
  }
  return result;
}

export async function getVariantsBySizeVariantIds(
  sizeVariantIds: Array<mongoose.Types.ObjectId | string>
): Promise<Map<string, ProductVariantRecord[]>> {
  const ids = sizeVariantIds.filter(Boolean).map((id) => new mongoose.Types.ObjectId(String(id)));
  const result = new Map<string, ProductVariantRecord[]>();
  if (!ids.length) return result;

  const variants = (await ProductVariant.find({ sizeVariantId: { $in: ids } })
    .sort({ sortOrder: 1, createdAt: 1 })
    .lean()) as ProductVariantRecord[];

  for (const id of ids) {
    result.set(String(id), []);
  }
  for (const variant of variants) {
    const key = String(variant.sizeVariantId);
    result.get(key)?.push(variant);
  }
  return result;
}

export async function getVariantsForSizeVariant(
  sizeVariantId: mongoose.Types.ObjectId | string
): Promise<ProductVariantRecord[]> {
  return (await ProductVariant.find({
    sizeVariantId: new mongoose.Types.ObjectId(String(sizeVariantId)),
  })
    .sort({ sortOrder: 1, createdAt: 1 })
    .lean()) as ProductVariantRecord[];
}

export async function getVariantBySlug(slug: string): Promise<{
  variant: ProductVariantRecord;
  siblings: ProductVariantRecord[];
} | null> {
  const variant = (await ProductVariant.findOne({ slug, isActive: true }).lean()) as ProductVariantRecord | null;
  if (!variant) return null;

  const siblingFilter: Record<string, unknown> = {
    parentProductId: variant.parentProductId,
    isActive: true,
  };
  if (variant.sizeVariantId) {
    siblingFilter.sizeVariantId = variant.sizeVariantId;
  } else {
    siblingFilter.$or = [{ sizeVariantId: null }, { sizeVariantId: { $exists: false } }];
  }

  const siblings = (await ProductVariant.find(siblingFilter)
    .sort({ sortOrder: 1, createdAt: 1 })
    .lean()) as ProductVariantRecord[];
  return { variant, siblings };
}

export function pickDefaultVariant(variants: ProductVariantRecord[]): ProductVariantRecord | null {
  if (!variants.length) return null;
  const active = variants.filter((v) => v.isActive !== false);
  const pool = active.length ? active : variants;
  const inStock = pool.find((v) => (v.stock ?? 0) > 0);
  return inStock || pool[0];
}

export async function applyDefaultVariantToProduct(parent: Record<string, unknown>): Promise<Record<string, unknown>> {
  const variantsMap = await getVariantsByProductIds([parent._id as mongoose.Types.ObjectId]);
  const variants = variantsMap.get(String(parent._id)) || [];
  if (!variants.length) return parent;

  const defaultVariant = pickDefaultVariant(variants);
  if (!defaultVariant) return parent;

  return mergeVariantWithParent(parent, defaultVariant, variants);
}

export async function attachVariantsForListing(products: Record<string, unknown>[]): Promise<Record<string, unknown>[]> {
  const ids = products.map((p) => p._id).filter(Boolean);
  const variantsMap = await getVariantsByProductIds(ids as mongoose.Types.ObjectId[], {
    productLevelOnly: true,
  });

  return products.map((product) => {
    const variants = variantsMap.get(String(product._id)) || [];
    if (!variants.length) return product;

    const defaultVariant = pickDefaultVariant(variants);
    if (!defaultVariant) return product;

    const merged = mergeVariantWithParent(product, defaultVariant, variants);
    return {
      ...merged,
      hasColorVariants: variants.length > 1,
      variantCount: variants.length,
    };
  });
}

export type VariantInput = {
  _id?: string;
  slug?: string;
  colorName: string;
  colorHex?: string;
  images?: string[];
  price?: number | null;
  discountPrice?: number | null;
  stock?: number | null;
  sku?: string;
  sortOrder?: number;
  isActive?: boolean;
  sizeVariantId?: string;
};

export async function syncProductVariants(
  productId: mongoose.Types.ObjectId | string,
  baseSlug: string,
  variants: VariantInput[],
  sizeVariantId?: mongoose.Types.ObjectId | string | null
) {
  const parentId = new mongoose.Types.ObjectId(String(productId));
  const sizeId = sizeVariantId ? new mongoose.Types.ObjectId(String(sizeVariantId)) : null;

  const existingFilter: Record<string, unknown> = { parentProductId: parentId };
  if (sizeId) {
    existingFilter.sizeVariantId = sizeId;
  } else {
    existingFilter.$or = [{ sizeVariantId: null }, { sizeVariantId: { $exists: false } }];
  }

  const existing = await ProductVariant.find(existingFilter).lean();
  const existingIds = new Set(existing.map((v) => String(v._id)));
  const keptIds = new Set<string>();

  for (let i = 0; i < variants.length; i++) {
    const input = variants[i];
    if (!input.colorName?.trim()) continue;

    const payload: Record<string, unknown> = {
      parentProductId: parentId,
      colorName: input.colorName.trim(),
      colorHex: input.colorHex?.trim() || '#000000',
      images: Array.isArray(input.images) ? input.images.filter(Boolean) : [],
      price: input.price != null && input.price >= 0 ? input.price : undefined,
      discountPrice:
        input.discountPrice != null && input.discountPrice >= 0 ? input.discountPrice : undefined,
      stock: input.stock != null && input.stock >= 0 ? input.stock : undefined,
      sku: input.sku?.trim() || '',
      sortOrder: input.sortOrder ?? i,
      isActive: input.isActive !== false,
    };

    if (sizeId) {
      payload.sizeVariantId = sizeId;
    }

    if (input._id && existingIds.has(String(input._id))) {
      const slug =
        input.slug?.trim() ||
        (await uniqueVariantSlug(baseSlug, input.colorName, String(input._id)));
      await ProductVariant.findByIdAndUpdate(input._id, { ...payload, slug }, { runValidators: true });
      keptIds.add(String(input._id));
    } else {
      const slug = input.slug?.trim() || (await uniqueVariantSlug(baseSlug, input.colorName));
      const created = await ProductVariant.create({ ...payload, slug });
      keptIds.add(String(created._id));
    }
  }

  const toDelete = [...existingIds].filter((id) => !keptIds.has(id));
  if (toDelete.length) {
    await ProductVariant.deleteMany({ _id: { $in: toDelete } });
  }

  const resultFilter: Record<string, unknown> = { parentProductId: parentId };
  if (sizeId) {
    resultFilter.sizeVariantId = sizeId;
  } else {
    resultFilter.$or = [{ sizeVariantId: null }, { sizeVariantId: { $exists: false } }];
  }

  return ProductVariant.find(resultFilter).sort({ sortOrder: 1 }).lean();
}
