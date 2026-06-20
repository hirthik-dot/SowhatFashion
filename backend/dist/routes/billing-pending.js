"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Bill_1 = __importDefault(require("../models/Bill"));
const PendingSettlement_1 = __importDefault(require("../models/PendingSettlement"));
const billingAuthMiddleware_1 = require("../middleware/billingAuthMiddleware");
const billing_points_1 = require("../lib/billing-points");
const billing_pending_1 = require("../lib/billing-pending");
const router = express_1.default.Router();
router.get('/summary', billingAuthMiddleware_1.billingAuthMiddleware, async (_req, res) => {
    const bills = await Bill_1.default.find({
        status: { $in: billing_pending_1.PENDING_BILL_STATUSES },
        pendingAmount: { $gt: 0 },
        'customer.phone': { $exists: true, $ne: '' },
    })
        .select('customer pendingAmount completedAt createdAt')
        .sort({ completedAt: -1 })
        .lean();
    const byPhone = new Map();
    for (const bill of bills) {
        const normalized = (0, billing_points_1.normalizeBillingPhone)(String(bill.customer?.phone || ''));
        if (normalized.length < 10)
            continue;
        const pending = Number(bill.pendingAmount || 0);
        if (pending <= 0)
            continue;
        const completedAt = bill.completedAt || bill.createdAt;
        const existing = byPhone.get(normalized);
        if (existing) {
            existing.totalPending += pending;
            existing.billCount += 1;
            if (completedAt && (!existing.oldestPending || completedAt < existing.oldestPending)) {
                existing.oldestPending = completedAt;
            }
            if (completedAt && (!existing.latestPending || completedAt > existing.latestPending)) {
                existing.latestPending = completedAt;
            }
            if (String(bill.customer?.name || '').trim()) {
                existing.name = String(bill.customer?.name || '').trim();
            }
        }
        else {
            byPhone.set(normalized, {
                name: String(bill.customer?.name || '').trim() || 'Customer',
                phone: String(bill.customer?.phone || '').trim(),
                normalizedPhone: normalized,
                totalPending: pending,
                billCount: 1,
                oldestPending: completedAt,
                latestPending: completedAt,
            });
        }
    }
    const customers = [...byPhone.values()].sort((a, b) => b.totalPending - a.totalPending);
    const totalAmount = customers.reduce((sum, row) => sum + row.totalPending, 0);
    return res.json({
        customerCount: customers.length,
        totalAmount,
        customers,
    });
});
router.get('/balance', billingAuthMiddleware_1.billingAuthMiddleware, async (req, res) => {
    const phone = (0, billing_points_1.normalizeBillingPhone)(String(req.query.phone || ''));
    if (phone.length < 10) {
        return res.json({ phone, totalPending: 0, bills: [] });
    }
    const customerBills = await (0, billing_pending_1.findPendingBillsForPhone)(phone);
    const totalPending = customerBills.reduce((sum, bill) => sum + Number(bill.pendingAmount || 0), 0);
    return res.json({
        phone,
        totalPending,
        bills: customerBills.map((bill) => ({
            _id: bill._id,
            billNumber: bill.billNumber,
            totalAmount: bill.totalAmount,
            pendingAmount: bill.pendingAmount,
            paymentMethod: bill.paymentMethod,
            paymentBreakdown: bill.paymentBreakdown,
            completedAt: bill.completedAt || bill.createdAt,
        })),
    });
});
router.get('/customer/:phone', billingAuthMiddleware_1.billingAuthMiddleware, async (req, res) => {
    const phone = (0, billing_points_1.normalizeBillingPhone)(String(req.params.phone || ''));
    if (phone.length < 10) {
        return res.status(400).json({ message: 'Valid phone number is required' });
    }
    const customerBills = await (0, billing_pending_1.findPendingBillsForPhone)(phone);
    const settlements = await PendingSettlement_1.default.find({ phone })
        .sort({ createdAt: -1 })
        .limit(50)
        .populate('createdBy', 'name')
        .lean();
    const totalPending = customerBills.reduce((sum, bill) => sum + Number(bill.pendingAmount || 0), 0);
    const customerName = String(customerBills[0]?.customer?.name || settlements[0]?.customerName || 'Customer');
    return res.json({
        phone,
        customerName,
        totalPending,
        bills: customerBills.sort((a, b) => new Date(b.completedAt || b.createdAt || 0).getTime() -
            new Date(a.completedAt || a.createdAt || 0).getTime()),
        settlements,
    });
});
router.get('/settlements', billingAuthMiddleware_1.billingAuthMiddleware, async (req, res) => {
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 50)));
    const settlements = await PendingSettlement_1.default.find()
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('createdBy', 'name')
        .lean();
    return res.json(settlements);
});
router.post('/settle', billingAuthMiddleware_1.billingAuthMiddleware, async (req, res) => {
    try {
        const payload = req.body || {};
        const phone = (0, billing_points_1.normalizeBillingPhone)(String(payload.phone || ''));
        const amount = Math.round(Number(payload.amount || 0));
        const paymentMethod = String(payload.paymentMethod || 'cash');
        const note = String(payload.note || '').trim();
        if (phone.length < 10) {
            return res.status(400).json({ message: 'Valid customer phone is required' });
        }
        if (amount <= 0) {
            return res.status(400).json({ message: 'Settlement amount must be greater than 0' });
        }
        if (!['cash', 'gpay', 'upi', 'card'].includes(paymentMethod)) {
            return res.status(400).json({ message: 'Invalid payment method' });
        }
        const customerBills = await (0, billing_pending_1.findPendingBillsForPhone)(phone);
        const totalPending = customerBills.reduce((sum, bill) => sum + Number(bill.pendingAmount || 0), 0);
        if (totalPending <= 0) {
            return res.status(400).json({ message: 'This customer has no pending balance' });
        }
        if (amount > totalPending) {
            return res.status(400).json({
                message: `Settlement cannot exceed pending balance of ₹${totalPending}`,
            });
        }
        let remaining = amount;
        const allocations = [];
        for (const bill of customerBills) {
            if (remaining <= 0)
                break;
            const billPending = Number(bill.pendingAmount || 0);
            if (billPending <= 0)
                continue;
            const applied = Math.min(remaining, billPending);
            await Bill_1.default.updateOne({ _id: bill._id }, { $inc: { pendingAmount: -applied } });
            allocations.push({
                bill: bill._id,
                billNumber: String(bill.billNumber || ''),
                amount: applied,
            });
            remaining -= applied;
        }
        const settlement = await PendingSettlement_1.default.create({
            phone,
            customerName: String(customerBills[0]?.customer?.name || payload.customerName || 'Customer'),
            amount,
            paymentMethod,
            note,
            allocations,
            createdBy: req.billingAdminId,
        });
        return res.json({
            settlement,
            previousBalance: totalPending,
            newBalance: totalPending - amount,
        });
    }
    catch (error) {
        return res.status(500).json({ message: error.message || 'Failed to record settlement' });
    }
});
exports.default = router;
//# sourceMappingURL=billing-pending.js.map