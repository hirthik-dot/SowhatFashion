import mongoose from 'mongoose';
import StockItem from '../models/StockItem';

/** Units physically in the shop (sellable, returned awaiting restock, or damaged). */
export const IN_SHOP_STATUSES = ['available', 'returned', 'damaged'] as const;

/** Units that can be scanned and sold at billing (returned items are resellable). */
export const BILLABLE_STATUSES = ['available', 'returned'] as const;

const SIZE_RANK = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', '2XL', '3XL', '4XL', '5XL'];

const sizeSortKey = (size: string) => {
  const normalized = String(size || '').trim().toUpperCase();
  const rank = SIZE_RANK.indexOf(normalized);
  if (rank >= 0) return rank;
  const numeric = Number(normalized);
  if (Number.isFinite(numeric) && normalized !== '') return 100 + numeric;
  return 1000;
};

export const compareSizes = (a: string, b: string) => {
  const diff = sizeSortKey(a) - sizeSortKey(b);
  if (diff !== 0) return diff;
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
};

export type SizeStockInShopRow = {
  size: string;
  stock: number;
  available: number;
  returned: number;
  damaged: number;
};

export type ProductInShopCounts = {
  stockInShop: number;
  sizeStockInShop: SizeStockInShopRow[];
};

export type ProductStockBreakdown = {
  totalInShop: number;
  totalUnits: number;
  sizes: Array<{
    size: string;
    available: number;
    returned: number;
    damaged: number;
    sold: number;
    inShop: number;
  }>;
};

const emptySizeRow = (size: string) => ({
  size,
  available: 0,
  returned: 0,
  damaged: 0,
  sold: 0,
  inShop: 0,
});

export const buildBreakdownFromAggregateRows = (
  rows: Array<{ _id?: { size?: string; status?: string }; count?: number }>
): ProductStockBreakdown => {
  const bySize = new Map<string, ReturnType<typeof emptySizeRow>>();

  for (const row of rows) {
    const size = String(row._id?.size || '').trim() || '-';
    const status = String(row._id?.status || '').trim();
    const count = Number(row.count || 0);
    if (!bySize.has(size)) bySize.set(size, emptySizeRow(size));
    const entry = bySize.get(size)!;
    if (status === 'available') entry.available += count;
    else if (status === 'returned') entry.returned += count;
    else if (status === 'damaged') entry.damaged += count;
    else if (status === 'sold') entry.sold += count;
    if ((IN_SHOP_STATUSES as readonly string[]).includes(status)) {
      entry.inShop += count;
    }
  }

  const sizes = [...bySize.values()].sort((a, b) => compareSizes(a.size, b.size));
  return {
    totalInShop: sizes.reduce((sum, row) => sum + row.inShop, 0),
    totalUnits: sizes.reduce((sum, row) => sum + row.inShop + row.sold, 0),
    sizes,
  };
};

export const breakdownToProductCounts = (breakdown: ProductStockBreakdown): ProductInShopCounts => ({
  stockInShop: breakdown.totalInShop,
  sizeStockInShop: breakdown.sizes.map((row) => ({
    size: row.size,
    stock: row.inShop,
    available: row.available,
    returned: row.returned,
    damaged: row.damaged,
  })),
});

export async function getProductStockBreakdown(
  productId: mongoose.Types.ObjectId | string
): Promise<ProductStockBreakdown> {
  const rows = await StockItem.aggregate([
    { $match: { product: new mongoose.Types.ObjectId(String(productId)) } },
    {
      $group: {
        _id: { size: '$size', status: '$status' },
        count: { $sum: 1 },
      },
    },
  ]);
  return buildBreakdownFromAggregateRows(rows);
}

export async function getInShopCountsByProducts(
  productIds: Array<mongoose.Types.ObjectId | string>
): Promise<Map<string, ProductInShopCounts>> {
  const ids = productIds
    .filter(Boolean)
    .map((id) => new mongoose.Types.ObjectId(String(id)));
  const result = new Map<string, ProductInShopCounts>();
  if (!ids.length) return result;

  const rows = await StockItem.aggregate([
    { $match: { product: { $in: ids }, status: { $in: [...IN_SHOP_STATUSES] } } },
    {
      $group: {
        _id: { product: '$product', size: '$size', status: '$status' },
        count: { $sum: 1 },
      },
    },
  ]);

  const byProduct = new Map<string, Map<string, SizeStockInShopRow>>();

  for (const row of rows) {
    const productKey = String(row._id?.product || '');
    const size = String(row._id?.size || '').trim() || '-';
    const status = String(row._id?.status || '').trim();
    const count = Number(row.count || 0);
    if (!byProduct.has(productKey)) byProduct.set(productKey, new Map());
    const sizeMap = byProduct.get(productKey)!;
    if (!sizeMap.has(size)) {
      sizeMap.set(size, { size, stock: 0, available: 0, returned: 0, damaged: 0 });
    }
    const entry = sizeMap.get(size)!;
    entry.stock += count;
    if (status === 'available') entry.available += count;
    else if (status === 'returned') entry.returned += count;
    else if (status === 'damaged') entry.damaged += count;
  }

  for (const id of ids) {
    const key = String(id);
    const sizeMap = byProduct.get(key);
    const sizeStockInShop = sizeMap
      ? [...sizeMap.values()].sort((a, b) => compareSizes(a.size, b.size))
      : [];
    const stockInShop = sizeStockInShop.reduce((sum, row) => sum + row.stock, 0);
    result.set(key, { stockInShop, sizeStockInShop });
  }

  return result;
}

export async function getBillingInShopSummary() {
  const Product = mongoose.model('Product');

  const [billingProducts, inShopRows] = await Promise.all([
    Product.find({ isBillingProduct: true }).select('_id price incomingPrice').lean(),
    StockItem.aggregate([
      { $match: { status: { $in: [...IN_SHOP_STATUSES] } } },
      { $group: { _id: '$product', count: { $sum: 1 } } },
    ]),
  ]);

  const inShopByProduct = new Map<string, number>(
    inShopRows.map((row: any) => [String(row._id), Number(row.count || 0)])
  );

  const priceByProduct = new Map<string, { price: number; incomingPrice: number }>(
    billingProducts.map((p: any) => [
      String(p._id),
      { price: Number(p.price || 0), incomingPrice: Number(p.incomingPrice || 0) },
    ])
  );

  let totalUnits = 0;
  let totalRetailValue = 0;
  let totalCostValue = 0;
  let lowStock = 0;
  let outOfStock = 0;

  for (const product of billingProducts) {
    const key = String(product._id);
    const count = inShopByProduct.get(key) || 0;
    const prices = priceByProduct.get(key) || { price: 0, incomingPrice: 0 };
    totalUnits += count;
    totalRetailValue += count * prices.price;
    totalCostValue += count * prices.incomingPrice;
    if (count <= 0) outOfStock += 1;
    else if (count <= 2) lowStock += 1;
  }

  return {
    totalProducts: billingProducts.length,
    totalUnits,
    totalRetailValue,
    totalCostValue,
    lowStock,
    outOfStock,
  };
}
