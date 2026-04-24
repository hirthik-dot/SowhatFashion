"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const BillingAdmin_1 = __importDefault(require("../models/BillingAdmin"));
const billingAuthMiddleware_1 = require("../middleware/billingAuthMiddleware");
const router = express_1.default.Router();
const isProduction = process.env.NODE_ENV === 'production';
const loginLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 10,
    skipSuccessfulRequests: true,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many login attempts, please try again later.' },
});
const signBillingToken = (id, role, permissions) => {
    return jsonwebtoken_1.default.sign({ id, role, permissions }, process.env.BILLING_JWT_SECRET, { expiresIn: '7d' });
};
router.post('/login', loginLimiter, async (req, res) => {
    try {
        const { email, password } = req.body || {};
        const admin = await BillingAdmin_1.default.findOne({ email: String(email).toLowerCase().trim(), isActive: true });
        if (!admin) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        const isMatch = await admin.comparePassword(String(password || ''));
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        admin.lastLogin = new Date();
        await admin.save();
        const token = signBillingToken(admin._id.toString(), admin.role, admin.permissions);
        res.cookie('billing_token', token, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? 'none' : 'lax',
            path: '/',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });
        return res.json({
            admin: {
                id: admin._id,
                name: admin.name,
                email: admin.email,
                role: admin.role,
                permissions: admin.permissions,
            },
        });
    }
    catch (error) {
        return res.status(500).json({ message: error.message || 'Login failed' });
    }
});
router.post('/logout', async (_req, res) => {
    res.clearCookie('billing_token', {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        path: '/',
    });
    return res.json({ message: 'Logged out' });
});
router.get('/me', billingAuthMiddleware_1.billingAuthMiddleware, async (req, res) => {
    return res.json({ admin: req.billingAdmin });
});
exports.default = router;
//# sourceMappingURL=billing-auth.js.map