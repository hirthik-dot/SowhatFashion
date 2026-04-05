"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.newArrivalsAdminRoutes = exports.newArrivalsPublicRoutes = void 0;
const express_1 = require("express");
const NewArrival_1 = __importDefault(require("../models/NewArrival"));
const authMiddleware_1 = __importDefault(require("../middleware/authMiddleware"));
const revalidateFrontend_1 = require("../lib/revalidateFrontend");
const publicRouter = (0, express_1.Router)();
exports.newArrivalsPublicRoutes = publicRouter;
const adminRouter = (0, express_1.Router)();
exports.newArrivalsAdminRoutes = adminRouter;
// GET /api/new-arrivals
publicRouter.get('/', async (req, res) => {
    try {
        const limit = Math.min(Math.max(parseInt(String(req.query.limit), 10) || 100, 1), 200);
        const skip = Math.max(parseInt(String(req.query.skip), 10) || 0, 0);
        const [raw, total] = await Promise.all([
            NewArrival_1.default.find({ isActive: true })
                .populate('product')
                .sort({ order: 1, addedAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            NewArrival_1.default.countDocuments({ isActive: true }),
        ]);
        const items = raw.filter((row) => row.product && row.product.isActive !== false);
        res.json({
            items,
            total,
            hasMore: skip + raw.length < total,
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
// GET /api/admin/new-arrivals
adminRouter.get('/', authMiddleware_1.default, async (_req, res) => {
    try {
        const rows = await NewArrival_1.default.find().populate('product').sort({ order: 1, addedAt: -1 });
        res.json(rows);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
// PATCH /api/admin/new-arrivals/reorder (before :id routes)
adminRouter.patch('/reorder', authMiddleware_1.default, async (req, res) => {
    try {
        const body = req.body;
        if (!Array.isArray(body)) {
            return res.status(400).json({ message: 'Expected array of { id, order }' });
        }
        await Promise.all(body.map((row) => NewArrival_1.default.findByIdAndUpdate(row.id, { order: row.order }).exec()));
        await (0, revalidateFrontend_1.triggerRevalidate)(['/']);
        res.json({ ok: true });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
// POST /api/admin/new-arrivals
adminRouter.post('/', authMiddleware_1.default, async (req, res) => {
    try {
        const { productId, weekLabel } = req.body;
        if (!productId) {
            return res.status(400).json({ message: 'productId required' });
        }
        const maxOrder = await NewArrival_1.default.findOne().sort({ order: -1 }).select('order').lean();
        const order = (maxOrder?.order ?? -1) + 1;
        const row = await NewArrival_1.default.create({
            product: productId,
            weekLabel: weekLabel?.trim() || 'This Week',
            order,
        });
        const populated = await NewArrival_1.default.findById(row._id).populate('product');
        await (0, revalidateFrontend_1.triggerRevalidate)(['/']);
        res.status(201).json(populated);
    }
    catch (error) {
        if (error?.code === 11000) {
            return res.status(409).json({ message: 'Product already in new arrivals' });
        }
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
// DELETE /api/admin/new-arrivals/:id
adminRouter.delete('/:id', authMiddleware_1.default, async (req, res) => {
    try {
        const row = await NewArrival_1.default.findByIdAndDelete(req.params.id);
        if (!row) {
            return res.status(404).json({ message: 'Not found' });
        }
        await (0, revalidateFrontend_1.triggerRevalidate)(['/']);
        res.json({ message: 'Removed' });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
// PATCH /api/admin/new-arrivals/:id/toggle
adminRouter.patch('/:id/toggle', authMiddleware_1.default, async (req, res) => {
    try {
        const row = await NewArrival_1.default.findById(req.params.id);
        if (!row) {
            return res.status(404).json({ message: 'Not found' });
        }
        row.isActive = !row.isActive;
        await row.save();
        await row.populate('product');
        await (0, revalidateFrontend_1.triggerRevalidate)(['/']);
        res.json(row);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
//# sourceMappingURL=newArrivals.js.map