"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.toEcommerceCategorySlug = toEcommerceCategorySlug;
exports.toEcommerceSubCategorySlug = toEcommerceSubCategorySlug;
exports.applyBillingCategoriesToProduct = applyBillingCategoriesToProduct;
const slugify_1 = __importDefault(require("slugify"));
/** Map billing category display names to ecommerce catalogue slugs. */
function toEcommerceCategorySlug(name) {
    const normalized = String(name || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '');
    if (normalized.includes('tshirt'))
        return 'tshirt';
    if (normalized === 'shirts' || normalized === 'shirt')
        return 'shirt';
    if (normalized.includes('pant') || normalized.includes('trouser'))
        return 'pant';
    const slug = (0, slugify_1.default)(String(name || '').trim(), { lower: true, strict: true });
    return slug.replace(/s$/i, '') || 'other';
}
function toEcommerceSubCategorySlug(name) {
    return (0, slugify_1.default)(String(name || '').trim(), { lower: true, strict: true }) || '';
}
function applyBillingCategoriesToProduct(product, categoryName, subCategoryName) {
    product.category = toEcommerceCategorySlug(categoryName);
    product.subCategory = toEcommerceSubCategorySlug(subCategoryName);
}
//# sourceMappingURL=billing-ecommerce-category.js.map