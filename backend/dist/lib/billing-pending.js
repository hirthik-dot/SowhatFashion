"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.findPendingBillsForPhone = exports.getPendingBalancesByPhones = exports.getCustomerPendingBalance = exports.PENDING_BILL_STATUSES = void 0;
const Bill_1 = __importDefault(require("../models/Bill"));
const billing_points_1 = require("./billing-points");
exports.PENDING_BILL_STATUSES = ['completed', 'partial_replaced'];
const phoneRegex = (normalized) => {
    const suffix = normalized.slice(-10).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`${suffix}$`);
};
const getCustomerPendingBalance = async (phone) => {
    const normalized = (0, billing_points_1.normalizeBillingPhone)(phone);
    if (normalized.length < 10)
        return 0;
    const rows = await Bill_1.default.aggregate([
        {
            $match: {
                status: { $in: exports.PENDING_BILL_STATUSES },
                pendingAmount: { $gt: 0 },
                'customer.phone': phoneRegex(normalized),
            },
        },
        { $group: { _id: null, total: { $sum: '$pendingAmount' } } },
    ]);
    return Number(rows[0]?.total || 0);
};
exports.getCustomerPendingBalance = getCustomerPendingBalance;
const getPendingBalancesByPhones = async (phones) => {
    const normalizedPhones = [...new Set(phones.map((p) => (0, billing_points_1.normalizeBillingPhone)(p)).filter((p) => p.length >= 10))];
    const result = new Map();
    await Promise.all(normalizedPhones.map(async (phone) => {
        const balance = await (0, exports.getCustomerPendingBalance)(phone);
        if (balance > 0)
            result.set(phone, balance);
    }));
    return result;
};
exports.getPendingBalancesByPhones = getPendingBalancesByPhones;
const findPendingBillsForPhone = async (phone) => {
    const normalized = (0, billing_points_1.normalizeBillingPhone)(phone);
    if (normalized.length < 10)
        return [];
    return Bill_1.default.find({
        status: { $in: exports.PENDING_BILL_STATUSES },
        pendingAmount: { $gt: 0 },
        'customer.phone': phoneRegex(normalized),
    })
        .select('billNumber customer totalAmount pendingAmount paymentMethod paymentBreakdown completedAt createdAt')
        .sort({ completedAt: 1 })
        .lean();
};
exports.findPendingBillsForPhone = findPendingBillsForPhone;
//# sourceMappingURL=billing-pending.js.map