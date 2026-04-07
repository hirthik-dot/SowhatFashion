"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requirePermission = exports.requireAdmin = exports.requireSuperAdmin = void 0;
const requireSuperAdmin = (req, res, next) => {
    if (req.billingAdmin?.role !== 'superadmin') {
        return res.status(403).json({ message: 'Superadmin access required' });
    }
    return next();
};
exports.requireSuperAdmin = requireSuperAdmin;
const requireAdmin = (req, res, next) => {
    const role = req.billingAdmin?.role;
    if (!['superadmin', 'admin'].includes(role)) {
        return res.status(403).json({ message: 'Admin access required' });
    }
    return next();
};
exports.requireAdmin = requireAdmin;
const requirePermission = (permission) => {
    return (req, res, next) => {
        if (req.billingAdmin?.role === 'superadmin')
            return next();
        if (!req.billingAdmin?.permissions?.[permission]) {
            return res.status(403).json({ message: `Permission denied: ${String(permission)}` });
        }
        return next();
    };
};
exports.requirePermission = requirePermission;
//# sourceMappingURL=billingRoleMiddleware.js.map