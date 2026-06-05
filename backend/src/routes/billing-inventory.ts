import express, { Response } from 'express';
import mongoose from 'mongoose';
import Product from '../models/Product';
import StockEntry from '../models/StockEntry';
import StockItem from '../models/StockItem';
import { BillingAuthRequest } from '../middleware/billingAuthMiddleware';
import { requireAnyPermission } from '../middleware/billingRoleMiddleware';
import { getBillingInShopSummary, getInShopCountsByProducts } from '../lib/stock-inventory-counts';

const router = express.Router();

const productStockEntryFilter = (productId: mongoose.Types.ObjectId) => ({
  $or: [{ productId }, { productIds: productId }],
});

/** Latest purchase batch for a product size (inventory edits attach new units here). */
const findLatestStockEntryForSize = async (productId: mongoose.Types.ObjectId, size: string) => {
  const sizeNorm = String(size).trim();
  const entries = await StockEntry.find(productStockEntryFilter(productId))
    .sort({ entryDate: -1, createdAt: -1 })
    .select('_id size')
    .lean();
  const sized = entries.find((e) => String(e.size || '').trim() === sizeNorm);
  return sized?._id ?? entries[0]?._id ?? null;
};

/** Items created from admin inventory have no batch until linked. */
const linkOrphanItemsToBatches = async (productId: mongoose.Types.ObjectId) => {
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
    const entryId = await findLatestStockEntryForSize(productId, size);
    if (!entryId || !itemIds.length) continue;
    await StockItem.updateMany({ _id: { $in: itemIds } }, { $set: { stockEntry: entryId } });
  }
};

/** Keep purchase/profit batch rows in sync with live stock (qty + cost/MRP). */
const syncProductPurchaseBatches = async (
  productId: mongoose.Types.ObjectId,
  priceUpdates?: { incomingPrice?: number; sellingPrice?: number }
) => {
  await linkOrphanItemsToBatches(productId);

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

  const soldCounts = await StockItem.aggregate([
    { $match: { status: 'sold', product: { $in: data.map((d: any) => d._id) } } },
    { $group: { _id: '$product', count: { $sum: 1 } } },
  ]);
  const soldMap = new Map<string, number>(soldCounts.map((s: any) => [String(s._id), Number(s.count || 0)]));
  const inShopByProduct = await getInShopCountsByProducts(data.map((d: any) => d._id));

  const isSuperAdmin = req.billingAdmin?.role === 'superadmin';
  return res.json({
    data: data.map((product: any) => {
      const inShop = inShopByProduct.get(String(product._id)) || { stockInShop: 0, sizeStockInShop: [] };
      const row = {
        ...product,
        name: product.billingName || product.name,
        sold: soldMap.get(String(product._id)) || 0,
        stockInShop: inShop.stockInShop,
        sizeStockInShop: inShop.sizeStockInShop,
        stock: inShop.stockInShop,
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

router.get('/entries', async (req, res: Response) => {
  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 20);
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    StockEntry.find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('supplier', 'name')
      .populate('category', 'name')
      .populate('subCategory', 'name')
      .populate('enteredBy', 'name email')
      .lean(),
    StockEntry.countDocuments({}),
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
    if (updates.price !== undefined) {
      product.price = Number(updates.price);
      await StockItem.updateMany({ product: product._id }, { $set: { sellingPrice: product.price } });
    }
    if (updates.incomingPrice !== undefined) {
      product.incomingPrice = Number(updates.incomingPrice);
      await StockItem.updateMany({ product: product._id }, { $set: { incomingPrice: product.incomingPrice } });
    }

    // Handle billingCategory (ObjectId) → also update category name string
    if (updates.billingCategory !== undefined) {
      if (updates.billingCategory && String(updates.billingCategory).match(/^[0-9a-fA-F]{24}$/)) {
        (product as any).billingCategory = updates.billingCategory;
        const BillingCategory = require('../models/BillingCategory').default;
        const catDoc = await BillingCategory.findById(updates.billingCategory).select('name').lean();
        if (catDoc) product.category = catDoc.name;
      }
    } else if (updates.category !== undefined) {
      product.category = String(updates.category).trim();
    }

    // Handle billingSubCategory (ObjectId) → also update subCategory name string
    if (updates.billingSubCategory !== undefined) {
      if (updates.billingSubCategory && String(updates.billingSubCategory).match(/^[0-9a-fA-F]{24}$/)) {
        (product as any).billingSubCategory = updates.billingSubCategory;
        const BillingCategory = require('../models/BillingCategory').default;
        const subDoc = await BillingCategory.findById(updates.billingSubCategory).select('name').lean();
        if (subDoc) product.subCategory = subDoc.name;
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
          const stockEntryId = await findLatestStockEntryForSize(product._id, size);
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

    const priceUpdates: { incomingPrice?: number; sellingPrice?: number } = {};
    if (updates.incomingPrice !== undefined) priceUpdates.incomingPrice = product.incomingPrice;
    if (updates.price !== undefined) priceUpdates.sellingPrice = product.price;
    const shouldSyncBatches =
      Boolean(updates.sizeEntries) ||
      updates.incomingPrice !== undefined ||
      updates.price !== undefined;
    if (shouldSyncBatches) {
      await syncProductPurchaseBatches(
        product._id,
        Object.keys(priceUpdates).length ? priceUpdates : undefined
      );
    }

    res.json(product);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

export default router;
