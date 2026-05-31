"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Supplier_1 = __importDefault(require("../models/Supplier"));
const billingRoleMiddleware_1 = require("../middleware/billingRoleMiddleware");
const router = express_1.default.Router();
router.get('/', async (_req, res) => {
    const suppliers = await Supplier_1.default.find({ isActive: true }).sort({ createdAt: -1 });
    res.json(suppliers);
});
router.post('/', (0, billingRoleMiddleware_1.requirePermission)('canManageSuppliersCategories'), async (req, res) => {
    const supplier = await Supplier_1.default.create(req.body || {});
    return res.status(201).json(supplier);
});
router.put('/:id', (0, billingRoleMiddleware_1.requirePermission)('canManageSuppliersCategories'), async (req, res) => {
    const supplier = await Supplier_1.default.findByIdAndUpdate(req.params.id, req.body || {}, { new: true });
    if (!supplier)
        return res.status(404).json({ message: 'Supplier not found' });
    return res.json(supplier);
});
router.delete('/:id', (0, billingRoleMiddleware_1.requirePermission)('canManageSuppliersCategories'), async (req, res) => {
    const supplier = await Supplier_1.default.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!supplier)
        return res.status(404).json({ message: 'Supplier not found' });
    return res.json({ message: 'Supplier deactivated' });
});
exports.default = router;
//# sourceMappingURL=billing-suppliers.js.map