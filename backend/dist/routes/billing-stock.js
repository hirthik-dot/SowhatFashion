"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const BillingCategory_1 = __importDefault(require("../models/BillingCategory"));
const Product_1 = __importDefault(require("../models/Product"));
const StockItem_1 = __importDefault(require("../models/StockItem"));
const StockEntry_1 = __importDefault(require("../models/StockEntry"));
const Supplier_1 = __importDefault(require("../models/Supplier"));
const billingRoleMiddleware_1 = require("../middleware/billingRoleMiddleware");
const revalidateFrontend_1 = require("../lib/revalidateFrontend");
const slugify_1 = __importDefault(require("slugify"));
const router = express_1.default.Router();
router.use(billingRoleMiddleware_1.requireAdmin);
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
    // Find latest barcode for today to start sequence
    const latest = await StockItem_1.default.findOne({ barcode: { $regex: `^${prefix}` } })
        .sort({ barcode: -1 })
        .select('barcode')
        .lean();
    let start = latest?.barcode ? parseSequence(latest.barcode) + 1 : 1;
    // Ensure we don't collide (handles gaps + safety)
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
router.post('/entry', (0, billingRoleMiddleware_1.requirePermission)('canManageStock'), async (req, res) => {
    try {
        const { supplier, category, subCategory, productName, size, quantity, incomingPrice, sellingPrice, gstPercent, notes } = req.body || {};
        const supplierDoc = await Supplier_1.default.findById(supplier);
        const categoryDoc = await BillingCategory_1.default.findById(category);
        const subCategoryDoc = await BillingCategory_1.default.findById(subCategory);
        if (!supplierDoc || !categoryDoc || !subCategoryDoc) {
            return res.status(400).json({ message: 'Supplier/category/subcategory not found' });
        }
        const cleanProductName = String(productName || '').trim();
        if (!cleanProductName) {
            return res.status(400).json({ message: 'Product name is required' });
        }
        const cleanSize = String(size || '').trim();
        if (!cleanSize) {
            return res.status(400).json({ message: 'Size is required' });
        }
        const qty = Number(quantity || 0);
        if (!Number.isFinite(qty) || qty < 1) {
            return res.status(400).json({ message: 'Quantity must be at least 1' });
        }
        const incoming = Number(incomingPrice ?? 0);
        const selling = Number(sellingPrice ?? 0);
        // 1) Find existing master Product (billing)
        const existingMaster = await Product_1.default.findOne({
            billingSubCategory: subCategoryDoc._id,
            supplier: supplierDoc._id,
            isBillingProduct: true,
            billingName: { $regex: `^${cleanProductName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
        });
        // 2) If not found, create master product
        const masterProduct = existingMaster ||
            (await Product_1.default.create({
                name: cleanProductName,
                billingName: cleanProductName,
                slug: `${(0, slugify_1.default)(cleanProductName, { lower: true, strict: true })}-${Date.now()}`,
                category: categoryDoc.name,
                subCategory: subCategoryDoc.name,
                billingCategory: categoryDoc._id,
                billingSubCategory: subCategoryDoc._id,
                supplier: supplierDoc._id,
                price: selling,
                incomingPrice: incoming,
                images: [],
                sizes: [],
                sizeStock: [],
                totalStock: 0,
                stock: 0,
                isActive: false,
                isBillingProduct: true,
            }));
        // 6) Create StockEntry record early (so StockItems can reference it)
        const stockEntry = await StockEntry_1.default.create({
            supplier,
            category,
            subCategory,
            productName: cleanProductName,
            quantity: qty,
            incomingPrice: incoming,
            sellingPrice: selling,
            size: cleanSize,
            gstPercent: gstPercent ?? 5,
            notes,
            barcodes: [],
            stockItemIds: [],
            productId: masterProduct._id,
            productIds: [masterProduct._id],
            enteredBy: req.billingAdminId,
            entryDate: new Date(),
        });
        // 3) Generate unique barcodes
        const barcodes = await generateBarcodes(qty);
        // 4) Create StockItems
        const stockItems = await StockItem_1.default.insertMany(barcodes.map((barcode) => ({
            barcode,
            product: masterProduct._id,
            size: cleanSize,
            incomingPrice: incoming,
            sellingPrice: selling,
            stockEntry: stockEntry._id,
            supplier: supplierDoc._id,
            status: 'available',
        })), { ordered: true });
        // 5) Update master Product aggregates
        const sizeStock = Array.isArray(masterProduct.sizeStock) ? masterProduct.sizeStock : [];
        const existingSize = sizeStock.find((s) => String(s.size) === cleanSize);
        if (existingSize)
            existingSize.stock = Number(existingSize.stock || 0) + qty;
        else
            sizeStock.push({ size: cleanSize, stock: qty });
        const sizes = Array.isArray(masterProduct.sizes) ? masterProduct.sizes : [];
        if (!sizes.includes(cleanSize))
            sizes.push(cleanSize);
        masterProduct.sizeStock = sizeStock;
        masterProduct.totalStock = sizeStock.reduce((sum, s) => sum + Number(s.stock || 0), 0);
        masterProduct.stock = masterProduct.totalStock;
        masterProduct.isActive = masterProduct.totalStock > 0;
        masterProduct.price = selling;
        masterProduct.incomingPrice = incoming;
        await masterProduct.save();
        // 6) Update StockEntry with barcode + stockItem ids
        stockEntry.barcodes = barcodes;
        stockEntry.stockItemIds = stockItems.map((s) => s._id);
        await stockEntry.save();
        await (0, revalidateFrontend_1.triggerRevalidate)(['/', '/products']);
        return res.status(201).json(stockEntry);
    }
    catch (error) {
        return res.status(500).json({ message: error.message || 'Stock entry failed' });
    }
});
router.get('/entries', (0, billingRoleMiddleware_1.requirePermission)('canManageStock'), async (req, res) => {
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 20);
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
        StockEntry_1.default.find({}).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('supplier category subCategory'),
        StockEntry_1.default.countDocuments({}),
    ]);
    res.json({ data, page, limit, total });
});
router.get('/entries/:id', (0, billingRoleMiddleware_1.requirePermission)('canManageStock'), async (req, res) => {
    const entry = await StockEntry_1.default.findById(req.params.id).populate('supplier category subCategory');
    if (!entry)
        return res.status(404).json({ message: 'Stock entry not found' });
    res.json(entry);
});
router.get('/inventory', async (req, res) => {
    const supplier = String(req.query.supplier || '').trim();
    const search = String(req.query.search || '').trim();
    const query = { isBillingProduct: true };
    if (supplier)
        query.supplier = supplier;
    if (search) {
        query.$or = [{ name: { $regex: search, $options: 'i' } }, { billingName: { $regex: search, $options: 'i' } }];
    }
    const products = await Product_1.default.find(query)
        .populate('billingCategory', 'name')
        .populate('billingSubCategory', 'name')
        .populate('supplier', 'name')
        .select('name billingName sizeStock totalStock price incomingPrice isActive billingCategory billingSubCategory supplier')
        .lean();
    // Sold = total StockItems sold (for this product). We compute per product for correctness.
    const productIds = products.map((p) => p._id);
    const soldCounts = await StockItem_1.default.aggregate([
        { $match: { product: { $in: productIds }, status: 'sold' } },
        { $group: { _id: '$product', count: { $sum: 1 } } },
    ]);
    const soldByProduct = new Map(soldCounts.map((d) => [String(d._id), Number(d.count || 0)]));
    const isSuperAdmin = req.billingAdmin?.role === 'superadmin';
    const data = products.map((p) => ({
        _id: p._id,
        name: p.billingName || p.name,
        category: p.billingCategory?.name || '',
        subCategory: p.billingSubCategory?.name || '',
        supplier: p.supplier?.name || '',
        sizeStock: p.sizeStock || [],
        totalStock: Number(p.totalStock ?? p.stock ?? 0),
        sold: soldByProduct.get(String(p._id)) || 0,
        mrp: Number(p.price || 0),
        status: p.isActive ? 'active' : 'inactive',
        incomingPrice: isSuperAdmin ? Number(p.incomingPrice || 0) : undefined,
        expectedProfit: isSuperAdmin
            ? Number((Number(p.price || 0) - Number(p.incomingPrice || 0)) * Number(p.totalStock ?? p.stock ?? 0))
            : undefined,
    }));
    const summary = data.reduce((acc, row) => {
        acc.totalProducts += 1;
        acc.totalUnits += Number(row.totalStock || 0);
        acc.totalSold += Number(row.sold || 0);
        acc.totalRetailValue += Number(row.totalStock || 0) * Number(row.mrp || 0);
        acc.totalCostValue += Number(row.totalStock || 0) * Number(row.incomingPrice || 0);
        if (Number(row.totalStock || 0) <= 0)
            acc.outOfStock += 1;
        return acc;
    }, { totalProducts: 0, totalUnits: 0, totalSold: 0, totalRetailValue: 0, totalCostValue: 0, outOfStock: 0 });
    res.json({ summary, data });
});
router.get('/inventory/:productId/items', async (req, res) => {
    const productId = req.params.productId;
    const size = String(req.query.size || '').trim();
    const product = await Product_1.default.findById(productId).select('_id');
    if (!product)
        return res.status(404).json({ message: 'Product not found' });
    const match = { product: product._id };
    if (size)
        match.size = size;
    const items = await StockItem_1.default.find(match).sort({ barcode: 1 }).lean();
    // soldInBill and returnedInReturn are objectIds, but existing UI expects readable numbers sometimes.
    // Keep raw ids here; UI can decide what to show.
    res.json(items.map((item) => ({
        _id: item._id,
        barcode: item.barcode,
        size: item.size,
        mrp: item.sellingPrice,
        status: item.status,
        soldInBill: item.soldInBill || null,
        returnedInReturn: item.returnedInReturn || null,
    })));
});
router.get('/low-stock', (0, billingRoleMiddleware_1.requirePermission)('canManageStock'), async (_req, res) => {
    const batches = await StockEntry_1.default.aggregate([
        {
            $lookup: {
                from: 'products',
                localField: 'productIds',
                foreignField: '_id',
                as: 'products',
            },
        },
        {
            $addFields: {
                totalIn: { $size: '$productIds' },
                totalLeft: {
                    $size: {
                        $filter: {
                            input: '$products',
                            cond: { $gt: ['$$this.stock', 0] },
                        },
                    },
                },
            },
        },
        {
            $addFields: {
                percentLeft: {
                    $cond: [{ $gt: ['$totalIn', 0] }, { $multiply: [{ $divide: ['$totalLeft', '$totalIn'] }, 100] }, 0],
                },
            },
        },
        { $match: { totalLeft: { $gt: 0 }, $expr: { $lte: ['$totalLeft', { $multiply: ['$totalIn', 0.2] }] } } },
        { $lookup: { from: 'billingcategories', localField: 'category', foreignField: '_id', as: 'categoryData' } },
        { $lookup: { from: 'billingcategories', localField: 'subCategory', foreignField: '_id', as: 'subCategoryData' } },
        { $lookup: { from: 'suppliers', localField: 'supplier', foreignField: '_id', as: 'supplierData' } },
        {
            $project: {
                _id: 1,
                category: { $arrayElemAt: ['$categoryData.name', 0] },
                subCategory: { $arrayElemAt: ['$subCategoryData.name', 0] },
                supplier: { $arrayElemAt: ['$supplierData.name', 0] },
                size: '$size',
                totalIn: 1,
                totalLeft: 1,
                percentLeft: 1,
                entryDate: 1,
            },
        },
        { $sort: { percentLeft: 1, entryDate: -1 } },
    ]);
    res.json(batches);
});
exports.default = router;
//# sourceMappingURL=billing-stock.js.map