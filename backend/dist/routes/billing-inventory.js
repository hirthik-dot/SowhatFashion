"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const mongoose_1 = __importDefault(require("mongoose"));
const Product_1 = __importDefault(require("../models/Product"));
const StockEntry_1 = __importDefault(require("../models/StockEntry"));
const StockItem_1 = __importDefault(require("../models/StockItem"));
const billingRoleMiddleware_1 = require("../middleware/billingRoleMiddleware");
const BillingCategory_1 = __importDefault(require("../models/BillingCategory"));
const billing_ecommerce_category_1 = require("../lib/billing-ecommerce-category");
const stock_inventory_counts_1 = require("../lib/stock-inventory-counts");
const router = express_1.default.Router();
const productStockEntryFilter = (productId) => ({
    $or: [{ productId }, { productIds: productId }],
});
/** Latest purchase batch for a product size (exact match only). */
const findLatestStockEntryForSize = async (productId, size) => {
    const sizeNorm = String(size).trim();
    const entries = await StockEntry_1.default.find(productStockEntryFilter(productId))
        .sort({ entryDate: -1, createdAt: -1 })
        .select('_id size')
        .lean();
    const sized = entries.find((e) => String(e.size || '').trim() === sizeNorm);
    return sized?._id ?? null;
};
/** Create a purchase batch for a size when stock entry did not already introduce it. */
const ensureStockEntryForSize = async (product, size, enteredBy) => {
    const existing = await findLatestStockEntryForSize(product._id, size);
    if (existing)
        return existing;
    let supplier = product.supplier;
    let category = product.billingCategory;
    let subCategory = product.billingSubCategory;
    let gstPercent = 5;
    if (!supplier || !category || !subCategory) {
        const template = await StockEntry_1.default.findOne(productStockEntryFilter(product._id))
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
    if (!supplier || !category || !subCategory)
        return null;
    const stockEntry = await StockEntry_1.default.create({
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
const linkOrphanItemsToBatches = async (productId, enteredBy) => {
    const product = await Product_1.default.findById(productId)
        .select('supplier billingCategory billingSubCategory billingName name incomingPrice price')
        .lean();
    if (!product)
        return;
    const orphans = await StockItem_1.default.find({
        product: productId,
        $or: [{ stockEntry: null }, { stockEntry: { $exists: false } }],
    })
        .select('_id size')
        .lean();
    const bySize = new Map();
    for (const item of orphans) {
        const size = String(item.size || '').trim();
        if (!bySize.has(size))
            bySize.set(size, []);
        bySize.get(size).push(item._id);
    }
    for (const [size, itemIds] of bySize) {
        const entryId = await ensureStockEntryForSize(product, size, enteredBy);
        if (!entryId || !itemIds.length)
            continue;
        await StockItem_1.default.updateMany({ _id: { $in: itemIds } }, { $set: { stockEntry: entryId } });
    }
};
/** Keep purchase/profit batch rows in sync with live stock (qty + cost/MRP). */
const syncProductPurchaseBatches = async (productId, priceUpdates, enteredBy) => {
    await linkOrphanItemsToBatches(productId, enteredBy);
    const entries = await StockEntry_1.default.find(productStockEntryFilter(productId)).select('_id').lean();
    for (const entry of entries) {
        const items = await StockItem_1.default.find({ stockEntry: entry._id }).select('_id barcode').lean();
        const patch = {
            quantity: items.length,
            barcodes: items.map((i) => i.barcode),
            stockItemIds: items.map((i) => i._id),
        };
        if (priceUpdates?.incomingPrice !== undefined)
            patch.incomingPrice = priceUpdates.incomingPrice;
        if (priceUpdates?.sellingPrice !== undefined)
            patch.sellingPrice = priceUpdates.sellingPrice;
        await StockEntry_1.default.updateOne({ _id: entry._id }, { $set: patch });
    }
};
router.use((0, billingRoleMiddleware_1.requireAnyPermission)('canManageStock', 'canViewReports', 'canManageSuppliersCategories'));
router.get('/summary', async (req, res) => {
    const inShop = await (0, stock_inventory_counts_1.getBillingInShopSummary)();
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
router.get('/products', async (req, res) => {
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 25);
    const skip = (page - 1) * limit;
    const search = String(req.query.search || '').trim();
    const supplier = String(req.query.supplier || '').trim();
    const stock = String(req.query.stock || '').trim();
    const query = { isBillingProduct: true };
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
    if (stock === 'low')
        query.stock = { $gt: 0, $lte: 2 };
    if (stock === 'out')
        query.stock = { $lte: 0 };
    if (stock === 'in')
        query.stock = { $gt: 0 };
    const [data, total] = await Promise.all([
        Product_1.default.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('supplier', 'name')
            .populate('billingSubCategory', 'name')
            .lean(),
        Product_1.default.countDocuments(query),
    ]);
    const productIds = data.map((d) => d._id);
    const [soldCounts, inShopByProduct, priceVarianceByProduct] = await Promise.all([
        StockItem_1.default.aggregate([
            { $match: { status: 'sold', product: { $in: productIds } } },
            { $group: { _id: '$product', count: { $sum: 1 } } },
        ]),
        (0, stock_inventory_counts_1.getInShopCountsByProducts)(productIds),
        (0, stock_inventory_counts_1.getProductPriceVarianceByProducts)(productIds),
    ]);
    const soldMap = new Map(soldCounts.map((s) => [String(s._id), Number(s.count || 0)]));
    const isSuperAdmin = req.billingAdmin?.role === 'superadmin';
    return res.json({
        data: data.map((product) => {
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
                delete row.incomingPrice;
            }
            return row;
        }),
        total,
        page,
        limit,
    });
});
router.get('/entries', async (req, res) => {
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 20);
    const skip = (page - 1) * limit;
    const enteredBy = String(req.query.enteredBy || '').trim();
    const query = {};
    if (enteredBy && mongoose_1.default.Types.ObjectId.isValid(enteredBy)) {
        const canFilter = req.billingAdmin?.role === 'superadmin' ||
            Boolean(req.billingAdmin?.permissions?.canManageAdmins);
        if (!canFilter) {
            return res.status(403).json({ message: 'Permission denied to filter by staff' });
        }
        query.enteredBy = new mongoose_1.default.Types.ObjectId(enteredBy);
    }
    const startDate = String(req.query.startDate || '').trim();
    const endDate = String(req.query.endDate || '').trim();
    if (startDate || endDate) {
        query.createdAt = {};
        if (startDate)
            query.createdAt.$gte = new Date(`${startDate}T00:00:00.000Z`);
        if (endDate)
            query.createdAt.$lte = new Date(`${endDate}T23:59:59.999Z`);
    }
    const [data, total] = await Promise.all([
        StockEntry_1.default.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('supplier', 'name')
            .populate('category', 'name')
            .populate('subCategory', 'name')
            .populate('enteredBy', 'name email')
            .lean(),
        StockEntry_1.default.countDocuments(query),
    ]);
    return res.json({ data, total, page, limit });
});
router.put('/products/:id', async (req, res) => {
    try {
        const productId = req.params.id;
        const updates = req.body;
        const product = await Product_1.default.findById(productId);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        if (updates.name !== undefined) {
            product.name = String(updates.name).trim();
            product.billingName = String(updates.name).trim(); // Keep billingName in sync so it reflects in the UI
        }
        if (updates.billingName !== undefined)
            product.billingName = String(updates.billingName).trim();
        const varianceMap = await (0, stock_inventory_counts_1.getProductPriceVarianceByProducts)([product._id]);
        const priceVariance = varianceMap.get(String(product._id));
        const hasMultiplePrices = Boolean(priceVariance?.hasMultiplePrices);
        const variantUpdates = Array.isArray(updates.priceVariantUpdates) ? updates.priceVariantUpdates : [];
        let variantPricesChanged = false;
        if (variantUpdates.length > 0) {
            for (const variant of variantUpdates) {
                const fromSellingPrice = Number(variant.fromSellingPrice);
                const toSellingPrice = Number(variant.toSellingPrice);
                if (!Number.isFinite(fromSellingPrice) || !Number.isFinite(toSellingPrice))
                    continue;
                if (fromSellingPrice === toSellingPrice && variant.toIncomingPrice === undefined)
                    continue;
                const stockPatch = { sellingPrice: toSellingPrice };
                if (variant.toIncomingPrice !== undefined && Number.isFinite(Number(variant.toIncomingPrice))) {
                    stockPatch.incomingPrice = Number(variant.toIncomingPrice);
                }
                const stockFilter = {
                    product: product._id,
                    sellingPrice: fromSellingPrice,
                    status: { $in: ['available', 'returned'] },
                };
                const affectedItems = await StockItem_1.default.find(stockFilter).select('_id stockEntry').lean();
                if (!affectedItems.length)
                    continue;
                await StockItem_1.default.updateMany(stockFilter, { $set: stockPatch });
                variantPricesChanged = true;
                const entryIds = [
                    ...new Set(affectedItems
                        .map((item) => item.stockEntry?.toString())
                        .filter((id) => Boolean(id))),
                ];
                for (const entryId of entryIds) {
                    const entryPatch = { sellingPrice: toSellingPrice };
                    if (stockPatch.incomingPrice !== undefined)
                        entryPatch.incomingPrice = stockPatch.incomingPrice;
                    await StockEntry_1.default.updateOne({ _id: entryId }, { $set: entryPatch });
                }
            }
            const variantMap = await (0, stock_inventory_counts_1.getProductPriceVariantsByProducts)([product._id]);
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
            await StockItem_1.default.updateMany({ product: product._id }, { $set: { sellingPrice: product.price } });
        }
        if (updates.incomingPrice !== undefined && variantUpdates.length === 0) {
            if (hasMultiplePrices) {
                return res.status(400).json({
                    message: 'This product has multiple prices. Edit each price variant individually.',
                });
            }
            product.incomingPrice = Number(updates.incomingPrice);
            await StockItem_1.default.updateMany({ product: product._id }, { $set: { incomingPrice: product.incomingPrice } });
        }
        // Handle billingCategory (ObjectId) → also update category name string
        if (updates.billingCategory !== undefined) {
            if (updates.billingCategory && String(updates.billingCategory).match(/^[0-9a-fA-F]{24}$/)) {
                product.billingCategory = updates.billingCategory;
                const catDoc = await BillingCategory_1.default.findById(updates.billingCategory).select('name').lean();
                if (catDoc)
                    product.category = (0, billing_ecommerce_category_1.toEcommerceCategorySlug)(catDoc.name);
            }
        }
        else if (updates.category !== undefined) {
            product.category = String(updates.category).trim();
        }
        // Handle billingSubCategory (ObjectId) → also update subCategory name string
        if (updates.billingSubCategory !== undefined) {
            if (updates.billingSubCategory && String(updates.billingSubCategory).match(/^[0-9a-fA-F]{24}$/)) {
                product.billingSubCategory = updates.billingSubCategory;
                const subDoc = await BillingCategory_1.default.findById(updates.billingSubCategory).select('name').lean();
                if (subDoc)
                    product.subCategory = (0, billing_ecommerce_category_1.toEcommerceSubCategorySlug)(subDoc.name);
            }
        }
        else if (updates.subCategory !== undefined) {
            product.subCategory = String(updates.subCategory).trim();
        }
        if (updates.supplier !== undefined) {
            if (!updates.supplier) {
                product.supplier = undefined;
            }
            else if (String(updates.supplier).match(/^[0-9a-fA-F]{24}$/)) {
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
            const parseSequence = (barcode) => {
                const seq = barcode.slice(-4);
                const n = Number(seq);
                return Number.isFinite(n) ? n : 0;
            };
            const generateBarcodes = async (quantity) => {
                const prefix = getBarcodePrefix();
                const latest = await StockItem_1.default.findOne({ barcode: { $regex: `^${prefix}` } })
                    .sort({ barcode: -1 })
                    .select('barcode')
                    .lean();
                let start = latest?.barcode ? parseSequence(latest.barcode) + 1 : 1;
                while (true) {
                    const barcodes = Array.from({ length: quantity }, (_, i) => `${prefix}${String(start + i).padStart(4, '0')}`);
                    const existing = await StockItem_1.default.find({ barcode: { $in: barcodes } }).select('barcode').lean();
                    if (existing.length === 0)
                        return barcodes;
                    const maxExisting = Math.max(...existing.map((doc) => parseSequence(doc.barcode)));
                    start = Math.max(start + quantity, maxExisting + 1);
                    if (start + quantity >= 9999)
                        throw new Error('Unable to generate unique barcode range for today');
                }
            };
            const providedSizes = new Set(updates.sizeEntries.map((e) => String(e.size).trim()));
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
                if (!size || !Number.isFinite(desiredQuantity) || desiredQuantity < 0)
                    continue;
                const currentTotalStockForSize = await StockItem_1.default.countDocuments({ product: product._id, size });
                const diff = desiredQuantity - currentTotalStockForSize;
                if (diff > 0) {
                    const barcodes = await generateBarcodes(diff);
                    const stockEntryId = await ensureStockEntryForSize(product, size, req.billingAdminId);
                    await StockItem_1.default.insertMany(barcodes.map((barcode) => ({
                        barcode,
                        product: product._id,
                        size,
                        incomingPrice: product.incomingPrice,
                        sellingPrice: product.price,
                        supplier: product.supplier,
                        ...(stockEntryId ? { stockEntry: stockEntryId } : {}),
                        status: 'available',
                    })));
                }
                else if (diff < 0) {
                    // Delete available barcodes
                    const toDelete = Math.abs(diff);
                    const availableItems = await StockItem_1.default.find({ product: product._id, size, status: 'available' })
                        .limit(toDelete)
                        .select('_id');
                    if (availableItems.length > 0) {
                        await StockItem_1.default.deleteMany({ _id: { $in: availableItems.map((i) => i._id) } });
                    }
                }
            }
            // Re-calculate master product aggregates
            const allItems = await StockItem_1.default.aggregate([
                { $match: { product: product._id } },
                { $group: { _id: '$size', count: { $sum: 1 } } }
            ]);
            const newSizeStock = allItems.map((item) => ({ size: String(item._id), stock: Number(item.count) }));
            product.sizeStock = newSizeStock;
            product.totalStock = newSizeStock.reduce((sum, s) => sum + s.stock, 0);
            product.stock = product.totalStock;
            product.sizes = newSizeStock.map((s) => s.size);
            // Billing products: don't auto-activate based on stock.
            // Admin must manually toggle visibility after adding images etc.
            if (!product.isBillingProduct) {
                product.isActive = product.stock > 0;
            }
        }
        await product.save();
        const priceUpdates = {};
        if (updates.incomingPrice !== undefined && variantUpdates.length === 0) {
            priceUpdates.incomingPrice = product.incomingPrice;
        }
        if (updates.price !== undefined && variantUpdates.length === 0) {
            priceUpdates.sellingPrice = product.price;
        }
        const shouldSyncBatches = Boolean(updates.sizeEntries) ||
            (updates.incomingPrice !== undefined && variantUpdates.length === 0) ||
            (updates.price !== undefined && variantUpdates.length === 0);
        if (shouldSyncBatches) {
            await syncProductPurchaseBatches(product._id, Object.keys(priceUpdates).length ? priceUpdates : undefined, req.billingAdminId);
        }
        else if (variantPricesChanged) {
            await linkOrphanItemsToBatches(product._id, req.billingAdminId);
        }
        res.json(product);
    }
    catch (error) {
        res.status(500).json({ message: error.message || 'Server error' });
    }
});
exports.default = router;
//# sourceMappingURL=billing-inventory.js.map