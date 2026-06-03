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
const BillingPointsAccount_1 = __importDefault(require("../models/BillingPointsAccount"));
const BillingPointsLedger_1 = __importDefault(require("../models/BillingPointsLedger"));
const billing_points_1 = require("../lib/billing-points");
const billing_replacements_1 = require("../lib/billing-replacements");
const router = express_1.default.Router();
const generateReturnNumber = async () => {
    const year = new Date().getFullYear();
    const prefix = `SW-RET-${year}-`;
    const latest = await Return_1.default.findOne({ returnNumber: new RegExp(`^${prefix}`) }).sort({ createdAt: -1 });
    const current = latest?.returnNumber ? Number(latest.returnNumber.split('-')[3]) : 0;
    return `${prefix}${String(current + 1).padStart(4, '0')}`;
};
router.get('/next-number', (0, billingRoleMiddleware_1.requirePermission)('canReturn'), async (_req, res) => {
    const returnNumber = await generateReturnNumber();
    return res.json({ returnNumber });
});
router.get('/scan/:barcode', (0, billingRoleMiddleware_1.requirePermission)('canReturn'), async (req, res) => {
    const barcode = String(req.params.barcode || '').trim();
    const bill = await Bill_1.default.findOne({
        $or: [{ 'items.barcode': barcode }, { 'items.barcodes': barcode }],
        status: { $in: ['completed', 'partial_replaced'] },
    });
    if (!bill)
        return res.status(404).json({ message: 'Sale record not found for this barcode' });
    const eligible = (0, billing_replacements_1.returnableBillItems)(bill);
    const onReturnableLine = eligible.some((item) => (0, billing_replacements_1.itemBarcodes)(item).includes(barcode));
    if (!onReturnableLine) {
        return res.status(404).json({ message: 'This item was already returned or replaced' });
    }
    return res.json((0, billing_replacements_1.billForReturn)(bill));
});
router.post('/', (0, billingRoleMiddleware_1.requirePermission)('canReturn'), async (req, res) => {
    try {
        const { billId, returnedItems = [], replacementItems = [], returnType, replacementSubtotal, replacementItemDiscount, replacementBillDiscount, } = req.body || {};
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
        const normalizedReturned = (0, billing_replacements_1.expandReturnedLineItems)(returnedItems);
        if (normalizedReturned.length === 0) {
            return res.status(400).json({ message: 'Select at least one returned item' });
        }
        const eligible = (0, billing_replacements_1.returnableBillItems)(bill);
        const eligibleBarcodes = new Set();
        for (const line of eligible) {
            (0, billing_replacements_1.itemBarcodes)(line).forEach((code) => eligibleBarcodes.add(code));
        }
        for (const row of normalizedReturned) {
            const code = String(row.barcode || '').trim();
            if (!code || !eligibleBarcodes.has(code)) {
                return res.status(400).json({ message: `Item is not eligible for return: ${code || 'unknown'}` });
            }
        }
        const returnedTotal = normalizedReturned.reduce((sum, item) => sum + Number(item.sellingPrice || 0) * Number(item.quantity || 1), 0);
        const replacementTotal = replacementItems.reduce((sum, item) => sum + Number(item.sellingPrice || 0) * Number(item.quantity || 1), 0);
        const priceDifference = replacementTotal - returnedTotal;
        const returnDoc = await Return_1.default.create({
            bill: bill._id,
            billNumber: bill.billNumber,
            returnNumber: await generateReturnNumber(),
            customer: bill.customer,
            returnedItems: normalizedReturned,
            replacementItems,
            returnType,
            priceDifference,
            replacementSubtotal: Number(replacementSubtotal || replacementTotal),
            replacementItemDiscount: Number(replacementItemDiscount || 0),
            replacementBillDiscount: Number(replacementBillDiscount || 0),
            refundAmount: 0,
            refundMethod: 'none',
            processedBy: req.billingAdminId,
        });
        (0, billing_replacements_1.applyReplacementToBill)(bill, normalizedReturned, replacementItems);
        // Returned items: mark StockItem as returned (manual inspection before restock)
        for (const item of normalizedReturned) {
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
        const originalPointsEarned = Number(bill.pointsEarned || 0);
        if (originalPointsEarned > 0 && returnedTotal > 0) {
            await (0, billing_points_1.clawbackPointsOnReturn)({
                phone: String(bill.customer?.phone || ''),
                refundAmount: returnedTotal,
                originalPointsEarned,
                billId: bill._id,
                billNumber: String(bill.billNumber || ''),
                createdBy: req.billingAdminId,
                BillingPointsAccount: BillingPointsAccount_1.default,
                BillingPointsLedger: BillingPointsLedger_1.default,
            });
        }
        await (0, revalidateFrontend_1.triggerRevalidate)(['/', '/products']);
        // Ensure key fields are always present in response JSON
        return res.status(201).json({ ...returnDoc.toObject(), returnNumber: returnDoc.returnNumber });
    }
    catch (error) {
        return res.status(500).json({ message: error.message || 'Return processing failed' });
    }
});
router.get('/history', (0, billingRoleMiddleware_1.requireAnyPermission)('canReturn', 'canViewReports'), async (req, res) => {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
    const skip = (page - 1) * limit;
    const search = String(req.query.search || '').trim();
    const startDate = String(req.query.startDate || '').trim();
    const endDate = String(req.query.endDate || '').trim();
    const query = {};
    if (search) {
        const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        query.$or = [{ returnNumber: regex }, { billNumber: regex }, { 'customer.name': regex }, { 'customer.phone': regex }];
    }
    if (startDate || endDate) {
        query.createdAt = {};
        if (startDate)
            query.createdAt.$gte = new Date(`${startDate}T00:00:00.000Z`);
        if (endDate)
            query.createdAt.$lte = new Date(`${endDate}T23:59:59.999Z`);
    }
    const [data, total] = await Promise.all([
        Return_1.default.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('processedBy', 'name email')
            .lean(),
        Return_1.default.countDocuments(query),
    ]);
    res.json({
        data: data.map((row) => ({
            ...row,
            processedByName: row.processedBy?.name || '',
        })),
        total,
        page,
        limit,
    });
});
router.get('/:id', (0, billingRoleMiddleware_1.requireAnyPermission)('canReturn', 'canViewReports'), async (req, res) => {
    const item = await Return_1.default.findById(req.params.id).populate('processedBy', 'name email').lean();
    if (!item)
        return res.status(404).json({ message: 'Return not found' });
    res.json({ ...item, processedByName: item.processedBy?.name || '' });
});
exports.default = router;
//# sourceMappingURL=billing-returns.js.map