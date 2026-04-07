"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Product_1 = __importDefault(require("../models/Product"));
const StockEntry_1 = __importDefault(require("../models/StockEntry"));
const StockItem_1 = __importDefault(require("../models/StockItem"));
const billingRoleMiddleware_1 = require("../middleware/billingRoleMiddleware");
const router = express_1.default.Router();
router.use(billingRoleMiddleware_1.requireAdmin);
router.get('/summary', async (req, res) => {
    const query = { isBillingProduct: true };
    const [totals, lowStock, outOfStock] = await Promise.all([
        Product_1.default.find(query).select('stock price incomingPrice').lean(),
        Product_1.default.countDocuments({ ...query, stock: { $gt: 0, $lte: 2 } }),
        Product_1.default.countDocuments({ ...query, stock: { $lte: 0 } }),
    ]);
    const totalProducts = totals.length;
    const totalUnits = totals.reduce((sum, product) => sum + Number(product.stock || 0), 0);
    const totalRetailValue = totals.reduce((sum, product) => sum + Number(product.stock || 0) * Number(product.price || 0), 0);
    const totalCostValue = totals.reduce((sum, product) => sum + Number(product.stock || 0) * Number(product.incomingPrice || 0), 0);
    const isSuperAdmin = req.billingAdmin?.role === 'superadmin';
    return res.json({
        totalProducts,
        totalUnits,
        totalRetailValue,
        totalCostValue: isSuperAdmin ? totalCostValue : undefined,
        expectedProfit: isSuperAdmin ? totalRetailValue - totalCostValue : undefined,
        lowStock,
        outOfStock,
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
    if (supplier)
        query.supplier = supplier;
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
    const soldCounts = await StockItem_1.default.aggregate([
        { $match: { status: 'sold', product: { $in: data.map((d) => d._id) } } },
        { $group: { _id: '$product', count: { $sum: 1 } } },
    ]);
    const soldMap = new Map(soldCounts.map((s) => [String(s._id), Number(s.count || 0)]));
    const isSuperAdmin = req.billingAdmin?.role === 'superadmin';
    return res.json({
        data: data.map((product) => {
            const row = {
                ...product,
                name: product.billingName || product.name,
                sold: soldMap.get(String(product._id)) || 0,
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
    const [data, total] = await Promise.all([
        StockEntry_1.default.find({})
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('supplier', 'name')
            .populate('category', 'name')
            .populate('subCategory', 'name')
            .populate('enteredBy', 'name email')
            .lean(),
        StockEntry_1.default.countDocuments({}),
    ]);
    return res.json({ data, total, page, limit });
});
exports.default = router;
//# sourceMappingURL=billing-inventory.js.map