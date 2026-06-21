import express, { Response } from 'express';
import mongoose from 'mongoose';
import Product from '../models/Product';
import StockEntry from '../models/StockEntry';
import StockItem from '../models/StockItem';
import { BillingAuthRequest } from '../middleware/billingAuthMiddleware';
import { requireAnyPermission } from '../middleware/billingRoleMiddleware';
import BillingCategory from '../models/BillingCategory';
import { toEcommerceCategorySlug, toEcommerceSubCategorySlug } from '../lib/billing-ecommerce-category';
import {
  getBillingInShopSummary,
  getInShopCountsByProducts,
  getProductPriceVarianceByProducts,
  getProductPriceVariantsByProducts,
} from '../lib/stock-inventory-counts';
import { ensureSizeVariantsFromBillingStock } from '../lib/product-size-variants';

const router = express.Router();

const productStockEntryFilter = (productId: mongoose.Types.ObjectId) => ({
  $or: [{ productId }, { productIds: productId }],
});

type ProductBatchContext = {
  _id: mongoose.Types.ObjectId;
  supplier?: mongoose.Types.ObjectId;
  billingCategory?: mongoose.Types.ObjectId;
  billingSubCategory?: mongoose.Types.ObjectId;
  billingName?: string;
  name?: string;
  incomingPrice?: number;
  price?: number;
};

/** Latest purchase batch for a product size (exact match only). */
const findLatestStockEntryForSize = async (productId: mongoose.Types.ObjectId, size: string) => {
  const sizeNorm = String(size).trim();
  const entries = await StockEntry.find(productStockEntryFilter(productId))
    .sort({ entryDate: -1, createdAt: -1 })
    .select('_id size')
    .lean();
  const sized = entries.find((e) => String(e.size || '').trim() === sizeNorm);
  return sized?._id ?? null;
};

/** Create a purchase batch for a size when stock entry did not already introduce it. */
const ensureStockEntryForSize = async (
  product: ProductBatchContext,
  size: string,
  enteredBy?: mongoose.Types.ObjectId | string
) => {
  const existing = await findLatestStockEntryForSize(product._id, size);
  if (existing) return existing;

  let supplier = product.supplier;
  let category = product.billingCategory;
  let subCategory = product.billingSubCategory;
  let gstPercent = 5;

  if (!supplier || !category || !subCategory) {
    const template = await StockEntry.findOne(productStockEntryFilter(product._id))
      .sort({ entryDate: -1, createdAt: -1 })
      .select('supplier category subCategory gstPercent')
      .lean();
    if (template) {
      supplier = supplier || template.supplier;
      category = category || template.category;
      subCategory = subCategory || template.subCategory;
      gstPercent = template.gstPercent ?? 5;
    }
  }

  if (!supplier || !category || !subCategory) return null;

  const stockEntry = await StockEntry.create({
    supplier,
    category,
    subCategory,
    productName: product.billingName || product.name || '',
    quantity: 1,
    incomingPrice: product.incomingPrice ?? 0,
    sellingPrice: product.price ?? 0,
    size: String(size).trim(),
    gstPercent,
    notes: 'Added via inventory',
    barcodes: [],
    stockItemIds: [],
    productId: product._id,
    productIds: [product._id],
    enteredBy,
    entryDate: new Date(),
  });

  return stockEntry._id;
};

/** Items created from admin inventory have no batch until linked. */
const linkOrphanItemsToBatches = async (
  productId: mongoose.Types.ObjectId,
  enteredBy?: mongoose.Types.ObjectId | string
) => {
  const product = await Product.findById(productId)
    .select('supplier billingCategory billingSubCategory billingName name incomingPrice price')
    .lean();
  if (!product) return;

  const orphans = await StockItem.find({
    product: productId,
    $or: [{ stockEntry: null }, { stockEntry: { $exists: false } }],
  })
    .select('_id size')
    .lean();

  const bySize = new Map<string, mongoose.Types.ObjectId[]>();
  for (const item of orphans) {
    const size = String(item.size || '').trim();
    if (!bySize.has(size)) bySize.set(size, []);
    bySize.get(size)!.push(item._id);
  }

  for (const [size, itemIds] of bySize) {
    const entryId = await ensureStockEntryForSize(product, size, enteredBy);
    if (!entryId || !itemIds.length) continue;
    await StockItem.updateMany({ _id: { $in: itemIds } }, { $set: { stockEntry: entryId } });
  }
};

/** Keep purchase/profit batch rows in sync with live stock (qty + cost/MRP). */
const syncProductPurchaseBatches = async (
  productId: mongoose.Types.ObjectId,
  priceUpdates?: { incomingPrice?: number; sellingPrice?: number },
  enteredBy?: mongoose.Types.ObjectId | string
) => {
  await linkOrphanItemsToBatches(productId, enteredBy);

  const entries = await StockEntry.find(productStockEntryFilter(productId)).select('_id').lean();
  for (const entry of entries) {
    const items = await StockItem.find({ stockEntry: entry._id }).select('_id barcode').lean();
    const patch: Record<string, unknown> = {
      quantity: items.length,
      barcodes: items.map((i) => i.barcode),
      stockItemIds: items.map((i) => i._id),
    };
    if (priceUpdates?.incomingPrice !== undefined) patch.incomingPrice = priceUpdates.incomingPrice;
    if (priceUpdates?.sellingPrice !== undefined) patch.sellingPrice = priceUpdates.sellingPrice;
    await StockEntry.updateOne({ _id: entry._id }, { $set: patch });
  }
};
router.use(requireAnyPermission('canManageStock', 'canViewReports', 'canManageSuppliersCategories'));

router.get('/summary', async (req: BillingAuthRequest, res: Response) => {
  const inShop = await getBillingInShopSummary();
  const isSuperAdmin = req.billingAdmin?.role === 'superadmin';
  return res.json({
    totalProducts: inShop.totalProducts,
    totalUnits: inShop.totalUnits,
    totalRetailValue: inShop.totalRetailValue,
    totalCostValue: isSuperAdmin ? inShop.totalCostValue : undefined,
    expectedProfit: isSuperAdmin ? inShop.totalRetailValue - inShop.totalCostValue : undefined,
    lowStock: inShop.lowStock,
    outOfStock: inShop.outOfStock,
  });
});

router.get('/products', async (req: BillingAuthRequest, res: Response) => {
  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 25);
  const skip = (page - 1) * limit;
  const search = String(req.query.search || '').trim();
  const supplier = String(req.query.supplier || '').trim();
  const stock = String(req.query.stock || '').trim();

  const query: any = { isBillingProduct: true };
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { billingName: { $regex: search, $options: 'i' } },
      { category: { $regex: search, $options: 'i' } },
      { subCategory: { $regex: search, $options: 'i' } },
    ];
  }
  if (supplier && supplier.match(/^[0-9a-fA-F]{24}$/)) {
    query.supplier = supplier;
  }
  if (stock === 'low') query.stock = { $gt: 0, $lte: 2 };
  if (stock === 'out') query.stock = { $lte: 0 };
  if (stock === 'in') query.stock = { $gt: 0 };

  const [data, total] = await Promise.all([
    Product.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('supplier', 'name')
      .populate('billingSubCategory', 'name')
      .lean(),
    Product.countDocuments(query),
  ]);

  const productIds = data.map((d: any) => d._id);
  const [soldCounts, inShopByProduct, priceVarianceByProduct] = await Promise.all([
    StockItem.aggregate([
      { $match: { status: 'sold', product: { $in: productIds } } },
      { $group: { _id: '$product', count: { $sum: 1 } } },
    ]),
    getInShopCountsByProducts(productIds),
    getProductPriceVarianceByProducts(productIds),
  ]);
  const soldMap = new Map<string, number>(soldCounts.map((s: any) => [String(s._id), Number(s.count || 0)]));

  const isSuperAdmin = req.billingAdmin?.role === 'superadmin';
  return res.json({
    data: data.map((product: any) => {
      const productKey = String(product._id);
      const inShop = inShopByProduct.get(productKey) || { stockInShop: 0, sizeStockInShop: [] };
      const priceVariance = priceVarianceByProduct.get(productKey) || {
        hasMultiplePrices: false,
        sellingPrices: [],
        priceVariants: [],
      };
      const row = {
        ...product,
        name: product.billingName || product.name,
        sold: soldMap.get(productKey) || 0,
        stockInShop: inShop.stockInShop,
        sizeStockInShop: inShop.sizeStockInShop,
        stock: inShop.stockInShop,
        hasMultiplePrices: priceVariance.hasMultiplePrices,
        sellingPrices: priceVariance.sellingPrices,
        priceVariants: priceVariance.priceVariants,
      };
      if (!isSuperAdmin) {
        delete (row as any).incomingPrice;
      }
      return row;
    }),
    total,
    page,
    limit,
  });
});

router.get('/entries', async (req: BillingAuthRequest, res: Response) => {
  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 20);
  const skip = (page - 1) * limit;
  const enteredBy = String(req.query.enteredBy || '').trim();

  const query: Record<string, unknown> = {};
  if (enteredBy && mongoose.Types.ObjectId.isValid(enteredBy)) {
    const canFilter =
      req.billingAdmin?.role === 'superadmin' ||
      Boolean(req.billingAdmin?.permissions?.canManageAdmins);
    if (!canFilter) {
      return res.status(403).json({ message: 'Permission denied to filter by staff' });
    }
    query.enteredBy = new mongoose.Types.ObjectId(enteredBy);
  }
  const startDate = String(req.query.startDate || '').trim();
  const endDate = String(req.query.endDate || '').trim();
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) (query.createdAt as any).$gte = new Date(`${startDate}T00:00:00.000Z`);
    if (endDate) (query.createdAt as any).$lte = new Date(`${endDate}T23:59:59.999Z`);
  }

  const [data, total] = await Promise.all([
    StockEntry.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('supplier', 'name')
      .populate('category', 'name')
      .populate('subCategory', 'name')
      .populate('enteredBy', 'name email')
      .lean(),
    StockEntry.countDocuments(query),
  ]);

  return res.json({ data, total, page, limit });
});

router.put('/products/:id', async (req: BillingAuthRequest, res: Response) => {
  try {
    const productId = req.params.id;
    const updates = req.body;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (updates.name !== undefined) {
      product.name = String(updates.name).trim();
      product.billingName = String(updates.name).trim(); // Keep billingName in sync so it reflects in the UI
    }
    if (updates.billingName !== undefined) product.billingName = String(updates.billingName).trim();
    const varianceMap = await getProductPriceVarianceByProducts([product._id]);
    const priceVariance = varianceMap.get(String(product._id));
    const hasMultiplePrices = Boolean(priceVariance?.hasMultiplePrices);
    const variantUpdates = Array.isArray(updates.priceVariantUpdates) ? updates.priceVariantUpdates : [];
    let variantPricesChanged = false;

    if (variantUpdates.length > 0) {
      for (const variant of variantUpdates) {
        const fromSellingPrice = Number(variant.fromSellingPrice);
        const toSellingPrice = Number(variant.toSellingPrice);
        if (!Number.isFinite(fromSellingPrice) || !Number.isFinite(toSellingPrice)) continue;
        if (fromSellingPrice === toSellingPrice && variant.toIncomingPrice === undefined) continue;

        const stockPatch: Record<string, number> = { sellingPrice: toSellingPrice };
        if (variant.toIncomingPrice !== undefined && Number.isFinite(Number(variant.toIncomingPrice))) {
          stockPatch.incomingPrice = Number(variant.toIncomingPrice);
        }

        const stockFilter = {
          product: product._id,
          sellingPrice: fromSellingPrice,
          status: { $in: ['available', 'returned'] },
        };

        const affectedItems = await StockItem.find(stockFilter).select('_id stockEntry').lean();
        if (!affectedItems.length) continue;

        await StockItem.updateMany(stockFilter, { $set: stockPatch });
        variantPricesChanged = true;

        const entryIds = [
          ...new Set(
            affectedItems
              .map((item) => item.stockEntry?.toString())
              .filter((id): id is string => Boolean(id))
          ),
        ];
        for (const entryId of entryIds) {
          const entryPatch: Record<string, number> = { sellingPrice: toSellingPrice };
          if (stockPatch.incomingPrice !== undefined) entryPatch.incomingPrice = stockPatch.incomingPrice;
          await StockEntry.updateOne({ _id: entryId }, { $set: entryPatch });
        }
      }

      const variantMap = await getProductPriceVariantsByProducts([product._id]);
      const variants = variantMap.get(String(product._id)) || [];
      if (variants.length) {
        const topVariant = [...variants].sort((a, b) => b.stock - a.stock)[0];
        product.price = topVariant.sellingPrice;
        product.incomingPrice = topVariant.incomingPrice;
      }
    }

    if (updates.price !== undefined && variantUpdates.length === 0) {
      if (hasMultiplePrices) {
        return res.status(400).json({
          message: 'This product has multiple prices. Edit each price variant individually.',
        });
      }
      product.price = Number(updates.price);
      await StockItem.updateMany({ product: product._id }, { $set: { sellingPrice: product.price } });
    }
    if (updates.incomingPrice !== undefined && variantUpdates.length === 0) {
      if (hasMultiplePrices) {
        return res.status(400).json({
          message: 'This product has multiple prices. Edit each price variant individually.',
        });
      }
      product.incomingPrice = Number(updates.incomingPrice);
      await StockItem.updateMany({ product: product._id }, { $set: { incomingPrice: product.incomingPrice } });
    }

    // Handle billingCategory (ObjectId) → also update category name string
    if (updates.billingCategory !== undefined) {
      if (updates.billingCategory && String(updates.billingCategory).match(/^[0-9a-fA-F]{24}$/)) {
        (product as any).billingCategory = updates.billingCategory;
        const catDoc = await BillingCategory.findById(updates.billingCategory).select('name').lean();
        if (catDoc) product.category = toEcommerceCategorySlug(catDoc.name);
      }
    } else if (updates.category !== undefined) {
      product.category = String(updates.category).trim();
    }

    // Handle billingSubCategory (ObjectId) → also update subCategory name string
    if (updates.billingSubCategory !== undefined) {
      if (updates.billingSubCategory && String(updates.billingSubCategory).match(/^[0-9a-fA-F]{24}$/)) {
        (product as any).billingSubCategory = updates.billingSubCategory;
        const subDoc = await BillingCategory.findById(updates.billingSubCategory).select('name').lean();
        if (subDoc) product.subCategory = toEcommerceSubCategorySlug(subDoc.name);
      }
    } else if (updates.subCategory !== undefined) {
      product.subCategory = String(updates.subCategory).trim();
    }

    if (updates.supplier !== undefined) {
      if (!updates.supplier) {
        product.supplier = undefined;
      } else if (String(updates.supplier).match(/^[0-9a-fA-F]{24}$/)) {
        product.supplier = updates.supplier;
      }
      // Ignore invalid supplier values (e.g. display names) so we don't clear the existing link
    }

    if (updates.notes !== undefined) {
      product.notes = String(updates.notes).trim();
    }

    // Handle sizeEntries (updating stock quantities)
    if (updates.sizeEntries && Array.isArray(updates.sizeEntries)) {
      const getBarcodePrefix = (date = new Date()) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `SW${y}${m}${d}`;
      };

      const parseSequence = (barcode: string) => {
        const seq = barcode.slice(-4);
        const n = Number(seq);
        return Number.isFinite(n) ? n : 0;
      };

      const generateBarcodes = async (quantity: number) => {
        const prefix = getBarcodePrefix();
        const latest = await StockItem.findOne({ barcode: { $regex: `^${prefix}` } })
          .sort({ barcode: -1 })
          .select('barcode')
          .lean();
        let start = latest?.barcode ? parseSequence(latest.barcode) + 1 : 1;
        while (true) {
          const barcodes = Array.from({ length: quantity }, (_, i) => `${prefix}${String(start + i).padStart(4, '0')}`);
          const existing = await StockItem.find({ barcode: { $in: barcodes } }).select('barcode').lean();
          if (existing.length === 0) return barcodes;
          const maxExisting = Math.max(...existing.map((doc: any) => parseSequence(doc.barcode)));
          start = Math.max(start + quantity, maxExisting + 1);
          if (start + quantity >= 9999) throw new Error('Unable to generate unique barcode range for today');
        }
      };

      const providedSizes = new Set(updates.sizeEntries.map((e: any) => String(e.size).trim()));
      const existingSizes = (product.sizes || []).map(s => String(s).trim());

      const allEntries = [...updates.sizeEntries];
      for (const es of existingSizes) {
        if (!providedSizes.has(es)) {
          allEntries.push({ size: es, quantity: 0 });
        }
      }

      for (const entry of allEntries) {
        const size = String(entry.size).trim();
        const desiredQuantity = Number(entry.quantity);
        if (!size || !Number.isFinite(desiredQuantity) || desiredQuantity < 0) continue;

        const currentTotalStockForSize = await StockItem.countDocuments({ product: product._id, size });
        const diff = desiredQuantity - currentTotalStockForSize;

        if (diff > 0) {
          const barcodes = await generateBarcodes(diff);
          const stockEntryId = await ensureStockEntryForSize(product, size, req.billingAdminId);
          await StockItem.insertMany(
            barcodes.map((barcode) => ({
              barcode,
              product: product._id,
              size,
              incomingPrice: product.incomingPrice,
              sellingPrice: product.price,
              supplier: product.supplier,
              ...(stockEntryId ? { stockEntry: stockEntryId } : {}),
              status: 'available',
            }))
          );
        } else if (diff < 0) {
          // Delete available barcodes
          const toDelete = Math.abs(diff);
          const availableItems = await StockItem.find({ product: product._id, size, status: 'available' })
            .limit(toDelete)
            .select('_id');

          if (availableItems.length > 0) {
            await StockItem.deleteMany({ _id: { $in: availableItems.map((i) => i._id) } });
          }
        }
      }

      // Re-calculate master product aggregates
      const allItems = await StockItem.aggregate([
        { $match: { product: product._id } },
        { $group: { _id: '$size', count: { $sum: 1 } } }
      ]);
      const newSizeStock = allItems.map((item) => ({ size: String(item._id), stock: Number(item.count) }));
      (product as any).sizeStock = newSizeStock;
      (product as any).totalStock = newSizeStock.reduce((sum, s) => sum + s.stock, 0);
      product.stock = (product as any).totalStock;
      product.sizes = newSizeStock.map((s) => s.size);
      // Billing products: don't auto-activate based on stock.
      // Admin must manually toggle visibility after adding images etc.
      if (!product.isBillingProduct) {
        product.isActive = product.stock > 0;
      }
    }

    await product.save();

    if (product.isEcommerceProduct !== false) {
      await ensureSizeVariantsFromBillingStock(product._id, product.slug);
    }

    const priceUpdates: { incomingPrice?: number; sellingPrice?: number } = {};
    if (updates.incomingPrice !== undefined && variantUpdates.length === 0) {
      priceUpdates.incomingPrice = product.incomingPrice;
    }
    if (updates.price !== undefined && variantUpdates.length === 0) {
      priceUpdates.sellingPrice = product.price;
    }
    const shouldSyncBatches =
      Boolean(updates.sizeEntries) ||
      (updates.incomingPrice !== undefined && variantUpdates.length === 0) ||
      (updates.price !== undefined && variantUpdates.length === 0);
    if (shouldSyncBatches) {
      await syncProductPurchaseBatches(
        product._id,
        Object.keys(priceUpdates).length ? priceUpdates : undefined,
        req.billingAdminId
      );
    } else if (variantPricesChanged) {
      await linkOrphanItemsToBatches(product._id, req.billingAdminId);
    }

    res.json(product);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

export default router;
