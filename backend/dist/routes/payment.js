"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const crypto_1 = __importDefault(require("crypto"));
const razorpay_1 = __importDefault(require("../lib/razorpay"));
const Order_1 = __importDefault(require("../models/Order"));
const router = (0, express_1.Router)();
// POST /api/payment/create-order - create Razorpay order
router.post('/create-order', async (req, res) => {
    try {
        const { amount } = req.body;
        if (!amount || amount <= 0) {
            return res.status(400).json({ message: 'Invalid amount' });
        }
        const options = {
            amount: Math.round(amount * 100), // Razorpay expects amount in paise
            currency: 'INR',
            receipt: `order_${Date.now()}`,
        };
        const order = await razorpay_1.default.orders.create(options);
        res.json({
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Payment order creation failed', error: error.message });
    }
});
// POST /api/payment/verify - verify Razorpay payment and create order
router.post('/verify', async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderData, } = req.body;
        // Verify signature
        const body = razorpay_order_id + '|' + razorpay_payment_id;
        const expectedSignature = crypto_1.default
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body)
            .digest('hex');
        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({ message: 'Payment verification failed' });
        }
        // Create order in DB
        const order = new Order_1.default({
            ...orderData,
            razorpayOrderId: razorpay_order_id,
            razorpayPaymentId: razorpay_payment_id,
            paymentStatus: 'paid',
            orderStatus: 'confirmed',
        });
        await order.save();
        res.json({ message: 'Payment verified successfully', order });
    }
    catch (error) {
        res.status(500).json({ message: 'Payment verification failed', error: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=payment.js.map