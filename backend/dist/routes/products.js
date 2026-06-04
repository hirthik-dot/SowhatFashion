"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Product_1 = __importDefault(require("../models/Product"));
const SidebarConfig_1 = __importDefault(require("../models/SidebarConfig"));
const authMiddleware_1 = __importDefault(require("../middleware/authMiddleware"));
const productFilterTags_1 = require("../lib/productFilterTags");
const productFilterQuery_1 = require("../lib/productFilterQuery");
const router = (0, express_1.Router)();
function filterTagsToMap(tags) {
    const map = new Map();
    for (const [key, values] of Object.entries(tags)) {
        if (Array.isArray(values) && values.length > 0) {
            map.set(key, values.map((v) => String(v)));
        }
    }
    return map;
}
async function applyFilterTagsToBody(body) {
    const config = await SidebarConfig_1.default.findOne();
    const sidebarFilters = config?.filters || [];
    const merged = (0, productFilterTags_1.mergeFilterTags)({
        category: body.category,
        subCategory: body.subCategory,
        sizes: body.sizes,
        tags: body.tags,
        price: body.price,
        discountPrice: body.discountPrice,
        isNewArrival: body.isNewArrival,
        isFeatured: body.isFeatured,
    }, body.filterTags, sidebarFilters);
    body.filterTags = filterTagsToMap(merged);
}
// GET /api/products - all active products with filters
router.get('/', async (req, res) => {
    try {
        const { category, subCategory, featured, newArrival, sort, limit, page, size, minPrice, maxPrice, discount, promotions, search } = req.query;
        const filter = { isActive: true };
        if (category) {
            // Normalize: strip trailing 's' for plurals, case-insensitive match
            let catVal = category.trim();
            // 'tshirts' → 'tshirt', 'shirts' → 'shirt', 'pants' → 'pant'
            catVal = catVal.replace(/s$/i, '');
            filter.category = { $regex: new RegExp(`^${catVal}$`, 'i') };
        }
        if (subCategory) {
            filter.subCategory = { $regex: new RegExp(`^${subCategory.trim()}$`, 'i') };
        }
        if (featured === 'true')
            filter.isFeatured = true;
        if (newArrival === 'true')
            filter.isNewArrival = true;
        // Size filter: ?size=M,L,XL → products that have ANY of those sizes
        if (size) {
            const sizeArr = size.split(',').map(s => s.trim().toUpperCase());
            filter.sizes = { $in: sizeArr };
        }
        // Price range filter
        if (minPrice || maxPrice) {
            const priceField = 'price'; // filter on base price
            filter[priceField] = {};
            if (minPrice)
                filter[priceField].$gte = parseInt(minPrice);
            if (maxPrice)
                filter[priceField].$lte = parseInt(maxPrice);
        }
        // Promotion filters: ?promotions=flash-sale,new-arrivals
        if (promotions) {
            const promoArr = promotions.split(',');
            const promoConditions = [];
            promoArr.forEach(p => {
                if (p === 'new-arrivals')
                    promoConditions.push({ isNewArrival: true });
                if (p === 'flash-sale')
                    promoConditions.push({ isFeatured: true });
            });
            if (promoConditions.length > 0) {
                filter.$or = promoConditions;
            }
        }
        // Search filter
        if (search) {
            filter.name = { $regex: search, $options: 'i' };
        }
        // Custom facet filters from sidebar config (e.g. ?fit=slim,regular)
        const facetFilters = (0, productFilterQuery_1.collectFacetFiltersFromQuery)(req.query);
        const facetConditions = Object.entries(facetFilters)
            .map(([key, values]) => (0, productFilterQuery_1.buildFacetFilterCondition)(key, values))
            .filter(Boolean);
        if (facetConditions.length) {
            filter.$and = [...(filter.$and || []), ...facetConditions];
        }
        let sortObj = { createdAt: -1 };
        if (sort === 'price_asc' || sort === 'Price: Low-High')
            sortObj = { price: 1 };
        if (sort === 'price_desc' || sort === 'Price: High-Low')
            sortObj = { price: -1 };
        if (sort === 'newest' || sort === 'Newest')
            sortObj = { createdAt: -1 };
        if (sort === 'Discount')
            sortObj = { discountPrice: 1 };
        const pageNum = parseInt(page) || 1;
        const limitNum = parseInt(limit) || 50;
        const skip = (pageNum - 1) * limitNum;
        let [products, total] = await Promise.all([
            Product_1.default.find(filter).sort(sortObj).skip(skip).limit(limitNum),
            Product_1.default.countDocuments(filter),
        ]);
        // Post-query discount filter (computed field)
        if (discount) {
            const discountMin = parseInt(discount);
            products = products.filter(p => {
                if (!p.discountPrice || p.discountPrice >= p.price)
                    return false;
                const pct = Math.round(((p.price - p.discountPrice) / p.price) * 100);
                return pct >= discountMin;
            });
            total = products.length;
        }
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
        await applyFilterTagsToBody(req.body);
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
        await applyFilterTagsToBody(req.body);
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
// POST /api/products/backfill-filter-tags — populate filterTags on all products (protected)
router.post('/backfill-filter-tags', authMiddleware_1.default, async (_req, res) => {
    try {
        const config = await SidebarConfig_1.default.findOne();
        const sidebarFilters = config?.filters || [];
        const products = await Product_1.default.find({});
        let updated = 0;
        for (const product of products) {
            const merged = (0, productFilterTags_1.mergeFilterTags)({
                category: product.category,
                subCategory: product.subCategory,
                sizes: product.sizes,
                tags: product.tags,
                price: product.price,
                discountPrice: product.discountPrice,
                isNewArrival: product.isNewArrival,
                isFeatured: product.isFeatured,
            }, (0, productFilterTags_1.plainFilterTags)(product), sidebarFilters);
            product.set('filterTags', filterTagsToMap(merged));
            await product.save();
            updated++;
        }
        res.json({ message: 'Filter tags backfilled', updated });
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