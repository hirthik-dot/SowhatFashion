import mongoose from 'mongoose';
import StockItem from '../models/StockItem';
import { BILLABLE_STATUSES, compareSizes } from './stock-inventory-counts';
import { attachVariantsForListing } from './product-color-variants';
import {
  attachSizeVariantsForListing,
  ensureSizeVariantsFromBillingStock,
  expandBillingProductsBySize,
  getBillingSizeDataByProducts,
  getSizeVariantsByProductIds,
  mergeSizeVariantWithParent,
} from './product-size-variants';

export type EcommercePriceVariant = {
  sellingPrice: number;
  incomingPrice: number;
  stock: number;
  sizes: string[];
  sizeStock: { size: string; stock: number }[];
};

const variantSlugSuffix = (price: number) => `p${Math.round(Number(price || 0))}`;

export const buildPriceVariantSlug = (baseSlug: string, sellingPrice: number) =>
  `${String(baseSlug || '').trim()}-${variantSlugSuffix(sellingPrice)}`;

export const parsePriceVariantSlug = (slug: string): { baseSlug: string; sellingPrice: number } | null => {
  const match = String(slug || '').match(/^(.*)-p(\d+)$/i);
  if (!match) return null;
  return { baseSlug: match[1], sellingPrice: Number(match[2]) };
};

/** @deprecated Use getBillingSizeDataByProducts from product-size-variants instead */
export async function getEcommerceVariantsByProducts(
  productIds: Array<mongoose.Types.ObjectId | string>
): Promise<Map<string, EcommercePriceVariant[]>> {
  const ids = productIds
    .filter(Boolean)
    .map((id) => new mongoose.Types.ObjectId(String(id)));
  const result = new Map<string, EcommercePriceVariant[]>();
  if (!ids.length) return result;

  const rows = await StockItem.aggregate([
    { $match: { product: { $in: ids }, status: { $in: [...BILLABLE_STATUSES] } } },
    {
      $group: {
        _id: { product: '$product', sellingPrice: '$sellingPrice', size: '$size' },
        count: { $sum: 1 },
        incomingPrice: { $first: '$incomingPrice' },
      },
    },
  ]);

  const byProduct = new Map<string, Map<number, EcommercePriceVariant>>();

  for (const row of rows) {
    const productKey = String(row._id?.product || '');
    const sellingPrice = Number(row._id?.sellingPrice || 0);
    const size = String(row._id?.size || '').trim() || '-';
    const count = Number(row.count || 0);
    if (!productKey) continue;

    if (!byProduct.has(productKey)) byProduct.set(productKey, new Map());
    const priceMap = byProduct.get(productKey)!;
    if (!priceMap.has(sellingPrice)) {
      priceMap.set(sellingPrice, {
        sellingPrice,
        incomingPrice: Number(row.incomingPrice || 0),
        stock: 0,
        sizes: [],
        sizeStock: [],
      });
    }
    const variant = priceMap.get(sellingPrice)!;
    variant.stock += count;
    if (!variant.sizes.includes(size)) variant.sizes.push(size);
    const sizeRow = variant.sizeStock.find((entry) => entry.size === size);
    if (sizeRow) sizeRow.stock += count;
    else variant.sizeStock.push({ size, stock: count });
  }

  for (const id of ids) {
    const key = String(id);
    const priceMap = byProduct.get(key);
    const variants = priceMap
      ? [...priceMap.values()]
          .map((variant) => ({
            ...variant,
            sizes: [...variant.sizes].sort(compareSizes),
            sizeStock: [...variant.sizeStock].sort((a, b) => compareSizes(a.size, b.size)),
          }))
          .sort((a, b) => a.sellingPrice - b.sellingPrice)
      : [];
    result.set(key, variants);
  }

  return result;
}

export function applyEcommerceVariant(product: any, variant: EcommercePriceVariant, splitListing: boolean) {
  const base = typeof product.toObject === 'function' ? product.toObject() : { ...product };
  const roundedPrice = Math.round(variant.sellingPrice);
  const payload = {
    ...base,
    price: variant.sellingPrice,
    incomingPrice: variant.incomingPrice,
    stock: variant.stock,
    sizes: variant.sizes,
    sizeStock: variant.sizeStock,
    totalStock: variant.stock,
    priceVariant: variant.sellingPrice,
    parentProductId: String(base._id),
  };

  if (!splitListing) return payload;

  return {
    ...payload,
    name: `${base.name} (₹${roundedPrice})`,
    slug: buildPriceVariantSlug(base.slug, variant.sellingPrice),
    isPriceVariant: true,
  };
}

const normalizeProduct = (product: any) =>
  typeof product?.toObject === 'function' ? product.toObject() : { ...product };

export async function expandProductsForEcommerce(products: any[]): Promise<any[]> {
  const withColorVariants = await attachVariantsForListing(products);
  return attachSizeVariantsForListing(withColorVariants);
}

export async function expandPopulatedProductsForEcommerce(products: any[]): Promise<any[]> {
  if (!products?.length) return [];
  return expandProductsForEcommerce(products.filter(Boolean));
}

/** Resolve a billing product merged with live stock for a single size slug */
export async function resolveBillingProductForSizeSlug(
  product: Record<string, unknown>,
  sizeSlug: string
): Promise<Record<string, unknown> | null> {
  const sizeVariantsMap = await getSizeVariantsByProductIds([product._id as mongoose.Types.ObjectId]);
  const variants = sizeVariantsMap.get(String(product._id)) || [];
  const variant = variants.find((v) => v.slug === sizeSlug);
  if (!variant) return null;

  const billingMap = await getBillingSizeDataByProducts([product._id as mongoose.Types.ObjectId]);
  const billingSizes = billingMap.get(String(product._id)) || [];
  const billingBySize = new Map(billingSizes.map((b) => [b.sizeName, b]));

  return mergeSizeVariantWithParent(
    product,
    variant,
    billingBySize.get(variant.sizeName),
    variants.filter((v) => v.isActive !== false),
    billingBySize
  );
}

export {
  getBillingSizeDataByProducts,
  getSizeVariantsByProductIds,
  mergeSizeVariantWithParent,
  ensureSizeVariantsFromBillingStock,
};
