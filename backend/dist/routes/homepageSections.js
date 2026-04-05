"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_CATALOGUE_SECTIONS = void 0;
const express_1 = require("express");
const Settings_1 = __importDefault(require("../models/Settings"));
const authMiddleware_1 = __importDefault(require("../middleware/authMiddleware"));
const revalidateFrontend_1 = require("../lib/revalidateFrontend");
const Offer_1 = __importDefault(require("../models/Offer"));
const NewArrival_1 = __importDefault(require("../models/NewArrival"));
const Product_1 = __importDefault(require("../models/Product"));
const router = (0, express_1.Router)();
const THEME_KEYS = ['catalogue', 'allensolly', 'magazine'];
exports.DEFAULT_CATALOGUE_SECTIONS = [
    {
        id: 'offer-carousel',
        label: 'Offer Carousel',
        isVisible: true,
        order: 0,
        canDelete: false,
    },
    {
        id: 'new-arrivals',
        label: 'New Arrivals',
        isVisible: true,
        order: 1,
        canDelete: true,
    },
    {
        id: 'products-grid',
        label: 'Products Grid',
        isVisible: true,
        order: 2,
        canDelete: false,
    },
    {
        id: 'combo-offers',
        label: 'Combo Offers',
        isVisible: true,
        order: 3,
        canDelete: true,
    },
];
function normalizeTheme(t) {
    if (THEME_KEYS.includes(t))
        return t;
    return null;
}
function mergeSections(stored, defaults) {
    if (!stored?.length)
        return defaults.map((d) => ({ ...d }));
    const byId = new Map(stored.map((s) => [s.id, { ...s }]));
    const result = [];
    for (const def of defaults) {
        const row = byId.get(def.id);
        if (row) {
            result.push({
                ...def,
                ...row,
                canDelete: def.canDelete,
                label: row.label || def.label,
            });
            byId.delete(def.id);
        }
        else {
            result.push({ ...def });
        }
    }
    for (const [, extra] of byId) {
        result.push(extra);
    }
    return result.sort((a, b) => a.order - b.order);
}
// Admin routes first (before /:theme would match "admin")
router.get('/admin/:theme/stats', authMiddleware_1.default, async (req, res) => {
    try {
        const theme = normalizeTheme(req.params.theme);
        if (theme !== 'catalogue') {
            return res.json({ carouselCount: 0, newArrivalsCount: 0, productsCount: 0, comboCount: 0 });
        }
        const now = new Date();
        const carouselCount = await Offer_1.default.countDocuments({
            isActive: true,
            showOnCarousel: true,
            $or: [{ endTime: null }, { endTime: { $gte: now } }],
        });
        const newArrivalsCount = await NewArrival_1.default.countDocuments({ isActive: true });
        const productsCount = await Product_1.default.countDocuments({ isActive: true });
        const comboCount = await Offer_1.default.countDocuments({
            isActive: true,
            type: 'combo',
            $or: [{ endTime: null }, { endTime: { $gte: now } }],
        });
        res.json({ carouselCount, newArrivalsCount, productsCount, comboCount });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
router.put('/admin/:theme', authMiddleware_1.default, async (req, res) => {
    try {
        const theme = normalizeTheme(req.params.theme);
        if (!theme) {
            return res.status(400).json({ message: 'Invalid theme' });
        }
        const { sections } = req.body;
        if (!Array.isArray(sections)) {
            return res.status(400).json({ message: 'sections array required' });
        }
        let settings = await Settings_1.default.findOne();
        if (!settings) {
            settings = await Settings_1.default.create({});
        }
        if (!settings.homepageSections) {
            settings.homepageSections = {};
        }
        settings.homepageSections[theme] = sections.map((s, i) => ({
            id: s.id,
            label: s.label,
            isVisible: s.isVisible,
            order: typeof s.order === 'number' ? s.order : i,
            canDelete: s.canDelete,
        }));
        await settings.save();
        await (0, revalidateFrontend_1.triggerRevalidate)(['/']);
        res.json({ theme, sections: settings.homepageSections[theme] });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
// GET /api/homepage-sections/:theme
router.get('/:theme', async (req, res) => {
    try {
        const theme = normalizeTheme(req.params.theme);
        if (!theme) {
            return res.status(400).json({ message: 'Invalid theme' });
        }
        let doc = await Settings_1.default.findOne();
        if (!doc) {
            doc = await Settings_1.default.create({});
        }
        const settings = doc.toObject();
        let sections = [];
        if (theme === 'catalogue') {
            const raw = settings.homepageSections?.catalogue;
            sections = mergeSections(raw, exports.DEFAULT_CATALOGUE_SECTIONS);
        }
        else {
            sections = settings.homepageSections?.[theme] || [];
        }
        res.json({ theme, sections });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=homepageSections.js.map