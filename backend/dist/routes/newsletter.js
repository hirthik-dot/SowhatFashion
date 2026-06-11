"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const NewsletterSubscriber_1 = __importDefault(require("../models/NewsletterSubscriber"));
const router = (0, express_1.Router)();
router.post('/subscribe', async (req, res) => {
    try {
        const email = String(req.body?.email || '').trim().toLowerCase();
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ success: false, error: 'Please enter a valid email address.' });
        }
        const existing = await NewsletterSubscriber_1.default.findOne({ email });
        if (existing) {
            return res.json({ success: true, message: 'You are already subscribed.' });
        }
        await NewsletterSubscriber_1.default.create({
            email,
            source: String(req.body?.source || 'inner-circle'),
        });
        res.json({ success: true, message: 'Thank you for subscribing.' });
    }
    catch (error) {
        if (error?.code === 11000) {
            return res.json({ success: true, message: 'You are already subscribed.' });
        }
        res.status(500).json({ success: false, error: 'Subscription failed. Please try again.' });
    }
});
exports.default = router;
//# sourceMappingURL=newsletter.js.map