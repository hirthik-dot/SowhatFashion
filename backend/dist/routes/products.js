"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const Product_1 = __importDefault(require("../models/Product"));
const SidebarConfig_1 = __importDefault(require("../models/SidebarConfig"));
const authMiddleware_1 = __importDefault(require("../middleware/authMiddleware"));
const productFilterTags_1 = require("../lib/productFilterTags");
const productFilterQuery_1 = require("../lib/productFilterQuery");
const ecommerce_product_variants_1 = require("../lib/ecommerce-product-variants");
const router = (0, express_1.Router)();
function isAdminRequest(req) {
    try {
        const token = req.cookies?.token;
        if (!token)
            return false;
        jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        return true;
    }
    catch {
        return false;
    }
}
const FILTER_TAG_BODY_FIELDS = [
    'category',
    'subCategory',
    'sizes',
    'tags',
    'price',
    'discountPrice',
    'isNewArrival',
    'isFeatured',
    'filterTags',
];
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
        const filter = { isEcommerceProduct: { $ne: false } };
        if (!isAdminRequest(req)) {
            filter.isActive = true;
        }
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
        let products = await Product_1.default.find(filter).sort(sortObj).lean();
        let expandedProducts = await (0, ecommerce_product_variants_1.expandProductsForEcommerce)(products);
        // Post-query discount filter (computed field)
        if (discount) {
            const discountMin = parseInt(discount);
            expandedProducts = expandedProducts.filter((p) => {
                if (!p.discountPrice || p.discountPrice >= p.price)
                    return false;
                const pct = Math.round(((p.price - p.discountPrice) / p.price) * 100);
                return pct >= discountMin;
            });
        }
        const total = expandedProducts.length;
        const pagedProducts = expandedProducts.slice(skip, skip + limitNum);
        res.json({
            products: pagedProducts,
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
        const slug = String(req.params.slug || '').trim();
        const variantSlug = (0, ecommerce_product_variants_1.parsePriceVariantSlug)(slug);
        if (variantSlug) {
            const product = await Product_1.default.findOne({
                slug: variantSlug.baseSlug,
                isActive: true,
                isEcommerceProduct: { $ne: false },
            }).lean();
            if (!product) {
                return res.status(404).json({ message: 'Product not found' });
            }
            const variantsByProduct = await (0, ecommerce_product_variants_1.getEcommerceVariantsByProducts)([product._id]);
            const variant = (variantsByProduct.get(String(product._id)) || []).find((entry) => Math.round(entry.sellingPrice) === Math.round(variantSlug.sellingPrice));
            if (!variant) {
                return res.status(404).json({ message: 'Product not found' });
            }
            return res.json((0, ecommerce_product_variants_1.applyEcommerceVariant)(product, variant, true));
        }
        const product = await Product_1.default.findOne({ slug, isActive: true, isEcommerceProduct: { $ne: false } }).lean();
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        if (product.isBillingProduct) {
            const variantsByProduct = await (0, ecommerce_product_variants_1.getEcommerceVariantsByProducts)([product._id]);
            const variants = (variantsByProduct.get(String(product._id)) || []).filter((entry) => entry.stock > 0);
            if (variants.length === 1) {
                return res.json((0, ecommerce_product_variants_1.applyEcommerceVariant)(product, variants[0], false));
            }
            if (variants.length > 1) {
                return res.status(404).json({ message: 'Product not found' });
            }
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
        const shouldApplyFilterTags = FILTER_TAG_BODY_FIELDS.some((field) => field in req.body);
        if (shouldApplyFilterTags) {
            await applyFilterTagsToBody(req.body);
        }
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
        const product = await Product_1.default.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        if (product.isBillingProduct) {
            product.isEcommerceProduct = false;
            await product.save();
        }
        else {
            await Product_1.default.findByIdAndDelete(req.params.id);
        }
        res.json({ message: 'Product deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=products.js.map