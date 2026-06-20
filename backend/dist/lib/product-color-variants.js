"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uniqueVariantSlug = exports.buildColorVariantSlug = void 0;
exports.resolveVariantFields = resolveVariantFields;
exports.mergeVariantWithParent = mergeVariantWithParent;
exports.getVariantsByProductIds = getVariantsByProductIds;
exports.getVariantBySlug = getVariantBySlug;
exports.pickDefaultVariant = pickDefaultVariant;
exports.applyDefaultVariantToProduct = applyDefaultVariantToProduct;
exports.attachVariantsForListing = attachVariantsForListing;
exports.syncProductVariants = syncProductVariants;
const mongoose_1 = __importDefault(require("mongoose"));
const slugify_1 = __importDefault(require("slugify"));
const ProductVariant_1 = __importDefault(require("../models/ProductVariant"));
const buildColorVariantSlug = (baseSlug, colorName) => {
    const base = String(baseSlug || '').trim();
    const colorPart = (0, slugify_1.default)(String(colorName || 'variant'), { lower: true, strict: true });
    return `${base}-${colorPart}`;
};
exports.buildColorVariantSlug = buildColorVariantSlug;
const uniqueVariantSlug = async (baseSlug, colorName, excludeId) => {
    let candidate = (0, exports.buildColorVariantSlug)(baseSlug, colorName);
    let counter = 1;
    while (true) {
        const filter = { slug: candidate };
        if (excludeId)
            filter._id = { $ne: new mongoose_1.default.Types.ObjectId(excludeId) };
        const existing = await ProductVariant_1.default.findOne(filter).select('_id').lean();
        if (!existing)
            return candidate;
        counter += 1;
        candidate = `${(0, exports.buildColorVariantSlug)(baseSlug, colorName)}-${counter}`;
    }
};
exports.uniqueVariantSlug = uniqueVariantSlug;
function resolveVariantFields(parent, variant) {
    const price = variant.price != null && variant.price >= 0 ? variant.price : Number(parent.price) || 0;
    const discountPrice = variant.discountPrice != null && variant.discountPrice >= 0
        ? variant.discountPrice
        : Number(parent.discountPrice) || 0;
    const stock = variant.stock != null && variant.stock >= 0 ? variant.stock : Number(parent.stock) || 0;
    const sku = variant.sku?.trim() ? variant.sku : String(parent.sku || '');
    return { price, discountPrice, stock, sku };
}
function mergeVariantWithParent(parent, variant, siblings = []) {
    const { price, discountPrice, stock, sku } = resolveVariantFields(parent, variant);
    const images = variant.images?.length ? variant.images : parent.images || [];
    const activeSiblings = siblings.filter((s) => s.isActive !== false);
    return {
        ...parent,
        _id: parent._id,
        slug: variant.slug,
        name: parent.name,
        images,
        price,
        discountPrice,
        stock,
        sku,
        variantId: String(variant._id),
        parentProductId: String(parent._id),
        colorName: variant.colorName,
        colorHex: variant.colorHex,
        isColorVariant: true,
        variants: activeSiblings.map((s) => ({
            _id: String(s._id),
            slug: s.slug,
            colorName: s.colorName,
            colorHex: s.colorHex,
            images: s.images?.length ? s.images : [],
            price: resolveVariantFields(parent, s).price,
            discountPrice: resolveVariantFields(parent, s).discountPrice,
            stock: resolveVariantFields(parent, s).stock,
            isActive: s.isActive !== false,
            thumbnail: (s.images?.[0] || images[0] || parent.images?.[0]) ?? '',
        })),
        // Legacy shape for components still reading colors[]
        colors: activeSiblings.map((s) => ({
            name: s.colorName,
            hex: s.colorHex,
            slug: s.slug,
            _id: String(s._id),
        })),
    };
}
async function getVariantsByProductIds(productIds) {
    const ids = productIds.filter(Boolean).map((id) => new mongoose_1.default.Types.ObjectId(String(id)));
    const result = new Map();
    if (!ids.length)
        return result;
    const variants = (await ProductVariant_1.default.find({ parentProductId: { $in: ids } })
        .sort({ sortOrder: 1, createdAt: 1 })
        .lean());
    for (const id of ids) {
        result.set(String(id), []);
    }
    for (const variant of variants) {
        const key = String(variant.parentProductId);
        result.get(key)?.push(variant);
    }
    return result;
}
async function getVariantBySlug(slug) {
    const variant = (await ProductVariant_1.default.findOne({ slug, isActive: true }).lean());
    if (!variant)
        return null;
    const siblings = (await ProductVariant_1.default.find({
        parentProductId: variant.parentProductId,
        isActive: true,
    })
        .sort({ sortOrder: 1, createdAt: 1 })
        .lean());
    return { variant, siblings };
}
function pickDefaultVariant(variants) {
    if (!variants.length)
        return null;
    const active = variants.filter((v) => v.isActive !== false);
    const pool = active.length ? active : variants;
    const inStock = pool.find((v) => (v.stock ?? 0) > 0);
    return inStock || pool[0];
}
async function applyDefaultVariantToProduct(parent) {
    const variantsMap = await getVariantsByProductIds([parent._id]);
    const variants = variantsMap.get(String(parent._id)) || [];
    if (!variants.length)
        return parent;
    const defaultVariant = pickDefaultVariant(variants);
    if (!defaultVariant)
        return parent;
    return mergeVariantWithParent(parent, defaultVariant, variants);
}
async function attachVariantsForListing(products) {
    const ids = products.map((p) => p._id).filter(Boolean);
    const variantsMap = await getVariantsByProductIds(ids);
    return products.map((product) => {
        const variants = variantsMap.get(String(product._id)) || [];
        if (!variants.length)
            return product;
        const defaultVariant = pickDefaultVariant(variants);
        if (!defaultVariant)
            return product;
        const merged = mergeVariantWithParent(product, defaultVariant, variants);
        return {
            ...merged,
            hasColorVariants: variants.length > 1,
            variantCount: variants.length,
        };
    });
}
async function syncProductVariants(productId, baseSlug, variants) {
    const parentId = new mongoose_1.default.Types.ObjectId(String(productId));
    const existing = await ProductVariant_1.default.find({ parentProductId: parentId }).lean();
    const existingIds = new Set(existing.map((v) => String(v._id)));
    const keptIds = new Set();
    for (let i = 0; i < variants.length; i++) {
        const input = variants[i];
        if (!input.colorName?.trim())
            continue;
        const payload = {
            parentProductId: parentId,
            colorName: input.colorName.trim(),
            colorHex: input.colorHex?.trim() || '#000000',
            images: Array.isArray(input.images) ? input.images.filter(Boolean) : [],
            price: input.price != null && input.price >= 0 ? input.price : undefined,
            discountPrice: input.discountPrice != null && input.discountPrice >= 0 ? input.discountPrice : undefined,
            stock: input.stock != null && input.stock >= 0 ? input.stock : undefined,
            sku: input.sku?.trim() || '',
            sortOrder: input.sortOrder ?? i,
            isActive: input.isActive !== false,
        };
        if (input._id && existingIds.has(String(input._id))) {
            const slug = input.slug?.trim() ||
                (await (0, exports.uniqueVariantSlug)(baseSlug, input.colorName, String(input._id)));
            await ProductVariant_1.default.findByIdAndUpdate(input._id, { ...payload, slug }, { runValidators: true });
            keptIds.add(String(input._id));
        }
        else {
            const slug = input.slug?.trim() || (await (0, exports.uniqueVariantSlug)(baseSlug, input.colorName));
            const created = await ProductVariant_1.default.create({ ...payload, slug });
            keptIds.add(String(created._id));
        }
    }
    const toDelete = [...existingIds].filter((id) => !keptIds.has(id));
    if (toDelete.length) {
        await ProductVariant_1.default.deleteMany({ _id: { $in: toDelete } });
    }
    return ProductVariant_1.default.find({ parentProductId: parentId }).sort({ sortOrder: 1 }).lean();
}
//# sourceMappingURL=product-color-variants.js.map