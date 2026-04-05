"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const MegaDropdown_1 = __importDefault(require("../models/MegaDropdown"));
const SidebarConfig_1 = __importDefault(require("../models/SidebarConfig"));
const authMiddleware_1 = __importDefault(require("../middleware/authMiddleware"));
const router = (0, express_1.Router)();
// ============ MEGA DROPDOWN ============
// GET /api/catalogue/mega-dropdown/:category — public (cached by frontend ISR)
router.get('/mega-dropdown/:category', async (req, res) => {
    try {
        const { category } = req.params;
        let dropdown = await MegaDropdown_1.default.findOne({ category });
        if (!dropdown) {
            return res.json({ category, columns: [] });
        }
        res.json(dropdown);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
// GET /api/catalogue/admin/mega-dropdown/:category — admin
router.get('/admin/mega-dropdown/:category', authMiddleware_1.default, async (req, res) => {
    try {
        const { category } = req.params;
        let dropdown = await MegaDropdown_1.default.findOne({ category });
        if (!dropdown) {
            return res.json({ category, columns: [] });
        }
        res.json(dropdown);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
// PUT /api/catalogue/admin/mega-dropdown/:category — admin
router.put('/admin/mega-dropdown/:category', authMiddleware_1.default, async (req, res) => {
    try {
        const { category } = req.params;
        const { columns } = req.body;
        const dropdown = await MegaDropdown_1.default.findOneAndUpdate({ category }, { category, columns }, { new: true, upsert: true, runValidators: true });
        res.json(dropdown);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
// ============ SIDEBAR CONFIG ============
// GET /api/catalogue/sidebar-config — public
router.get('/sidebar-config', async (_req, res) => {
    try {
        let config = await SidebarConfig_1.default.findOne();
        if (!config) {
            // Return default config
            return res.json({
                filters: [
                    {
                        id: 'price',
                        label: 'Price',
                        type: 'range_slider',
                        filterKey: 'price',
                        isVisible: true,
                        order: 0,
                        rangeConfig: { min: 199, max: 2999, step: 50, prefix: '₹' },
                    },
                    {
                        id: 'promotions',
                        label: 'Promotions',
                        type: 'checkbox_list',
                        filterKey: 'promotions',
                        isVisible: true,
                        order: 1,
                        options: [
                            { label: 'Flash Sale', value: 'flash-sale', count: 0 },
                            { label: 'New Arrivals', value: 'new-arrivals', count: 0 },
                            { label: 'Combo Offers', value: 'combo-offers', count: 0 },
                            { label: '50% OFF', value: '50-off', count: 0 },
                        ],
                    },
                    {
                        id: 'size',
                        label: 'Size',
                        type: 'checkbox_list',
                        filterKey: 'size',
                        isVisible: true,
                        order: 2,
                        options: [
                            { label: 'S', value: 'S', count: 0 },
                            { label: 'M', value: 'M', count: 0 },
                            { label: 'L', value: 'L', count: 0 },
                            { label: 'XL', value: 'XL', count: 0 },
                            { label: 'XXL', value: 'XXL', count: 0 },
                        ],
                    },
                    {
                        id: 'category',
                        label: 'Category',
                        type: 'checkbox_list',
                        filterKey: 'category',
                        isVisible: true,
                        order: 3,
                        options: [
                            { label: 'T-Shirts', value: 'tshirt', count: 0 },
                            { label: 'Shirts', value: 'shirt', count: 0 },
                            { label: 'Pants', value: 'pant', count: 0 },
                        ],
                    },
                    {
                        id: 'discount',
                        label: 'Discount',
                        type: 'checkbox_list',
                        filterKey: 'discount',
                        isVisible: true,
                        order: 4,
                        options: [
                            { label: '10% and above', value: '10', count: 0 },
                            { label: '20% and above', value: '20', count: 0 },
                            { label: '30% and above', value: '30', count: 0 },
                            { label: '50% and above', value: '50', count: 0 },
                        ],
                    },
                ],
            });
        }
        res.json(config);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
// GET /api/catalogue/admin/sidebar-config — admin
router.get('/admin/sidebar-config', authMiddleware_1.default, async (_req, res) => {
    try {
        let config = await SidebarConfig_1.default.findOne();
        if (!config) {
            return res.json({ filters: [] });
        }
        res.json(config);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
// PUT /api/catalogue/admin/sidebar-config — admin
router.put('/admin/sidebar-config', authMiddleware_1.default, async (req, res) => {
    try {
        const { filters } = req.body;
        let config = await SidebarConfig_1.default.findOne();
        if (config) {
            config.filters = filters;
            await config.save();
        }
        else {
            config = new SidebarConfig_1.default({ filters });
            await config.save();
        }
        res.json(config);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
// ============ PRODUCT COUNTS (for filter badges) ============
// GET /api/catalogue/product-counts?category=tshirt
router.get('/product-counts', async (req, res) => {
    try {
        const Product = (await Promise.resolve().then(() => __importStar(require('../models/Product')))).default;
        const baseFilter = { isActive: true };
        if (req.query.category) {
            let catVal = req.query.category.trim().replace(/s$/i, '');
            baseFilter.category = { $regex: new RegExp(`^${catVal}$`, 'i') };
        }
        const [totalCount, sizeAgg, categoryAgg, newArrivalsCount, featuredCount,] = await Promise.all([
            Product.countDocuments(baseFilter),
            Product.aggregate([
                { $match: baseFilter },
                { $unwind: '$sizes' },
                { $group: { _id: '$sizes', count: { $sum: 1 } } },
            ]),
            Product.aggregate([
                { $match: { isActive: true } },
                { $group: { _id: '$category', count: { $sum: 1 } } },
            ]),
            Product.countDocuments({ ...baseFilter, isNewArrival: true }),
            Product.countDocuments({ ...baseFilter, isFeatured: true }),
        ]);
        const sizes = {};
        sizeAgg.forEach((s) => { sizes[s._id] = s.count; });
        const categories = {};
        categoryAgg.forEach((c) => { categories[c._id] = c.count; });
        // Discount counts: we compute how many products have >= X% discount
        const allProducts = await Product.find(baseFilter).select('price discountPrice isNewArrival').lean();
        const discountBuckets = { '10': 0, '20': 0, '30': 0, '50': 0 };
        allProducts.forEach((p) => {
            if (p.discountPrice && p.discountPrice < p.price) {
                const pct = Math.round(((p.price - p.discountPrice) / p.price) * 100);
                if (pct >= 10)
                    discountBuckets['10']++;
                if (pct >= 20)
                    discountBuckets['20']++;
                if (pct >= 30)
                    discountBuckets['30']++;
                if (pct >= 50)
                    discountBuckets['50']++;
            }
        });
        res.json({
            total: totalCount,
            size: sizes,
            category: categories,
            promotions: {
                'new-arrivals': newArrivalsCount,
                'flash-sale': featuredCount, // map featured to flash sale for demo
                'combo-offers': 0,
                '50-off': discountBuckets['50'],
            },
            discount: discountBuckets,
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=catalogue.js.map