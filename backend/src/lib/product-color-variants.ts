import mongoose from 'mongoose';
import slugify from 'slugify';
import ProductVariant from '../models/ProductVariant';

export type ProductVariantRecord = {
  _id: mongoose.Types.ObjectId | string;
  parentProductId: mongoose.Types.ObjectId | string;
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
    colorName: variant.colorName,
    colorHex: variant.colorHex,
    isColorVariant: true,
    variants: activeSiblings.map((s) => ({
      _id: String(s._id),
      slug: s.slug,
      colorName: s.colorName,
      colorHex: s.colorHex,
      images: s.images?.length ? s.images : [],
      price: resolveVariantFields(parent, s).price,
      discountPrice: resolveVariantFields(parent, s).discountPrice,
      stock: resolveVariantFields(parent, s).stock,
      isActive: s.isActive !== false,
      thumbnail: (s.images?.[0] || images[0] || (parent.images as string[])?.[0]) ?? '',
    })),
    // Legacy shape for components still reading colors[]
    colors: activeSiblings.map((s) => ({
      name: s.colorName,
      hex: s.colorHex,
      slug: s.slug,
      _id: String(s._id),
    })),
  };
}

export async function getVariantsByProductIds(
  productIds: Array<mongoose.Types.ObjectId | string>
): Promise<Map<string, ProductVariantRecord[]>> {
  const ids = productIds.filter(Boolean).map((id) => new mongoose.Types.ObjectId(String(id)));
  const result = new Map<string, ProductVariantRecord[]>();
  if (!ids.length) return result;

  const variants = (await ProductVariant.find({ parentProductId: { $in: ids } })
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

export async function getVariantBySlug(slug: string): Promise<{
  variant: ProductVariantRecord;
  siblings: ProductVariantRecord[];
} | null> {
  const variant = (await ProductVariant.findOne({ slug, isActive: true }).lean()) as ProductVariantRecord | null;
  if (!variant) return null;
  const siblings = (await ProductVariant.find({
    parentProductId: variant.parentProductId,
    isActive: true,
  })
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
  const variantsMap = await getVariantsByProductIds(ids as mongoose.Types.ObjectId[]);

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
};

export async function syncProductVariants(
  productId: mongoose.Types.ObjectId | string,
  baseSlug: string,
  variants: VariantInput[]
) {
  const parentId = new mongoose.Types.ObjectId(String(productId));
  const existing = await ProductVariant.find({ parentProductId: parentId }).lean();
  const existingIds = new Set(existing.map((v) => String(v._id)));
  const keptIds = new Set<string>();

  for (let i = 0; i < variants.length; i++) {
    const input = variants[i];
    if (!input.colorName?.trim()) continue;

    const payload = {
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

  return ProductVariant.find({ parentProductId: parentId }).sort({ sortOrder: 1 }).lean();
}
