"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const BillingPointsAccount_1 = __importDefault(require("../models/BillingPointsAccount"));
const BillingPointsLedger_1 = __importDefault(require("../models/BillingPointsLedger"));
const billing_points_1 = require("../lib/billing-points");
const router = express_1.default.Router();
router.get('/balance', async (req, res) => {
    const phone = (0, billing_points_1.normalizeBillingPhone)(String(req.query.phone || ''));
    if (!phone || phone.length < 10) {
        return res.json({ phone: phone || '', balance: 0 });
    }
    const account = await BillingPointsAccount_1.default.findOne({ phone }).lean();
    return res.json({
        phone,
        balance: Number(account?.balance || 0),
        customerName: account?.customerName || '',
    });
});
router.get('/ledger', async (req, res) => {
    const phone = (0, billing_points_1.normalizeBillingPhone)(String(req.query.phone || ''));
    if (!phone || phone.length < 10) {
        return res.status(400).json({ message: 'Valid phone is required' });
    }
    const limit = Math.min(50, Math.max(1, Number(req.query.limit || 20)));
    const entries = await BillingPointsLedger_1.default.find({ phone })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
    const account = await BillingPointsAccount_1.default.findOne({ phone }).lean();
    return res.json({
        phone,
        balance: Number(account?.balance || 0),
        entries,
    });
});
exports.default = router;
//# sourceMappingURL=billing-points.js.map