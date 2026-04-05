"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Product_1 = __importDefault(require("../models/Product"));
const authMiddleware_1 = __importDefault(require("../middleware/authMiddleware"));
const router = (0, express_1.Router)();
// GET /api/products - all active products with filters
router.get('/', async (req, res) => {
    try {
        const { category, featured, newArrival, sort, limit, page } = req.query;
        const filter = { isActive: true };
        if (category)
            filter.category = category;
        if (featured === 'true')
            filter.isFeatured = true;
        if (newArrival === 'true')
            filter.isNewArrival = true;
        let sortObj = { createdAt: -1 };
        if (sort === 'price_asc')
            sortObj = { price: 1 };
        if (sort === 'price_desc')
            sortObj = { price: -1 };
        if (sort === 'newest')
            sortObj = { createdAt: -1 };
        const pageNum = parseInt(page) || 1;
        const limitNum = parseInt(limit) || 50;
        const skip = (pageNum - 1) * limitNum;
        const [products, total] = await Promise.all([
            Product_1.default.find(filter).sort(sortObj).skip(skip).limit(limitNum),
            Product_1.default.countDocuments(filter),
        ]);
        res.json({
            products,
            total,
            page: pageNum,
            totalPages: Math.ceil(total / limitNum),
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
// GET /api/products/:slug - single product by slug
router.get('/:slug', async (req, res) => {
    try {
        const product = await Product_1.default.findOne({ slug: req.params.slug, isActive: true });
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.json(product);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
// POST /api/products - create product (protected)
router.post('/', authMiddleware_1.default, async (req, res) => {
    try {
        const product = new Product_1.default(req.body);
        await product.save();
        res.status(201).json(product);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
// PUT /api/products/:id - update product (protected)
router.put('/:id', authMiddleware_1.default, async (req, res) => {
    try {
        const product = await Product_1.default.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        });
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.json(product);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
// DELETE /api/products/:id - delete product (protected)
router.delete('/:id', authMiddleware_1.default, async (req, res) => {
    try {
        const product = await Product_1.default.findByIdAndDelete(req.params.id);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.json({ message: 'Product deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=products.js.map