"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const mongoose_1 = __importDefault(require("mongoose"));
const Bill_1 = __importDefault(require("../models/Bill"));
const Product_1 = __importDefault(require("../models/Product"));
const StockItem_1 = __importDefault(require("../models/StockItem"));
const billingAuthMiddleware_1 = require("../middleware/billingAuthMiddleware");
const billingRoleMiddleware_1 = require("../middleware/billingRoleMiddleware");
const revalidateFrontend_1 = require("../lib/revalidateFrontend");
const router = express_1.default.Router();
const canEditBills = (admin) => admin?.role === 'superadmin' || (admin?.role === 'admin' && Boolean(admin?.permissions?.canEditBills));
const enforceDiscountLimit = (req, payload) => {
    const role = req.billingAdmin?.role;
    const permissions = req.billingAdmin?.permissions || {};
    if (role === 'superadmin')
        return;
    const maxPercent = Math.max(0, Number(permissions.maxDiscountPercent || 0));
    const canDiscount = Boolean(permissions.canDiscount);
    const checkPercent = (value) => {
        if (value <= 0)
            return;
        if (!canDiscount) {
            throw new Error('You are not allowed to apply discounts');
        }
        if (value > maxPercent) {
            throw new Error(`Discount cannot exceed ${maxPercent}%`);
        }
    };
    if (String(payload?.billDiscountType || '') === 'percent') {
        checkPercent(Number(payload?.billDiscountValue || 0));
    }
    const items = Array.isArray(payload?.items) ? payload.items : [];
    items.forEach((item) => {
        if (String(item?.itemDiscountType || '') === 'percent') {
            checkPercent(Number(item?.itemDiscountValue || 0));
        }
    });
};
const adjustProductSizeStock = async (productId, size, delta) => {
    const product = await Product_1.default.findById(productId);
    if (!product)
        return;
    const sizeStock = Array.isArray(product.sizeStock) ? product.sizeStock : [];
    const existing = sizeStock.find((entry) => String(entry.size || '') === String(size || ''));
    if (existing) {
        existing.stock = Math.max(0, Number(existing.stock || 0) + delta);
    }
    else if (delta > 0) {
        sizeStock.push({ size: String(size || ''), stock: delta });
    }
    product.sizeStock = sizeStock;
    product.totalStock = sizeStock.reduce((sum, entry) => sum + Number(entry.stock || 0), 0);
    product.stock = product.totalStock;
    product.isActive = product.totalStock > 0;
    await product.save();
};
const calculateBillTotals = (items, billDiscountType, billDiscountValue) => {
    const normalizedItems = (items || []).map((item) => {
        const mrp = Number(item.mrp ?? item.price ?? 0);
        const quantity = Math.max(1, Number(item.quantity || 1));
        const discountType = item.itemDiscountType || 'none';
        const discountValue = Number(item.itemDiscountValue || 0);
        const itemDiscountAmount = discountType === 'percent' ? (mrp * discountValue) / 100 : discountType === 'amount' ? discountValue : 0;
        const sellingPrice = Math.max(0, mrp - itemDiscountAmount);
        const lineTotal = sellingPrice * quantity;
        return { ...item, mrp, quantity, itemDiscountType: discountType, itemDiscountValue: discountValue, itemDiscountAmount, sellingPrice, lineTotal };
    });
    const subtotal = normalizedItems.reduce((sum, item) => sum + item.mrp * item.quantity, 0);
    const totalItemDiscount = normalizedItems.reduce((sum, item) => sum + item.itemDiscountAmount * item.quantity, 0);
    const afterItemDiscount = subtotal - totalItemDiscount;
    const safeBillDiscountValue = Number(billDiscountValue || 0);
    const billDiscountAmount = billDiscountType === 'percent'
        ? (afterItemDiscount * safeBillDiscountValue) / 100
        : billDiscountType === 'amount'
            ? safeBillDiscountValue
            : 0;
    const taxableAmount = Math.max(0, afterItemDiscount - billDiscountAmount);
    const gstAmount = taxableAmount * 0.05;
    const cgst = gstAmount / 2;
    const sgst = gstAmount / 2;
    const rawTotal = taxableAmount + gstAmount;
    const roundOff = Math.round(rawTotal) - rawTotal;
    const totalAmount = Math.round(rawTotal);
    return {
        normalizedItems,
        subtotal,
        totalItemDiscount,
        billDiscountAmount,
        taxableAmount,
        gstAmount,
        cgst,
        sgst,
        roundOff,
        totalAmount,
    };
};
const generateBillNumber = async () => {
    const year = new Date().getFullYear();
    const prefix = `SW-${year}-`;
    const latest = await Bill_1.default.findOne({ billNumber: new RegExp(`^${prefix}`) }).sort({ createdAt: -1 });
    const current = latest?.billNumber ? Number(latest.billNumber.split('-')[2]) : 0;
    return `${prefix}${String(current + 1).padStart(4, '0')}`;
};
router.get('/next-number', async (_req, res) => {
    const billNumber = await generateBillNumber();
    return res.json({ billNumber });
});
router.get('/scan/:barcode', async (req, res) => {
    const barcode = String(req.params.barcode || '').trim();
    const stockItem = await StockItem_1.default.findOne({ barcode, status: 'available' }).populate('product', 'name category billingSubCategory');
    if (!stockItem) {
        return res.status(404).json({ error: 'Barcode not found or already sold' });
    }
    const product = stockItem.product;
    return res.json({
        stockItemId: stockItem._id,
        barcode: stockItem.barcode,
        productId: product?._id,
        _id: product?._id, // backwards-compatible for existing frontend store
        name: product?.name || '',
        category: product?.category || '',
        size: stockItem.size,
        mrp: stockItem.sellingPrice,
        incomingPrice: stockItem.incomingPrice,
        stock: 1,
    });
});
router.get('/search', billingAuthMiddleware_1.billingAuthMiddleware, async (req, res) => {
    const q = req.query.q || '';
    if (!q || q.trim().length < 2)
        return res.json([]);
    const regex = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const results = await StockItem_1.default.aggregate([
        { $match: { status: 'available' } },
        {
            $lookup: {
                from: 'products',
                localField: 'product',
                foreignField: '_id',
                as: 'productData',
            },
        },
        { $unwind: '$productData' },
        {
            $match: {
                'productData.isBillingProduct': true,
                'productData.isActive': true,
                $or: [
                    { 'productData.name': regex },
                    { 'productData.billingName': regex },
                    { 'productData.tags': regex },
                    { 'productData.category': regex },
                    { 'productData.subCategory': regex },
                ],
            },
        },
        {
            $group: {
                _id: { product: '$productData._id', size: '$size' },
                productId: { $first: '$productData._id' },
                name: { $first: { $ifNull: ['$productData.billingName', '$productData.name'] } },
                category: { $first: '$productData.category' },
                subCategory: { $first: '$productData.subCategory' },
                price: { $first: '$sellingPrice' },
                discountPrice: { $first: '$productData.discountPrice' },
                stock: { $sum: 1 },
                barcode: { $first: '$barcode' },
                size: { $first: '$size' },
            },
        },
        { $sort: { name: 1, size: 1 } },
        { $limit: 10 },
    ]);
    return res.json((results || []).map((item) => ({
        _id: item.productId,
        productId: item.productId,
        name: item.name,
        barcode: item.barcode,
        size: item.size || '',
        price: Number(item.price || 0),
        discountPrice: Number(item.discountPrice || 0),
        stock: Number(item.stock || 0),
        category: item.category || '',
        subCategory: item.subCategory || '',
    })));
});
router.post('/calculate', async (req, res) => {
    const { items, billDiscountType, billDiscountValue } = req.body || {};
    const totals = calculateBillTotals(items || [], billDiscountType || 'none', Number(billDiscountValue || 0));
    return res.json({
        subtotal: totals.subtotal,
        itemDiscounts: totals.totalItemDiscount,
        billDiscount: totals.billDiscountAmount,
        taxableAmount: totals.taxableAmount,
        gst: totals.gstAmount,
        cgst: totals.cgst,
        sgst: totals.sgst,
        roundOff: totals.roundOff,
        total: totals.totalAmount,
    });
});
router.post('/hold', billingAuthMiddleware_1.billingAuthMiddleware, async (req, res) => {
    const payload = req.body || {};
    try {
        enforceDiscountLimit(req, payload);
    }
    catch (error) {
        return res.status(403).json({ message: error.message || 'Discount permission denied' });
    }
    const totals = calculateBillTotals(payload.items || [], payload.billDiscountType || 'none', Number(payload.billDiscountValue || 0));
    const bill = await Bill_1.default.create({
        ...payload,
        items: totals.normalizedItems,
        subtotal: totals.subtotal,
        totalItemDiscount: totals.totalItemDiscount,
        billDiscountAmount: totals.billDiscountAmount,
        taxableAmount: totals.taxableAmount,
        gstAmount: totals.gstAmount,
        cgst: totals.cgst,
        sgst: totals.sgst,
        roundOff: totals.roundOff,
        totalAmount: totals.totalAmount,
        status: 'held',
        createdBy: req.billingAdminId,
    });
    return res.status(201).json(bill);
});
router.get('/held', billingAuthMiddleware_1.billingAuthMiddleware, async (req, res) => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const query = { status: 'held', createdAt: { $gte: start } };
    if (req.billingAdmin?.role === 'cashier')
        query.createdBy = req.billingAdminId;
    const heldBills = await Bill_1.default.find(query).sort({ createdAt: -1 });
    res.json(heldBills);
});
router.delete('/held/:id', billingAuthMiddleware_1.billingAuthMiddleware, async (req, res) => {
    const query = { _id: req.params.id };
    if (req.billingAdmin?.role === 'cashier')
        query.createdBy = req.billingAdminId;
    await Bill_1.default.findOneAndDelete(query);
    res.json({ message: 'Held bill discarded' });
});
router.post('/complete', billingAuthMiddleware_1.billingAuthMiddleware, async (req, res) => {
    try {
        const payload = req.body || {};
        enforceDiscountLimit(req, payload);
        const totals = calculateBillTotals(payload.items || [], payload.billDiscountType || 'none', Number(payload.billDiscountValue || 0));
        const paymentBreakdown = Array.isArray(payload.paymentBreakdown)
            ? payload.paymentBreakdown
            : [
                ...(Number(payload.splitPayment?.cash || 0) > 0 ? [{ method: 'cash', amount: Number(payload.splitPayment.cash || 0) }] : []),
                ...(Number(payload.splitPayment?.gpay || 0) > 0 ? [{ method: 'gpay', amount: Number(payload.splitPayment.gpay || 0) }] : []),
            ];
        const paymentMethod = payload.paymentMethod || 'cash';
        if (paymentMethod === 'partial') {
            if (!paymentBreakdown.length) {
                return res.status(400).json({ error: 'At least one payment split is required for partial payment' });
            }
            const hasInvalidAmount = paymentBreakdown.some((entry) => Number(entry?.amount || 0) <= 0);
            if (hasInvalidAmount) {
                return res.status(400).json({ error: 'Each payment split amount must be greater than 0' });
            }
            const methods = paymentBreakdown.map((entry) => String(entry?.method || ''));
            if (new Set(methods).size !== methods.length) {
                return res.status(400).json({ error: 'Duplicate payment methods are not allowed in partial payment' });
            }
            const totalPaid = paymentBreakdown.reduce((sum, p) => sum + Number(p.amount || 0), 0);
            const diff = Math.abs(totalPaid - totals.totalAmount);
            if (diff > 1) {
                return res.status(400).json({
                    error: `Payment mismatch: paid ₹${totalPaid}, bill is ₹${totals.totalAmount}`,
                });
            }
        }
        const cashPortion = paymentMethod === 'partial'
            ? paymentBreakdown
                .filter((entry) => String(entry?.method || '') === 'cash')
                .reduce((sum, entry) => sum + Number(entry.amount || 0), 0)
            : paymentMethod === 'cash'
                ? totals.totalAmount
                : 0;
        const billNumber = await generateBillNumber();
        const completed = await Bill_1.default.create({
            ...payload,
            paymentMethod,
            paymentBreakdown,
            billNumber,
            items: totals.normalizedItems,
            subtotal: totals.subtotal,
            totalItemDiscount: totals.totalItemDiscount,
            billDiscountAmount: totals.billDiscountAmount,
            taxableAmount: totals.taxableAmount,
            gstAmount: totals.gstAmount,
            cgst: totals.cgst,
            sgst: totals.sgst,
            roundOff: totals.roundOff,
            totalAmount: totals.totalAmount,
            changeReturned: Math.max(0, Number(payload.cashReceived || 0) - cashPortion),
            status: 'completed',
            completedAt: new Date(),
            createdBy: req.billingAdminId,
        });
        for (const item of totals.normalizedItems) {
            const productId = item.productId || item.product;
            const barcode = String(item.barcode || '').trim();
            const size = String(item.size || '').trim();
            const quantity = Math.max(1, Number(item.quantity || 1));
            if (quantity !== 1) {
                return res.status(400).json({ message: `Quantity must be 1 per barcode (${barcode})` });
            }
            const updated = await StockItem_1.default.findOneAndUpdate({ barcode, status: 'available' }, { status: 'sold', soldInBill: completed._id });
            if (!updated) {
                return res.status(400).json({ message: `Barcode not available: ${barcode}` });
            }
            const product = await Product_1.default.findById(productId);
            if (!product)
                continue;
            const sizeStock = Array.isArray(product.sizeStock) ? product.sizeStock : [];
            const sizeEntry = sizeStock.find((s) => String(s.size) === size);
            if (sizeEntry)
                sizeEntry.stock = Math.max(0, Number(sizeEntry.stock || 0) - quantity);
            product.totalStock = sizeStock.reduce((sum, s) => sum + Number(s.stock || 0), 0);
            product.stock = product.totalStock;
            if (product.totalStock === 0)
                product.isActive = false;
            await product.save();
        }
        await (0, revalidateFrontend_1.triggerRevalidate)(['/', '/products']);
        return res.status(201).json(completed);
    }
    catch (error) {
        return res.status(500).json({ message: error.message || 'Failed to complete bill' });
    }
});
router.get('/', billingAuthMiddleware_1.billingAuthMiddleware, async (req, res) => {
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 20);
    const skip = (page - 1) * limit;
    const customerPhone = String(req.query.customerPhone || '').trim();
    const query = {};
    if (customerPhone) {
        query['customer.phone'] = customerPhone;
    }
    if (req.billingAdmin?.role === 'cashier')
        query.createdBy = req.billingAdminId;
    const [data, total] = await Promise.all([
        Bill_1.default.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
        Bill_1.default.countDocuments(query),
    ]);
    res.json({ data, page, limit, total });
});
router.get('/history', billingAuthMiddleware_1.billingAuthMiddleware, async (req, res) => {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.max(1, Math.min(100, Number(req.query.limit || 20)));
    const skip = (page - 1) * limit;
    const search = String(req.query.search || '').trim();
    const status = String(req.query.status || '').trim();
    const paymentMethod = String(req.query.paymentMethod || '').trim();
    const salesmanId = String(req.query.salesmanId || '').trim();
    const startDate = String(req.query.startDate || '').trim();
    const endDate = String(req.query.endDate || '').trim();
    const query = {
        status: { $in: ['completed', 'replaced', 'partial_replaced'] },
    };
    if (req.billingAdmin?.role === 'cashier')
        query.createdBy = req.billingAdminId;
    if (search) {
        const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escaped, 'i');
        query.$or = [{ billNumber: regex }, { 'customer.name': regex }, { 'customer.phone': regex }];
    }
    if (status && status !== 'all') {
        query.status = status;
    }
    if (paymentMethod && paymentMethod !== 'all') {
        query.paymentMethod = paymentMethod;
    }
    if (salesmanId && salesmanId !== 'all' && mongoose_1.default.Types.ObjectId.isValid(salesmanId)) {
        query.salesman = new mongoose_1.default.Types.ObjectId(salesmanId);
    }
    if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) {
            query.createdAt.$gte = new Date(`${startDate}T00:00:00.000Z`);
        }
        if (endDate) {
            query.createdAt.$lte = new Date(`${endDate}T23:59:59.999Z`);
        }
    }
    const [data, total] = await Promise.all([
        Bill_1.default.find(query)
            .populate('salesman', 'name phone')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),
        Bill_1.default.countDocuments(query),
    ]);
    return res.json({ data, total, page, limit });
});
router.put('/:id/edit', billingAuthMiddleware_1.billingAuthMiddleware, async (req, res) => {
    try {
        if (!canEditBills(req.billingAdmin)) {
            return res.status(403).json({ message: 'Permission denied to edit bills' });
        }
        const bill = await Bill_1.default.findById(req.params.id);
        if (!bill)
            return res.status(404).json({ message: 'Bill not found' });
        if (!['completed', 'replaced', 'partial_replaced'].includes(String(bill.status))) {
            return res.status(400).json({ message: 'Only completed or returned bills can be edited' });
        }
        const payload = req.body || {};
        enforceDiscountLimit(req, payload);
        const editReason = String(payload.editReason || '').trim();
        if (!editReason) {
            return res.status(400).json({ message: 'Edit reason is required' });
        }
        const totals = calculateBillTotals(payload.items || [], payload.billDiscountType || 'none', Number(payload.billDiscountValue || 0));
        const paymentBreakdown = Array.isArray(payload.paymentBreakdown)
            ? payload.paymentBreakdown
            : [
                ...(Number(payload.splitPayment?.cash || 0) > 0 ? [{ method: 'cash', amount: Number(payload.splitPayment.cash || 0) }] : []),
                ...(Number(payload.splitPayment?.gpay || 0) > 0 ? [{ method: 'gpay', amount: Number(payload.splitPayment.gpay || 0) }] : []),
            ];
        const paymentMethod = payload.paymentMethod || 'cash';
        if (paymentMethod === 'partial') {
            if (!paymentBreakdown.length) {
                return res.status(400).json({ message: 'At least one payment split is required for partial payment' });
            }
            const hasInvalidAmount = paymentBreakdown.some((entry) => Number(entry?.amount || 0) <= 0);
            if (hasInvalidAmount) {
                return res.status(400).json({ message: 'Each payment split amount must be greater than 0' });
            }
            const methods = paymentBreakdown.map((entry) => String(entry?.method || ''));
            if (new Set(methods).size !== methods.length) {
                return res.status(400).json({ message: 'Duplicate payment methods are not allowed in partial payment' });
            }
            const totalPaid = paymentBreakdown.reduce((sum, p) => sum + Number(p.amount || 0), 0);
            const diff = Math.abs(totalPaid - totals.totalAmount);
            if (diff > 1) {
                return res.status(400).json({
                    message: `Payment mismatch: paid ₹${totalPaid}, bill is ₹${totals.totalAmount}`,
                });
            }
        }
        const cashPortion = paymentMethod === 'partial'
            ? paymentBreakdown
                .filter((entry) => String(entry?.method || '') === 'cash')
                .reduce((sum, entry) => sum + Number(entry.amount || 0), 0)
            : paymentMethod === 'cash'
                ? totals.totalAmount
                : 0;
        const originalItems = Array.isArray(bill.items) ? bill.items : [];
        const previousTotal = Number(bill.totalAmount || 0);
        const originalBarcodes = new Set(originalItems.map((item) => String(item.barcode || '').trim()).filter(Boolean));
        const updatedBarcodes = new Set(totals.normalizedItems.map((item) => String(item.barcode || '').trim()).filter(Boolean));
        const removedItems = originalItems.filter((item) => {
            const barcode = String(item.barcode || '').trim();
            return barcode && !updatedBarcodes.has(barcode);
        });
        const addedItems = totals.normalizedItems.filter((item) => {
            const barcode = String(item.barcode || '').trim();
            return barcode && !originalBarcodes.has(barcode);
        });
        for (const item of removedItems) {
            const barcode = String(item.barcode || '').trim();
            const released = await StockItem_1.default.findOneAndUpdate({ barcode, soldInBill: bill._id }, { status: 'available', soldInBill: null });
            if (!released) {
                return res.status(400).json({ message: `Unable to release stock item ${barcode}` });
            }
            const productId = String(item.product || item.productId || released.product || '');
            await adjustProductSizeStock(productId, String(item.size || released.size || ''), 1);
        }
        for (const item of addedItems) {
            const barcode = String(item.barcode || '').trim();
            const sold = await StockItem_1.default.findOneAndUpdate({ barcode, status: 'available' }, { status: 'sold', soldInBill: bill._id });
            if (!sold) {
                return res.status(400).json({ message: `Barcode not available: ${barcode}` });
            }
            const productId = String(item.product || item.productId || sold.product || '');
            await adjustProductSizeStock(productId, String(item.size || sold.size || ''), -1);
        }
        bill.customer = payload.customer || { name: '', phone: '' };
        bill.salesman = payload.salesmanId || null;
        bill.paymentMethod = paymentMethod;
        bill.paymentBreakdown = paymentBreakdown;
        bill.items = totals.normalizedItems;
        bill.billDiscountType = payload.billDiscountType || 'none';
        bill.billDiscountValue = Number(payload.billDiscountValue || 0);
        bill.subtotal = totals.subtotal;
        bill.totalItemDiscount = totals.totalItemDiscount;
        bill.billDiscountAmount = totals.billDiscountAmount;
        bill.taxableAmount = totals.taxableAmount;
        bill.gstAmount = totals.gstAmount;
        bill.cgst = totals.cgst;
        bill.sgst = totals.sgst;
        bill.roundOff = totals.roundOff;
        bill.totalAmount = totals.totalAmount;
        bill.cashReceived = Number(payload.cashReceived || 0);
        bill.changeReturned = Math.max(0, Number(payload.cashReceived || 0) - cashPortion);
        bill.editHistory = [
            ...(bill.editHistory || []),
            {
                editedAt: new Date(),
                editedBy: req.billingAdminId,
                editReason,
                previousTotal,
                newTotal: totals.totalAmount,
            },
        ];
        await bill.save();
        await (0, revalidateFrontend_1.triggerRevalidate)(['/', '/products', '/history', '/reports', '/billing']);
        const populated = await Bill_1.default.findById(bill._id).populate('salesman', 'name phone');
        return res.json(populated);
    }
    catch (error) {
        return res.status(500).json({ message: error.message || 'Failed to edit bill' });
    }
});
router.get('/number/:billNumber', billingAuthMiddleware_1.billingAuthMiddleware, async (req, res) => {
    const query = { billNumber: req.params.billNumber };
    if (req.billingAdmin?.role === 'cashier')
        query.createdBy = req.billingAdminId;
    const bill = await Bill_1.default.findOne(query);
    if (!bill)
        return res.status(404).json({ message: 'Bill not found' });
    return res.json(bill);
});
router.get('/:id', billingAuthMiddleware_1.billingAuthMiddleware, async (req, res) => {
    const query = { _id: req.params.id };
    if (req.billingAdmin?.role === 'cashier')
        query.createdBy = req.billingAdminId;
    const bill = await Bill_1.default.findOne(query);
    if (!bill)
        return res.status(404).json({ message: 'Bill not found' });
    return res.json(bill);
});
router.delete('/:id', billingAuthMiddleware_1.billingAuthMiddleware, billingRoleMiddleware_1.requireSuperAdmin, async (req, res) => {
    const bill = await Bill_1.default.findByIdAndDelete(req.params.id);
    if (!bill)
        return res.status(404).json({ message: 'Bill not found' });
    return res.json({ message: 'Bill deleted' });
});
exports.default = router;
//# sourceMappingURL=billing-bills.js.map