"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parsePriceVariantSlug = exports.buildPriceVariantSlug = void 0;
exports.getEcommerceVariantsByProducts = getEcommerceVariantsByProducts;
exports.applyEcommerceVariant = applyEcommerceVariant;
exports.expandProductsForEcommerce = expandProductsForEcommerce;
exports.expandPopulatedProductsForEcommerce = expandPopulatedProductsForEcommerce;
const mongoose_1 = __importDefault(require("mongoose"));
const StockItem_1 = __importDefault(require("../models/StockItem"));
const stock_inventory_counts_1 = require("./stock-inventory-counts");
const product_color_variants_1 = require("./product-color-variants");
const variantSlugSuffix = (price) => `p${Math.round(Number(price || 0))}`;
const buildPriceVariantSlug = (baseSlug, sellingPrice) => `${String(baseSlug || '').trim()}-${variantSlugSuffix(sellingPrice)}`;
exports.buildPriceVariantSlug = buildPriceVariantSlug;
const parsePriceVariantSlug = (slug) => {
    const match = String(slug || '').match(/^(.*)-p(\d+)$/i);
    if (!match)
        return null;
    return { baseSlug: match[1], sellingPrice: Number(match[2]) };
};
exports.parsePriceVariantSlug = parsePriceVariantSlug;
async function getEcommerceVariantsByProducts(productIds) {
    const ids = productIds
        .filter(Boolean)
        .map((id) => new mongoose_1.default.Types.ObjectId(String(id)));
    const result = new Map();
    if (!ids.length)
        return result;
    const rows = await StockItem_1.default.aggregate([
        { $match: { product: { $in: ids }, status: { $in: [...stock_inventory_counts_1.BILLABLE_STATUSES] } } },
        {
            $group: {
                _id: { product: '$product', sellingPrice: '$sellingPrice', size: '$size' },
                count: { $sum: 1 },
                incomingPrice: { $first: '$incomingPrice' },
            },
        },
    ]);
    const byProduct = new Map();
    for (const row of rows) {
        const productKey = String(row._id?.product || '');
        const sellingPrice = Number(row._id?.sellingPrice || 0);
        const size = String(row._id?.size || '').trim() || '-';
        const count = Number(row.count || 0);
        if (!productKey)
            continue;
        if (!byProduct.has(productKey))
            byProduct.set(productKey, new Map());
        const priceMap = byProduct.get(productKey);
        if (!priceMap.has(sellingPrice)) {
            priceMap.set(sellingPrice, {
                sellingPrice,
                incomingPrice: Number(row.incomingPrice || 0),
                stock: 0,
                sizes: [],
                sizeStock: [],
            });
        }
        const variant = priceMap.get(sellingPrice);
        variant.stock += count;
        if (!variant.sizes.includes(size))
            variant.sizes.push(size);
        const sizeRow = variant.sizeStock.find((entry) => entry.size === size);
        if (sizeRow)
            sizeRow.stock += count;
        else
            variant.sizeStock.push({ size, stock: count });
    }
    for (const id of ids) {
        const key = String(id);
        const priceMap = byProduct.get(key);
        const variants = priceMap
            ? [...priceMap.values()]
                .map((variant) => ({
                ...variant,
                sizes: [...variant.sizes].sort(stock_inventory_counts_1.compareSizes),
                sizeStock: [...variant.sizeStock].sort((a, b) => (0, stock_inventory_counts_1.compareSizes)(a.size, b.size)),
            }))
                .sort((a, b) => a.sellingPrice - b.sellingPrice)
            : [];
        result.set(key, variants);
    }
    return result;
}
function applyEcommerceVariant(product, variant, splitListing) {
    const base = typeof product.toObject === 'function' ? product.toObject() : { ...product };
    const roundedPrice = Math.round(variant.sellingPrice);
    const payload = {
        ...base,
        price: variant.sellingPrice,
        incomingPrice: variant.incomingPrice,
        stock: variant.stock,
        sizes: variant.sizes,
        sizeStock: variant.sizeStock,
        totalStock: variant.stock,
        priceVariant: variant.sellingPrice,
        parentProductId: String(base._id),
    };
    if (!splitListing)
        return payload;
    return {
        ...payload,
        name: `${base.name} (₹${roundedPrice})`,
        slug: (0, exports.buildPriceVariantSlug)(base.slug, variant.sellingPrice),
        isPriceVariant: true,
    };
}
const normalizeProduct = (product) => typeof product?.toObject === 'function' ? product.toObject() : { ...product };
async function expandProductsForEcommerce(products) {
    const withColorVariants = await (0, product_color_variants_1.attachVariantsForListing)(products);
    const productIds = withColorVariants.map((product) => product._id).filter(Boolean);
    const variantsByProduct = await getEcommerceVariantsByProducts(productIds);
    const expanded = [];
    for (const product of withColorVariants) {
        const variants = variantsByProduct.get(String(product._id)) || [];
        const inStockVariants = variants.filter((variant) => variant.stock > 0);
        if (inStockVariants.length <= 1) {
            if (inStockVariants.length === 1) {
                expanded.push(applyEcommerceVariant(product, inStockVariants[0], false));
            }
            else {
                expanded.push(normalizeProduct(product));
            }
            continue;
        }
        for (const variant of inStockVariants) {
            expanded.push(applyEcommerceVariant(product, variant, true));
        }
    }
    return expanded;
}
async function expandPopulatedProductsForEcommerce(products) {
    if (!products?.length)
        return [];
    return expandProductsForEcommerce(products.filter(Boolean));
}
//# sourceMappingURL=ecommerce-product-variants.js.map