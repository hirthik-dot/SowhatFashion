"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const Order_1 = __importDefault(require("../models/Order"));
const authMiddleware_1 = __importDefault(require("../middleware/authMiddleware"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const router = (0, express_1.Router)();
const lookupLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000,
    max: 5,
    message: { message: 'Too many requests from this IP, please try again in a minute.' }
});
// GET /api/orders/my-orders (USER)
router.get('/my-orders', async (req, res) => {
    try {
        let userToken = req.cookies?.user_token || req.cookies?.['next-auth.session-token'] || req.cookies?.['__Secure-next-auth.session-token'];
        const authHeader = req.headers.authorization;
        if (!userToken && authHeader && authHeader.startsWith('Bearer ')) {
            userToken = authHeader.split(' ')[1];
        }
        if (!userToken) {
            return res.status(401).json({ success: false, message: 'Not authenticated' });
        }
        const secret = process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET || '';
        const decoded = jsonwebtoken_1.default.verify(userToken, secret);
        const email = decoded.email;
        if (!email) {
            return res.status(400).json({ success: false, message: 'Invalid token, cannot find email' });
        }
        const orders = await Order_1.default.find({ 'customer.email': email }).sort({ createdAt: -1 });
        res.json({ success: true, orders });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
});
// GET /api/orders - all orders with pagination (protected)
router.get('/', authMiddleware_1.default, async (req, res) => {
    try {
        const { page, limit, status } = req.query;
        const pageNum = parseInt(page) || 1;
        const limitNum = parseInt(limit) || 20;
        const skip = (pageNum - 1) * limitNum;
        const filter = {};
        if (status)
            filter.orderStatus = status;
        const [orders, total] = await Promise.all([
            Order_1.default.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
            Order_1.default.countDocuments(filter),
        ]);
        res.json({
            orders,
            total,
            page: pageNum,
            totalPages: Math.ceil(total / limitNum),
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
// POST /api/orders/customer - get orders by customer email and phone (public)
router.post('/customer', async (req, res) => {
    try {
        const { email, phone } = req.body;
        if (!email || !phone) {
            return res.status(400).json({ message: 'Email and phone are required' });
        }
        const orders = await Order_1.default.find({
            'customer.email': email,
            'customer.phone': phone
        }).sort({ createdAt: -1 });
        res.json(orders);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
// POST /api/orders/lookup - search orders by phone or email without login (public)
router.post('/lookup', lookupLimiter, async (req, res) => {
    try {
        const { contact } = req.body;
        if (!contact) {
            return res.status(400).json({ message: 'Contact is required' });
        }
        const orders = await Order_1.default.find({
            $or: [
                { 'customer.email': contact },
                { 'customer.phone': contact }
            ]
        }).sort({ createdAt: -1 });
        const safeOrders = orders.map((order) => ({
            _id: order._id,
            customer: {
                name: order.customer.name,
                email: order.customer.email,
                phone: order.customer.phone,
                address: order.customer.address,
            },
            items: order.items,
            totalAmount: order.totalAmount,
            razorpayOrderId: order.razorpayOrderId,
            razorpayPaymentId: order.razorpayPaymentId,
            paymentStatus: order.paymentStatus,
            orderStatus: order.orderStatus,
            createdAt: order.createdAt,
        }));
        res.json(safeOrders);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
// GET /api/orders/:id - single order (public for now, so track order works, but ideally should be protected by email/phone or token. We allow it public for Track Order simplicity)
router.get('/:id', async (req, res) => {
    try {
        const order = await Order_1.default.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }
        res.json(order);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
// POST /api/orders - create order (public, after payment)
router.post('/', async (req, res) => {
    try {
        const order = new Order_1.default(req.body);
        await order.save();
        res.status(201).json(order);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
// PUT /api/orders/:id/status - update order status (protected)
router.put('/:id/status', authMiddleware_1.default, async (req, res) => {
    try {
        const { orderStatus } = req.body;
        if (!['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'].includes(orderStatus)) {
            return res.status(400).json({ message: 'Invalid order status' });
        }
        const order = await Order_1.default.findByIdAndUpdate(req.params.id, { orderStatus }, { new: true });
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }
        res.json(order);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=orders.js.map