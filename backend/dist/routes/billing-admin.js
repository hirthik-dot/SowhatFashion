"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const BillingAdmin_1 = __importDefault(require("../models/BillingAdmin"));
const Salesman_1 = __importDefault(require("../models/Salesman"));
const billingRoleMiddleware_1 = require("../middleware/billingRoleMiddleware");
const router = express_1.default.Router();
const normalizePermissions = (role, incoming = {}) => {
    if (role === 'superadmin') {
        return {
            canBill: true,
            canReturn: true,
            canManageStock: true,
            canViewReports: true,
            canViewCustomerReports: true,
            canManageSuppliersCategories: true,
            canManageAdmins: true,
            canEditBills: true,
            canDiscount: true,
            maxDiscountPercent: 100,
        };
    }
    if (role === 'admin') {
        return {
            canBill: true,
            canReturn: Boolean(incoming.canReturn ?? true),
            canManageStock: Boolean(incoming.canManageStock ?? true),
            canViewReports: Boolean(incoming.canViewReports ?? true),
            canViewCustomerReports: Boolean(incoming.canViewCustomerReports ?? true),
            canManageSuppliersCategories: Boolean(incoming.canManageSuppliersCategories ?? true),
            canManageAdmins: Boolean(incoming.canManageAdmins ?? true),
            canEditBills: Boolean(incoming.canEditBills ?? true),
            canDiscount: Boolean(incoming.canDiscount ?? true),
            maxDiscountPercent: Math.min(100, Math.max(0, Number(incoming.maxDiscountPercent ?? 25))),
        };
    }
    return {
        canBill: true,
        canReturn: Boolean(incoming.canReturn ?? false),
        canManageStock: Boolean(incoming.canManageStock ?? false),
        canViewReports: Boolean(incoming.canViewReports ?? false),
        canViewCustomerReports: Boolean(incoming.canViewCustomerReports ?? false),
        canManageSuppliersCategories: Boolean(incoming.canManageSuppliersCategories ?? false),
        canManageAdmins: Boolean(incoming.canManageAdmins ?? false),
        canEditBills: Boolean(incoming.canEditBills ?? false),
        canDiscount: Boolean(incoming.canDiscount ?? true),
        maxDiscountPercent: Math.min(100, Math.max(0, Number(incoming.maxDiscountPercent ?? 5))),
    };
};
router.get('/admins', (0, billingRoleMiddleware_1.requirePermission)('canManageAdmins'), async (_req, res) => {
    const admins = await BillingAdmin_1.default.find({}).select('-password').sort({ createdAt: -1 });
    res.json(admins);
});
router.post('/admins', (0, billingRoleMiddleware_1.requirePermission)('canManageAdmins'), async (req, res) => {
    const payload = req.body || {};
    if (req.billingAdmin?.role !== 'superadmin' && payload.role === 'superadmin') {
        return res.status(403).json({ message: 'Only superadmin can create superadmin' });
    }
    if (req.billingAdmin?.role === 'admin' && payload.role === 'admin') {
        return res.status(403).json({ message: 'Admin can only create cashier staff' });
    }
    const normalizedPermissions = normalizePermissions(payload.role || 'cashier', payload.permissions || {});
    if (req.billingAdmin?.role === 'admin') {
        const ownPermissions = req.billingAdmin?.permissions || {};
        for (const key of Object.keys(normalizedPermissions)) {
            if (key === 'maxDiscountPercent') {
                if (Number(normalizedPermissions.maxDiscountPercent) > Number(ownPermissions.maxDiscountPercent || 0)) {
                    return res.status(403).json({ message: 'Cannot assign higher discount permission than your own' });
                }
                continue;
            }
            if (normalizedPermissions[key] && !ownPermissions[key]) {
                return res.status(403).json({ message: `Cannot assign permission you do not have: ${key}` });
            }
        }
    }
    const admin = await BillingAdmin_1.default.create({
        ...payload,
        permissions: normalizedPermissions,
        createdBy: req.billingAdminId,
    });
    return res.status(201).json({ ...admin.toObject(), password: undefined });
});
router.put('/admins/:id', (0, billingRoleMiddleware_1.requirePermission)('canManageAdmins'), async (req, res) => {
    const update = { ...(req.body || {}) };
    if (req.billingAdmin?.role !== 'superadmin' && update.role === 'superadmin') {
        return res.status(403).json({ message: 'Only superadmin can assign superadmin role' });
    }
    const existing = await BillingAdmin_1.default.findById(req.params.id);
    if (!existing)
        return res.status(404).json({ message: 'Admin not found' });
    if (update.permissions) {
        const role = update.role || existing.role;
        update.permissions = normalizePermissions(role, update.permissions);
        if (req.billingAdmin?.role === 'admin') {
            const ownPermissions = req.billingAdmin?.permissions || {};
            for (const key of Object.keys(update.permissions)) {
                if (key === 'maxDiscountPercent') {
                    if (Number(update.permissions.maxDiscountPercent) > Number(ownPermissions.maxDiscountPercent || 0)) {
                        return res.status(403).json({ message: 'Cannot assign higher discount permission than your own' });
                    }
                    continue;
                }
                if (update.permissions[key] && !ownPermissions[key]) {
                    return res.status(403).json({
                        message: `Cannot assign permission you do not have: ${String(key)}`,
                    });
                }
            }
        }
    }
    delete update.password;
    const admin = await BillingAdmin_1.default.findByIdAndUpdate(req.params.id, update, { new: true }).select('-password');
    if (!admin)
        return res.status(404).json({ message: 'Admin not found' });
    return res.json(admin);
});
router.delete('/admins/:id', billingRoleMiddleware_1.requireSuperAdmin, async (req, res) => {
    const admin = await BillingAdmin_1.default.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true }).select('-password');
    if (!admin)
        return res.status(404).json({ message: 'Admin not found' });
    return res.json({ message: 'Admin deactivated' });
});
router.get('/salesmen', (0, billingRoleMiddleware_1.requirePermission)('canManageAdmins'), async (_req, res) => {
    const salesmen = await Salesman_1.default.find({ isActive: true }).sort({ createdAt: -1 });
    res.json(salesmen);
});
router.post('/salesmen', (0, billingRoleMiddleware_1.requirePermission)('canManageAdmins'), async (req, res) => {
    const salesman = await Salesman_1.default.create(req.body || {});
    res.status(201).json(salesman);
});
router.put('/salesmen/:id', (0, billingRoleMiddleware_1.requirePermission)('canManageAdmins'), async (req, res) => {
    const salesman = await Salesman_1.default.findByIdAndUpdate(req.params.id, req.body || {}, { new: true });
    if (!salesman)
        return res.status(404).json({ message: 'Salesman not found' });
    res.json(salesman);
});
router.delete('/salesmen/:id', (0, billingRoleMiddleware_1.requirePermission)('canManageAdmins'), async (req, res) => {
    const salesman = await Salesman_1.default.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!salesman)
        return res.status(404).json({ message: 'Salesman not found' });
    res.json({ message: 'Salesman deactivated' });
});
exports.default = router;
//# sourceMappingURL=billing-admin.js.map