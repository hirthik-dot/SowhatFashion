"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Settings_1 = __importDefault(require("../models/Settings"));
const authMiddleware_1 = __importDefault(require("../middleware/authMiddleware"));
const router = (0, express_1.Router)();
// GET /api/settings - get settings (public)
router.get('/', async (req, res) => {
    try {
        let settings = await Settings_1.default.findOne();
        if (!settings) {
            settings = await Settings_1.default.create({});
        }
        res.json(settings);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
// PUT /api/settings - update settings (protected)
router.put('/', authMiddleware_1.default, async (req, res) => {
    try {
        let settings = await Settings_1.default.findOne();
        if (!settings) {
            settings = await Settings_1.default.create(req.body);
        }
        else {
            Object.assign(settings, req.body);
            await settings.save();
        }
        res.json(settings);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
// PUT /api/settings/homepage - update activeHomepage and trigger revalidation (protected)
router.put('/homepage', authMiddleware_1.default, async (req, res) => {
    try {
        const { activeHomepage } = req.body;
        if (!['allensolly', 'magazine', 'catalogue'].includes(activeHomepage)) {
            return res.status(400).json({ message: 'Invalid homepage type' });
        }
        let settings = await Settings_1.default.findOne();
        if (!settings) {
            settings = await Settings_1.default.create({ activeHomepage });
        }
        else {
            settings.activeHomepage = activeHomepage;
            await settings.save();
        }
        // Trigger Next.js on-demand revalidation
        try {
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            const revalidateSecret = process.env.REVALIDATE_SECRET;
            await fetch(`${frontendUrl}/api/revalidate?secret=${revalidateSecret}&path=/`);
        }
        catch (revalError) {
            console.error('Revalidation trigger failed:', revalError);
        }
        res.json({ message: `Homepage switched to ${activeHomepage}`, settings });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=settings.js.map