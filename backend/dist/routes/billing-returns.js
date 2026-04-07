"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Bill_1 = __importDefault(require("../models/Bill"));
const Return_1 = __importDefault(require("../models/Return"));
const Product_1 = __importDefault(require("../models/Product"));
const StockItem_1 = __importDefault(require("../models/StockItem"));
const billingRoleMiddleware_1 = require("../middleware/billingRoleMiddleware");
const revalidateFrontend_1 = require("../lib/revalidateFrontend");
const router = express_1.default.Router();
router.use(billingRoleMiddleware_1.requireAdmin);
router.use((0, billingRoleMiddleware_1.requirePermission)('canReturn'));
const generateReturnNumber = async () => {
    const year = new Date().getFullYear();
    const prefix = `SW-RET-${year}-`;
    const latest = await Return_1.default.findOne({ returnNumber: new RegExp(`^${prefix}`) }).sort({ createdAt: -1 });
    const current = latest?.returnNumber ? Number(latest.returnNumber.split('-')[3]) : 0;
    return `${prefix}${String(current + 1).padStart(4, '0')}`;
};
router.get('/next-number', async (_req, res) => {
    const returnNumber = await generateReturnNumber();
    return res.json({ returnNumber });
});
router.get('/scan/:barcode', async (req, res) => {
    const bill = await Bill_1.default.findOne({ 'items.barcode': req.params.barcode, status: 'completed' });
    if (!bill)
        return res.status(404).json({ message: 'Sale record not found for this barcode' });
    return res.json(bill);
});
router.post('/', async (req, res) => {
    try {
        const { billId, returnedItems = [], replacementItems = [], returnType } = req.body || {};
        const bill = await Bill_1.default.findById(billId);
        if (!bill)
            return res.status(404).json({ message: 'Original bill not found' });
        if (!['replacement', 'partial'].includes(returnType)) {
            return res.status(400).json({ message: 'Only replacement is supported' });
        }
        if (!Array.isArray(returnedItems) || returnedItems.length === 0) {
            return res.status(400).json({ message: 'Select at least one returned item' });
        }
        if (!Array.isArray(replacementItems) || replacementItems.length === 0) {
            return res.status(400).json({ message: 'Scan at least one replacement item' });
        }
        const returnedTotal = returnedItems.reduce((sum, item) => sum + Number(item.sellingPrice || 0) * Number(item.quantity || 1), 0);
        const replacementTotal = replacementItems.reduce((sum, item) => sum + Number(item.sellingPrice || 0) * Number(item.quantity || 1), 0);
        const priceDifference = replacementTotal - returnedTotal;
        const returnDoc = await Return_1.default.create({
            bill: bill._id,
            billNumber: bill.billNumber,
            returnNumber: await generateReturnNumber(),
            customer: bill.customer,
            returnedItems,
            replacementItems,
            returnType,
            priceDifference,
            refundAmount: 0,
            refundMethod: 'none',
            processedBy: req.billingAdminId,
        });
        // Returned items: mark StockItem as returned (manual inspection before restock)
        for (const item of returnedItems) {
            const barcode = String(item.barcode || '').trim();
            if (!barcode)
                continue;
            await StockItem_1.default.findOneAndUpdate({ barcode }, { status: 'returned', returnedInReturn: returnDoc._id });
        }
        // Replacement items: mark StockItem sold and decrement master Product aggregates (same as billing)
        for (const item of replacementItems) {
            const barcode = String(item.barcode || '').trim();
            const productId = item.productId || item.product;
            const size = String(item.size || '').trim();
            const qty = Math.max(1, Math.abs(Number(item.quantity || 1)));
            if (qty !== 1) {
                return res.status(400).json({ message: 'Replacement item quantity must be 1 per barcode' });
            }
            const updated = await StockItem_1.default.findOneAndUpdate({ barcode, status: 'available' }, { status: 'sold', soldInBill: bill._id });
            if (!updated) {
                return res.status(400).json({ message: `Replacement barcode not available: ${barcode}` });
            }
            const product = await Product_1.default.findById(productId);
            if (!product)
                continue;
            const sizeStock = Array.isArray(product.sizeStock) ? product.sizeStock : [];
            const sizeEntry = sizeStock.find((s) => String(s.size) === size);
            if (sizeEntry)
                sizeEntry.stock = Math.max(0, Number(sizeEntry.stock || 0) - 1);
            product.totalStock = sizeStock.reduce((sum, s) => sum + Number(s.stock || 0), 0);
            product.stock = product.totalStock;
            if (product.totalStock === 0)
                product.isActive = false;
            await product.save();
        }
        bill.status = returnType === 'partial' ? 'partial_replaced' : 'replaced';
        await bill.save();
        await (0, revalidateFrontend_1.triggerRevalidate)(['/', '/products']);
        // Ensure key fields are always present in response JSON
        return res.status(201).json({ ...returnDoc.toObject(), returnNumber: returnDoc.returnNumber });
    }
    catch (error) {
        return res.status(500).json({ message: error.message || 'Return processing failed' });
    }
});
router.get('/', async (req, res) => {
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 20);
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
        Return_1.default.find({}).sort({ createdAt: -1 }).skip(skip).limit(limit),
        Return_1.default.countDocuments({}),
    ]);
    res.json({ data, total, page, limit });
});
router.get('/:id', async (req, res) => {
    const item = await Return_1.default.findById(req.params.id);
    if (!item)
        return res.status(404).json({ message: 'Return not found' });
    res.json(item);
});
exports.default = router;
//# sourceMappingURL=billing-returns.js.map