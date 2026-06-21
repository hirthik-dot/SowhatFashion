import mongoose from 'mongoose';
import slugify from 'slugify';
import StockItem from '../models/StockItem';
import ProductSizeVariant from '../models/ProductSizeVariant';
import {
  buildColorVariantPayload,
  buildColorVariantsList,
  getVariantsBySizeVariantIds,
  getVariantsForSizeVariant,
  mergeVariantWithParent,
  resolveVariantFields,
  type ProductVariantRecord,
} from './product-color-variants';
import { BILLABLE_STATUSES, compareSizes } from './stock-inventory-counts';

export type BillingSizeData = {
  sizeName: string;
  billingPrice: number;
  incomingPrice: number;
  stock: number;
};

export type ProductSizeVariantRecord = {
  _id: mongoose.Types.ObjectId | string;
  parentProductId: mongoose.Types.ObjectId | string;
  slug: string;
  sizeName: string;
  ecommercePrice?: number;
  ecommerceDiscountPrice?: number;
  images: string[];
  sortOrder: number;
  isActive: boolean;
};

export type SizeVariantInput = {
  _id?: string;
  slug?: string;
  sizeName: string;
  ecommercePrice?: number | null;
  ecommerceDiscountPrice?: number | null;
  images?: string[];
  sortOrder?: number;
  isActive?: boolean;
  colorVariants?: import('./product-color-variants').VariantInput[];
};

export const buildSizeVariantSlug = (baseSlug: string, sizeName: string) => {
  const base = String(baseSlug || '').trim();
  const sizePart = slugify(String(sizeName || 'size'), { lower: true, strict: true });
  return `${base}-sz-${sizePart}`;
};

export const parseSizeVariantSlug = (slug: string): { baseSlug: string; sizePart: string } | null => {
  const match = String(slug || '').match(/^(.*)-sz-([a-z0-9-]+)$/i);
  if (!match) return null;
  return { baseSlug: match[1], sizePart: match[2] };
};

export const uniqueSizeVariantSlug = async (
  baseSlug: string,
  sizeName: string,
  excludeId?: string
) => {
  let candidate = buildSizeVariantSlug(baseSlug, sizeName);
  let counter = 1;
  while (true) {
    const filter: Record<string, unknown> = { slug: candidate };
    if (excludeId) filter._id = { $ne: new mongoose.Types.ObjectId(excludeId) };
    const existing = await ProductSizeVariant.findOne(filter).select('_id').lean();
    if (!existing) return candidate;
    counter += 1;
    candidate = `${buildSizeVariantSlug(baseSlug, sizeName)}-${counter}`;
  }
};

/** Aggregate billable stock grouped by size — billing price = dominant price tier per size */
export async function getBillingSizeDataByProducts(
  productIds: Array<mongoose.Types.ObjectId | string>
): Promise<Map<string, BillingSizeData[]>> {
  const ids = productIds.filter(Boolean).map((id) => new mongoose.Types.ObjectId(String(id)));
  const result = new Map<string, BillingSizeData[]>();
  if (!ids.length) return result;

  const rows = await StockItem.aggregate([
    { $match: { product: { $in: ids }, status: { $in: [...BILLABLE_STATUSES] } } },
    {
      $group: {
        _id: { product: '$product', size: '$size', sellingPrice: '$sellingPrice' },
        count: { $sum: 1 },
        incomingPrice: { $first: '$incomingPrice' },
      },
    },
  ]);

  type SizeAgg = {
    totalStock: number;
    tiers: { sellingPrice: number; incomingPrice: number; count: number }[];
  };
  const byProductSize = new Map<string, SizeAgg>();

  for (const row of rows) {
    const productKey = String(row._id?.product || '');
    const sizeName = String(row._id?.size || '').trim() || '-';
    const sellingPrice = Number(row._id?.sellingPrice || 0);
    const count = Number(row.count || 0);
    if (!productKey) continue;

    const sizeKey = `${productKey}::${sizeName}`;
    if (!byProductSize.has(sizeKey)) {
      byProductSize.set(sizeKey, { totalStock: 0, tiers: [] });
    }
    const agg = byProductSize.get(sizeKey)!;
    agg.totalStock += count;
    agg.tiers.push({
      sellingPrice,
      incomingPrice: Number(row.incomingPrice || 0),
      count,
    });
  }

  for (const id of ids) {
    result.set(String(id), []);
  }

  for (const [sizeKey, agg] of byProductSize) {
    const [productKey, sizeName] = sizeKey.split('::');
    const dominant = [...agg.tiers].sort((a, b) => b.count - a.count)[0];
    result.get(productKey)?.push({
      sizeName,
      billingPrice: dominant?.sellingPrice ?? 0,
      incomingPrice: dominant?.incomingPrice ?? 0,
      stock: agg.totalStock,
    });
  }

  for (const [key, sizes] of result) {
    result.set(
      key,
      sizes.sort((a, b) => compareSizes(a.sizeName, b.sizeName))
    );
  }

  return result;
}

export function resolveSizeVariantPrice(
  parent: Record<string, unknown>,
  variant: ProductSizeVariantRecord,
  billingData?: BillingSizeData
) {
  const billingPrice =
    billingData?.billingPrice != null && billingData.billingPrice >= 0
      ? billingData.billingPrice
      : Number(parent.price) || 0;
  const price =
    variant.ecommercePrice != null && variant.ecommercePrice >= 0
      ? variant.ecommercePrice
      : billingPrice;
  const discountPrice =
    variant.ecommerceDiscountPrice != null && variant.ecommerceDiscountPrice >= 0
      ? variant.ecommerceDiscountPrice
      : Number(parent.discountPrice) || 0;
  const stock =
    billingData?.stock != null && billingData.stock >= 0
      ? billingData.stock
      : Number(parent.stock) || 0;

  return { price, billingPrice, discountPrice, stock };
}

export function mergeSizeVariantWithParent(
  parent: Record<string, unknown>,
  variant: ProductSizeVariantRecord,
  billingData: BillingSizeData | undefined,
  siblings: ProductSizeVariantRecord[] = [],
  billingBySize: Map<string, BillingSizeData> = new Map()
) {
  const { price, billingPrice, discountPrice, stock } = resolveSizeVariantPrice(
    parent,
    variant,
    billingData
  );
  const images = variant.images?.length ? variant.images : (parent.images as string[]) || [];
  const activeSiblings = siblings.filter((s) => s.isActive !== false);

  return {
    ...parent,
    _id: parent._id,
    slug: variant.slug,
    name: `${parent.name} (${variant.sizeName})`,
    images,
    price,
    billingPrice,
    discountPrice,
    stock,
    sizes: [variant.sizeName],
    sizeStock: [{ size: variant.sizeName, stock }],
    sizeName: variant.sizeName,
    sizeVariantId: String(variant._id),
    parentProductId: String(parent._id),
    isSizeVariant: true,
    sizeVariants: activeSiblings.map((s) => {
      const bd = billingBySize.get(s.sizeName);
      const resolved = resolveSizeVariantPrice(parent, s, bd);
      return {
        _id: String(s._id),
        slug: s.slug,
        sizeName: s.sizeName,
        images: s.images?.length ? s.images : [],
        price: resolved.price,
        billingPrice: resolved.billingPrice,
        discountPrice: resolved.discountPrice,
        stock: resolved.stock,
        isActive: s.isActive !== false,
        thumbnail: (s.images?.[0] || images[0] || (parent.images as string[])?.[0]) ?? '',
      };
    }),
  };
}

export function mergeSizeAndColorWithParent(
  parent: Record<string, unknown>,
  sizeVariant: ProductSizeVariantRecord,
  colorVariant: ProductVariantRecord,
  colorSiblings: ProductVariantRecord[],
  sizeSiblings: ProductSizeVariantRecord[] = [],
  billingData?: BillingSizeData,
  billingBySize: Map<string, BillingSizeData> = new Map()
) {
  const sizeMerged = mergeSizeVariantWithParent(
    parent,
    sizeVariant,
    billingData,
    sizeSiblings,
    billingBySize
  );
  const colorPrice = resolveVariantFields(sizeMerged, colorVariant);
  const images = colorVariant.images?.length ? colorVariant.images : sizeMerged.images;

  return {
    ...sizeMerged,
    slug: colorVariant.slug,
    images,
    price: colorPrice.price,
    discountPrice: colorPrice.discountPrice,
    stock: colorPrice.stock ?? sizeMerged.stock,
    sku: colorVariant.sku?.trim() ? colorVariant.sku : String((sizeMerged as Record<string, unknown>).sku || ''),
    variantId: String(colorVariant._id),
    colorName: colorVariant.colorName,
    colorHex: colorVariant.colorHex,
    isColorVariant: true,
    variants: buildColorVariantsList(sizeMerged, colorSiblings),
    hasColorVariants: colorSiblings.filter((s) => s.isActive !== false).length > 1,
    colors: colorSiblings
      .filter((s) => s.isActive !== false)
      .map((s) => ({
        name: s.colorName,
        hex: s.colorHex,
        slug: s.slug,
        _id: String(s._id),
      })),
  };
}

export async function attachColorVariantsToSizePage(
  sizePage: Record<string, unknown>,
  parent: Record<string, unknown>,
  sizeVariantId: mongoose.Types.ObjectId | string
) {
  const colorVariants = await getVariantsForSizeVariant(sizeVariantId);
  const active = colorVariants.filter((v) => v.isActive !== false);
  if (!active.length) return sizePage;

  return {
    ...sizePage,
    variants: buildColorVariantsList(parent, active),
    hasColorVariants: active.length > 1,
  };
}

export async function loadSizePageContext(
  parent: Record<string, unknown>,
  sizeVariant: ProductSizeVariantRecord,
  sizeSiblings: ProductSizeVariantRecord[] = []
) {
  const billingMap = await getBillingSizeDataByProducts([parent._id as mongoose.Types.ObjectId]);
  const billingSizes = billingMap.get(String(parent._id)) || [];
  const billingBySize = new Map(billingSizes.map((b) => [b.sizeName, b]));
  const sizeMerged = mergeSizeVariantWithParent(
    parent,
    sizeVariant,
    billingBySize.get(sizeVariant.sizeName),
    sizeSiblings,
    billingBySize
  );
  return attachColorVariantsToSizePage(sizeMerged, parent, sizeVariant._id);
}

export async function getSizeVariantsByProductIds(
  productIds: Array<mongoose.Types.ObjectId | string>
): Promise<Map<string, ProductSizeVariantRecord[]>> {
  const ids = productIds.filter(Boolean).map((id) => new mongoose.Types.ObjectId(String(id)));
  const result = new Map<string, ProductSizeVariantRecord[]>();
  if (!ids.length) return result;

  const variants = (await ProductSizeVariant.find({ parentProductId: { $in: ids } })
    .sort({ sortOrder: 1, createdAt: 1 })
    .lean()) as ProductSizeVariantRecord[];

  for (const id of ids) {
    result.set(String(id), []);
  }
  for (const variant of variants) {
    result.get(String(variant.parentProductId))?.push(variant);
  }
  return result;
}

export async function getSizeVariantBySlug(slug: string): Promise<{
  variant: ProductSizeVariantRecord;
  siblings: ProductSizeVariantRecord[];
} | null> {
  const variant = (await ProductSizeVariant.findOne({ slug, isActive: true }).lean()) as
    | ProductSizeVariantRecord
    | null;
  if (!variant) return null;
  const siblings = (await ProductSizeVariant.find({
    parentProductId: variant.parentProductId,
    isActive: true,
  })
    .sort({ sortOrder: 1, createdAt: 1 })
    .lean()) as ProductSizeVariantRecord[];
  return { variant, siblings };
}

export function pickDefaultSizeVariant(
  variants: ProductSizeVariantRecord[],
  billingData: BillingSizeData[] = []
): ProductSizeVariantRecord | null {
  if (!variants.length) return null;
  const active = variants.filter((v) => v.isActive !== false);
  const pool = active.length ? active : variants;
  const stockMap = new Map(billingData.map((b) => [b.sizeName, b.stock]));
  const inStock = pool.find((v) => (stockMap.get(v.sizeName) ?? 0) > 0);
  return inStock || pool[0];
}

/** Create/update size variant records from billing inventory sizes */
export async function ensureSizeVariantsFromBillingStock(
  productId: mongoose.Types.ObjectId | string,
  baseSlug: string
): Promise<ProductSizeVariantRecord[]> {
  const parentId = new mongoose.Types.ObjectId(String(productId));
  const billingMap = await getBillingSizeDataByProducts([parentId]);
  const billingSizes = billingMap.get(String(parentId)) || [];

  const existing = await ProductSizeVariant.find({ parentProductId: parentId }).lean();
  const existingBySize = new Map(existing.map((v) => [v.sizeName, v]));
  const billingSizeNames = new Set(billingSizes.map((b) => b.sizeName));

  for (let i = 0; i < billingSizes.length; i++) {
    const { sizeName } = billingSizes[i];
    const found = existingBySize.get(sizeName);
    if (found) continue;

    const slug = await uniqueSizeVariantSlug(baseSlug, sizeName);
    await ProductSizeVariant.create({
      parentProductId: parentId,
      sizeName,
      slug,
      sortOrder: i,
      isActive: true,
      images: [],
    });
  }

  // Deactivate size variants whose sizes no longer exist in billing (keep record for URL history)
  for (const variant of existing) {
    if (!billingSizeNames.has(variant.sizeName) && variant.isActive) {
      await ProductSizeVariant.findByIdAndUpdate(variant._id, { isActive: false });
    }
  }

  return (await ProductSizeVariant.find({ parentProductId: parentId })
    .sort({ sortOrder: 1, createdAt: 1 })
    .lean()) as ProductSizeVariantRecord[];
}

export async function syncProductSizeVariants(
  productId: mongoose.Types.ObjectId | string,
  baseSlug: string,
  variants: SizeVariantInput[],
  isBillingProduct = false
) {
  const parentId = new mongoose.Types.ObjectId(String(productId));

  if (isBillingProduct) {
    return ensureSizeVariantsFromBillingStock(productId, baseSlug);
  }

  const existing = await ProductSizeVariant.find({ parentProductId: parentId }).lean();
  const existingIds = new Set(existing.map((v) => String(v._id)));
  const keptIds = new Set<string>();

  for (let i = 0; i < variants.length; i++) {
    const input = variants[i];
    if (!input.sizeName?.trim()) continue;

    const payload = {
      parentProductId: parentId,
      sizeName: input.sizeName.trim(),
      images: Array.isArray(input.images) ? input.images.filter(Boolean) : [],
      ecommercePrice:
        input.ecommercePrice != null && input.ecommercePrice >= 0 ? input.ecommercePrice : undefined,
      ecommerceDiscountPrice:
        input.ecommerceDiscountPrice != null && input.ecommerceDiscountPrice >= 0
          ? input.ecommerceDiscountPrice
          : undefined,
      sortOrder: input.sortOrder ?? i,
      isActive: input.isActive !== false,
    };

    if (input._id && existingIds.has(String(input._id))) {
      const slug =
        input.slug?.trim() || (await uniqueSizeVariantSlug(baseSlug, input.sizeName, String(input._id)));
      await ProductSizeVariant.findByIdAndUpdate(input._id, { ...payload, slug }, { runValidators: true });
      keptIds.add(String(input._id));
    } else {
      const slug = input.slug?.trim() || (await uniqueSizeVariantSlug(baseSlug, input.sizeName));
      const created = await ProductSizeVariant.create({ ...payload, slug });
      keptIds.add(String(created._id));
    }
  }

  const toDelete = [...existingIds].filter((id) => !keptIds.has(id));
  if (toDelete.length) {
    await ProductSizeVariant.deleteMany({ _id: { $in: toDelete } });
  }

  return ProductSizeVariant.find({ parentProductId: parentId }).sort({ sortOrder: 1 }).lean();
}

/** Apply ecommerce-only price overrides to billing size variant records */
export async function updateBillingSizeVariantOverrides(
  productId: mongoose.Types.ObjectId | string,
  variants: SizeVariantInput[]
) {
  for (const input of variants) {
    if (!input._id || !input.sizeName?.trim()) continue;
    const setPatch: Record<string, unknown> = {};
    const unsetPatch: Record<string, 1> = {};

    if (input.ecommercePrice === null) {
      unsetPatch.ecommercePrice = 1;
    } else if (input.ecommercePrice != null && input.ecommercePrice >= 0) {
      setPatch.ecommercePrice = input.ecommercePrice;
    }

    if (input.ecommerceDiscountPrice === null) {
      unsetPatch.ecommerceDiscountPrice = 1;
    } else if (input.ecommerceDiscountPrice != null && input.ecommerceDiscountPrice >= 0) {
      setPatch.ecommerceDiscountPrice = input.ecommerceDiscountPrice;
    }

    if (Array.isArray(input.images)) setPatch.images = input.images.filter(Boolean);
    if (input.isActive !== undefined) setPatch.isActive = input.isActive !== false;

    const update: Record<string, unknown> = {};
    if (Object.keys(setPatch).length) update.$set = setPatch;
    if (Object.keys(unsetPatch).length) update.$unset = unsetPatch;
    if (!Object.keys(update).length) continue;

    await ProductSizeVariant.findOneAndUpdate({ _id: input._id, parentProductId: productId }, update, {
      runValidators: true,
    });
  }
}

export async function attachAdminSizeVariants(
  productId: mongoose.Types.ObjectId | string,
  baseSlug: string,
  isBillingProduct: boolean,
  parent?: Record<string, unknown>
) {
  let variants: ProductSizeVariantRecord[];
  if (isBillingProduct) {
    variants = await ensureSizeVariantsFromBillingStock(productId, baseSlug);
  } else {
    const map = await getSizeVariantsByProductIds([productId]);
    variants = map.get(String(productId)) || [];
  }

  const billingMap = await getBillingSizeDataByProducts([productId]);
  const billingSizes = billingMap.get(String(productId)) || [];
  const billingBySize = new Map(billingSizes.map((b) => [b.sizeName, b]));
  const parentData = parent || {};
  const colorsMap = await getVariantsBySizeVariantIds(variants.map((v) => v._id));

  return variants.map((v) => {
    const bd = billingBySize.get(v.sizeName);
    const resolved = resolveSizeVariantPrice(parentData, v, bd);
    const colorVariants = (colorsMap.get(String(v._id)) || []).map((cv) =>
      buildColorVariantPayload(parentData, cv, colorsMap.get(String(v._id)) || [])
    );
    return {
      ...v,
      billingPrice: bd?.billingPrice ?? null,
      stock: bd?.stock ?? null,
      effectivePrice: resolved.price,
      colorVariants,
    };
  });
}

export async function attachSizeVariantsForListing(products: any[]): Promise<any[]> {
  const billingProducts = products.filter((p) => p.isBillingProduct);
  if (!billingProducts.length) {
    return products.map((p) => (typeof p?.toObject === 'function' ? p.toObject() : { ...p }));
  }

  const productIds = billingProducts.map((p) => p._id);
  const sizeVariantsMap = await getSizeVariantsByProductIds(productIds);
  const billingMap = await getBillingSizeDataByProducts(productIds);

  return products.map((product) => {
    const base = typeof product?.toObject === 'function' ? product.toObject() : { ...product };
    if (!base.isBillingProduct) return base;

    const productId = String(base._id);
    const sizeVariants = (sizeVariantsMap.get(productId) || []).filter((v) => v.isActive !== false);
    const billingSizes = billingMap.get(productId) || [];
    const billingBySize = new Map(billingSizes.map((b) => [b.sizeName, b]));

    const cleanName = String(base.name || base.billingName || '')
      .replace(/ \(₹[\d,]+\)$/, '')
      .replace(/ \([^)]+\)$/, '')
      .trim();

    const sizeVariantSummaries = sizeVariants
      .map((v) => {
        const bd = billingBySize.get(v.sizeName);
        const resolved = resolveSizeVariantPrice(base, v, bd);
        return {
          _id: String(v._id),
          slug: v.slug,
          sizeName: v.sizeName,
          price: resolved.price,
          discountPrice: resolved.discountPrice,
          stock: resolved.stock,
          isActive: v.isActive !== false,
        };
      })
      .filter((v) => v.stock > 0);

    const fallbackSummaries =
      sizeVariantSummaries.length === 0
        ? billingSizes
            .filter((b) => b.stock > 0)
            .map((b) => ({
              _id: `${productId}-${b.sizeName}`,
              slug: buildSizeVariantSlug(base.slug, b.sizeName),
              sizeName: b.sizeName,
              price: b.billingPrice,
              discountPrice: Number(base.discountPrice) || 0,
              stock: b.stock,
              isActive: true,
            }))
        : [];

    const summaries = sizeVariantSummaries.length ? sizeVariantSummaries : fallbackSummaries;
    const prices = summaries.map((s) => s.price).filter((p) => p > 0);
    const priceMin = prices.length ? Math.min(...prices) : Number(base.price) || 0;
    const priceMax = prices.length ? Math.max(...prices) : priceMin;
    const totalStock = summaries.reduce((sum, s) => sum + (s.stock ?? 0), 0);

    return {
      ...base,
      name: cleanName || base.name,
      slug: base.slug,
      parentProductId: productId,
      sizes: summaries.map((s) => s.sizeName),
      sizeVariants: summaries,
      hasSizeVariants: summaries.length > 1,
      price: priceMin,
      priceMax: priceMax > priceMin ? priceMax : undefined,
      stock: totalStock,
      isSizeVariant: false,
    };
  });
}

/** @deprecated Listing uses attachSizeVariantsForListing — keeps one card per product */
export async function expandBillingProductsBySize(products: any[]): Promise<any[]> {
  const billingProducts = products.filter((p) => p.isBillingProduct);
  if (!billingProducts.length) return products;

  const productIds = billingProducts.map((p) => p._id);
  const sizeVariantsMap = await getSizeVariantsByProductIds(productIds);
  const billingMap = await getBillingSizeDataByProducts(productIds);

  const expanded: any[] = [];

  for (const product of products) {
    if (!product.isBillingProduct) {
      expanded.push(typeof product.toObject === 'function' ? product.toObject() : { ...product });
      continue;
    }

    const productId = String(product._id);
    let sizeVariants = sizeVariantsMap.get(productId) || [];
    const billingSizes = billingMap.get(productId) || [];
    const inStockSizes = billingSizes.filter((b) => b.stock > 0);

    if (!sizeVariants.length && billingSizes.length) {
      sizeVariants = await ensureSizeVariantsFromBillingStock(product._id, product.slug);
    }

    const activeVariants = sizeVariants.filter((v) => v.isActive !== false);
    const billingBySize = new Map(billingSizes.map((b) => [b.sizeName, b]));

    const variantsToExpand =
      inStockSizes.length > 0
        ? activeVariants.filter((v) => (billingBySize.get(v.sizeName)?.stock ?? 0) > 0)
        : activeVariants;

    if (variantsToExpand.length <= 1) {
      if (variantsToExpand.length === 1) {
        const v = variantsToExpand[0];
        expanded.push(
          mergeSizeVariantWithParent(
            product,
            v,
            billingBySize.get(v.sizeName),
            activeVariants,
            billingBySize
          )
        );
      } else {
        expanded.push(typeof product.toObject === 'function' ? product.toObject() : { ...product });
      }
      continue;
    }

    for (const variant of variantsToExpand) {
      expanded.push(
        mergeSizeVariantWithParent(
          product,
          variant,
          billingBySize.get(variant.sizeName),
          activeVariants,
          billingBySize
        )
      );
    }
  }

  return expanded;
}
