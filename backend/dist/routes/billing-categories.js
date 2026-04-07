"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const BillingCategory_1 = __importDefault(require("../models/BillingCategory"));
const billingRoleMiddleware_1 = require("../middleware/billingRoleMiddleware");
const router = express_1.default.Router();
router.use(billingRoleMiddleware_1.requireAdmin);
router.get('/', async (_req, res) => {
    const categories = await BillingCategory_1.default.find({ isActive: true }).sort({ order: 1, name: 1 }).lean();
    const mains = categories.filter((c) => !c.parentCategory);
    const nested = mains.map((main) => ({
        ...main,
        subCategories: categories.filter((sub) => String(sub.parentCategory || '') === String(main._id)),
    }));
    res.json(nested);
});
router.get('/flat', async (req, res) => {
    const supplier = String(req.query.supplier || '').trim();
    const query = { isActive: true };
    if (supplier)
        query.supplier = supplier;
    const categories = await BillingCategory_1.default.find(query).sort({ order: 1, name: 1 });
    res.json(categories);
});
router.get('/:id/subcategories', async (req, res) => {
    const supplier = String(req.query.supplier || '').trim();
    const query = { parentCategory: req.params.id, isActive: true };
    if (supplier)
        query.supplier = supplier;
    const categories = await BillingCategory_1.default.find(query).sort({
        order: 1,
        name: 1,
    });
    res.json(categories);
});
router.post('/', (0, billingRoleMiddleware_1.requirePermission)('canManageSuppliersCategories'), async (req, res) => {
    const category = await BillingCategory_1.default.create(req.body || {});
    res.status(201).json(category);
});
router.put('/:id', (0, billingRoleMiddleware_1.requirePermission)('canManageSuppliersCategories'), async (req, res) => {
    const category = await BillingCategory_1.default.findByIdAndUpdate(req.params.id, req.body || {}, { new: true });
    if (!category)
        return res.status(404).json({ message: 'Category not found' });
    res.json(category);
});
router.delete('/:id', (0, billingRoleMiddleware_1.requirePermission)('canManageSuppliersCategories'), async (req, res) => {
    const category = await BillingCategory_1.default.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!category)
        return res.status(404).json({ message: 'Category not found' });
    res.json({ message: 'Category deactivated' });
});
exports.default = router;
//# sourceMappingURL=billing-categories.js.map