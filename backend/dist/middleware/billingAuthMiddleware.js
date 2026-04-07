"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireBillingPermission = exports.billingAuthMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const BillingAdmin_1 = __importDefault(require("../models/BillingAdmin"));
const billingAuthMiddleware = async (req, res, next) => {
    try {
        const token = req.cookies?.billing_token;
        if (!token) {
            return res.status(401).json({ message: 'Billing authentication required' });
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.BILLING_JWT_SECRET);
        const admin = await BillingAdmin_1.default.findById(decoded.id).select('-password');
        if (!admin || !admin.isActive) {
            return res.status(401).json({ message: 'Invalid billing session' });
        }
        req.billingAdminId = admin._id.toString();
        req.billingAdmin = admin;
        req.admin = {
            id: admin._id.toString(),
            role: admin.role,
            permissions: admin.permissions,
            name: admin.name,
            email: admin.email,
        };
        return next();
    }
    catch (error) {
        return res.status(401).json({ message: 'Invalid or expired billing token' });
    }
};
exports.billingAuthMiddleware = billingAuthMiddleware;
const requireBillingPermission = (permission) => {
    return (req, res, next) => {
        if (req.billingAdmin?.role === 'superadmin')
            return next();
        const permissions = req.billingAdmin?.permissions || {};
        if (!permissions[permission]) {
            return res.status(403).json({ message: 'Permission denied' });
        }
        return next();
    };
};
exports.requireBillingPermission = requireBillingPermission;
//# sourceMappingURL=billingAuthMiddleware.js.map