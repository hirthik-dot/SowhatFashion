"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Category_1 = __importDefault(require("../models/Category"));
const authMiddleware_1 = __importDefault(require("../middleware/authMiddleware"));
const router = (0, express_1.Router)();
// GET /api/categories — public (all active categories with hierarchy)
router.get('/', async (_req, res) => {
    try {
        const categories = await Category_1.default.find({ isActive: true }).sort({ order: 1, name: 1 });
        // Build hierarchy: top-level + children
        const topLevel = categories.filter(c => !c.parentSlug);
        const result = topLevel.map(parent => ({
            _id: parent._id,
            name: parent.name,
            slug: parent.slug,
            megaDropdownLabel: parent.megaDropdownLabel,
            order: parent.order,
            subCategories: categories
                .filter(c => c.parentSlug === parent.slug)
                .map(sub => ({
                _id: sub._id,
                name: sub.name,
                slug: sub.slug,
                megaDropdownLabel: sub.megaDropdownLabel,
                order: sub.order,
            })),
        }));
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
// GET /api/categories/all — admin (flat list, includes inactive)
router.get('/all', authMiddleware_1.default, async (_req, res) => {
    try {
        const categories = await Category_1.default.find().sort({ order: 1, name: 1 });
        res.json(categories);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
// POST /api/categories — admin create
router.post('/', authMiddleware_1.default, async (req, res) => {
    try {
        const category = new Category_1.default(req.body);
        await category.save();
        res.status(201).json(category);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
// PUT /api/categories/:id — admin update
router.put('/:id', authMiddleware_1.default, async (req, res) => {
    try {
        const category = await Category_1.default.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        });
        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }
        res.json(category);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
// DELETE /api/categories/:id — admin delete
router.delete('/:id', authMiddleware_1.default, async (req, res) => {
    try {
        const category = await Category_1.default.findByIdAndDelete(req.params.id);
        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }
        // Also delete children if this was a parent
        if (!category.parentSlug) {
            await Category_1.default.deleteMany({ parentSlug: category.slug });
        }
        res.json({ message: 'Category deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=categories.js.map