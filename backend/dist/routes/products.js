"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const Product_1 = __importDefault(require("../models/Product"));
const ProductVariant_1 = __importDefault(require("../models/ProductVariant"));
const SidebarConfig_1 = __importDefault(require("../models/SidebarConfig"));
const authMiddleware_1 = __importDefault(require("../middleware/authMiddleware"));
const productFilterTags_1 = require("../lib/productFilterTags");
const productFilterQuery_1 = require("../lib/productFilterQuery");
const storeCategories_1 = require("../lib/storeCategories");
const ecommerce_product_variants_1 = require("../lib/ecommerce-product-variants");
const product_color_variants_1 = require("../lib/product-color-variants");
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
async function applyFilterTagsToBody(body, variantColors) {
    if (typeof body.category === 'string' && body.category.trim()) {
        const normalized = (0, storeCategories_1.normalizeCategorySlug)(body.category);
        if (normalized)
            body.category = normalized;
    }
    const config = await SidebarConfig_1.default.findOne();
    const sidebarFilters = config?.filters || [];
    const colorsFromVariants = (variantColors || [])
        .map((c) => ({ name: c.name, hex: '#000000' }))
        .filter((c) => c.name);
    const merged = (0, productFilterTags_1.mergeFilterTags)({
        category: body.category,
        subCategory: body.subCategory,
        sizes: body.sizes,
        tags: body.tags,
        price: body.price,
        discountPrice: body.discountPrice,
        isNewArrival: body.isNewArrival,
        isFeatured: body.isFeatured,
        colors: colorsFromVariants.length
            ? colorsFromVariants
            : body.colors,
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
            Object.assign(filter, (0, storeCategories_1.buildCategoryFilterCondition)(category));
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
        const expandVariants = req.query.expand !== 'false';
        let expandedProducts = expandVariants
            ? await (0, ecommerce_product_variants_1.expandProductsForEcommerce)(products)
            : products;
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
// GET /api/products/slugs - all variant + product slugs for SSG
router.get('/meta/slugs', async (_req, res) => {
    try {
        const variants = await ProductVariant_1.default.find({ isActive: true }).select('slug').lean();
        const slugs = variants.map((v) => v.slug).filter(Boolean);
        res.json({ slugs });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
// GET /api/products/:slug - single product by slug (variant or legacy parent slug)
router.get('/:slug', async (req, res) => {
    try {
        const slug = String(req.params.slug || '').trim();
        // 1. Color variant slug
        const colorVariantHit = await (0, product_color_variants_1.getVariantBySlug)(slug);
        if (colorVariantHit) {
            const parent = await Product_1.default.findOne({
                _id: colorVariantHit.variant.parentProductId,
                isEcommerceProduct: { $ne: false },
                ...(isAdminRequest(req) ? {} : { isActive: true }),
            }).lean();
            if (!parent) {
                return res.status(404).json({ message: 'Product not found' });
            }
            const merged = (0, product_color_variants_1.mergeVariantWithParent)(parent, colorVariantHit.variant, colorVariantHit.siblings);
            if (parent.isBillingProduct) {
                const variantsByProduct = await (0, ecommerce_product_variants_1.getEcommerceVariantsByProducts)([parent._id]);
                const priceVariants = (variantsByProduct.get(String(parent._id)) || []).filter((e) => e.stock > 0);
                if (priceVariants.length === 1) {
                    return res.json((0, ecommerce_product_variants_1.applyEcommerceVariant)(merged, priceVariants[0], false));
                }
            }
            return res.json(merged);
        }
        // 2. Price variant slug (billing products)
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
        const product = await Product_1.default.findOne({
            slug,
            ...(isAdminRequest(req) ? {} : { isActive: true }),
            isEcommerceProduct: { $ne: false },
        }).lean();
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        // 3. Legacy parent slug → redirect to default color variant
        const variantsMap = await (0, product_color_variants_1.getVariantsByProductIds)([product._id]);
        const colorVariants = variantsMap.get(String(product._id)) || [];
        if (colorVariants.length > 0) {
            const defaultVariant = colorVariants.find((v) => String(v._id) === String(product.defaultVariantId)) ||
                (0, product_color_variants_1.pickDefaultVariant)(colorVariants);
            if (defaultVariant && defaultVariant.slug !== slug) {
                return res.json({ redirectTo: defaultVariant.slug, _id: product._id });
            }
            if (defaultVariant) {
                const merged = (0, product_color_variants_1.mergeVariantWithParent)(product, defaultVariant, colorVariants);
                if (product.isBillingProduct) {
                    const variantsByProduct = await (0, ecommerce_product_variants_1.getEcommerceVariantsByProducts)([product._id]);
                    const priceVariants = (variantsByProduct.get(String(product._id)) || []).filter((e) => e.stock > 0);
                    if (priceVariants.length === 1) {
                        return res.json((0, ecommerce_product_variants_1.applyEcommerceVariant)(merged, priceVariants[0], false));
                    }
                    if (priceVariants.length > 1) {
                        return res.json((0, ecommerce_product_variants_1.applyEcommerceVariant)(merged, priceVariants[0], false));
                    }
                }
                return res.json(merged);
            }
        }
        if (product.isBillingProduct) {
            const variantsByProduct = await (0, ecommerce_product_variants_1.getEcommerceVariantsByProducts)([product._id]);
            const variants = (variantsByProduct.get(String(product._id)) || []).filter((entry) => entry.stock > 0);
            if (variants.length === 1) {
                return res.json((0, ecommerce_product_variants_1.applyEcommerceVariant)(product, variants[0], false));
            }
            if (variants.length > 1) {
                // Base slug (hero links, bookmarks): default to lowest in-stock price variant
                return res.json((0, ecommerce_product_variants_1.applyEcommerceVariant)(product, variants[0], false));
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
        const { variants, ...body } = req.body;
        await applyFilterTagsToBody(body, variants?.map((v) => ({ name: v.colorName })));
        const product = new Product_1.default(body);
        await product.save();
        if (Array.isArray(variants) && variants.length) {
            await (0, product_color_variants_1.syncProductVariants)(product._id, product.slug, variants);
            const savedVariants = await ProductVariant_1.default.find({ parentProductId: product._id })
                .sort({ sortOrder: 1 })
                .lean();
            if (savedVariants[0]) {
                product.defaultVariantId = savedVariants[0]._id;
                await product.save();
            }
        }
        else if (Array.isArray(product.images) && product.images.length) {
            await (0, product_color_variants_1.syncProductVariants)(product._id, product.slug, [
                {
                    colorName: 'Default',
                    colorHex: '#000000',
                    images: product.images,
                    isActive: true,
                },
            ]);
            const savedVariants = await ProductVariant_1.default.find({ parentProductId: product._id }).lean();
            if (savedVariants[0]) {
                product.defaultVariantId = savedVariants[0]._id;
                await product.save();
            }
        }
        const variantsMap = await (0, product_color_variants_1.getVariantsByProductIds)([product._id]);
        const colorVariants = variantsMap.get(String(product._id)) || [];
        const payload = colorVariants.length > 0
            ? (0, product_color_variants_1.mergeVariantWithParent)(product.toObject(), colorVariants[0], colorVariants)
            : product.toObject();
        res.status(201).json({ ...payload, adminVariants: colorVariants });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
// PUT /api/products/:id - update product (protected)
router.put('/:id', authMiddleware_1.default, async (req, res) => {
    try {
        const { variants, ...body } = req.body;
        const shouldApplyFilterTags = FILTER_TAG_BODY_FIELDS.some((field) => field in body) || Array.isArray(variants);
        if (shouldApplyFilterTags) {
            await applyFilterTagsToBody(body, variants?.map((v) => ({ name: v.colorName })));
        }
        const product = await Product_1.default.findByIdAndUpdate(req.params.id, body, {
            new: true,
            runValidators: true,
        });
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        let colorVariants = [];
        if (Array.isArray(variants)) {
            colorVariants = (await (0, product_color_variants_1.syncProductVariants)(product._id, product.slug, variants));
            const defaultVariant = colorVariants[0];
            if (defaultVariant && String(product.defaultVariantId) !== String(defaultVariant._id)) {
                product.defaultVariantId = defaultVariant._id;
                await product.save();
            }
        }
        else {
            const variantsMap = await (0, product_color_variants_1.getVariantsByProductIds)([product._id]);
            colorVariants = (variantsMap.get(String(product._id)) || []);
        }
        const payload = colorVariants.length > 0
            ? (0, product_color_variants_1.mergeVariantWithParent)(product.toObject(), colorVariants[0], colorVariants)
            : product.toObject();
        res.json({ ...payload, adminVariants: colorVariants });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
// GET /api/products/:id/variants - list variants for admin (protected)
router.get('/:id/variants', authMiddleware_1.default, async (req, res) => {
    try {
        const variants = await ProductVariant_1.default.find({ parentProductId: req.params.id })
            .sort({ sortOrder: 1, createdAt: 1 })
            .lean();
        res.json({ variants });
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
            await ProductVariant_1.default.deleteMany({ parentProductId: product._id });
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