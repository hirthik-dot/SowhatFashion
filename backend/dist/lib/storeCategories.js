"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CATEGORY_SLUG_ALIASES = exports.STORE_CATEGORIES = void 0;
exports.normalizeCategorySlug = normalizeCategorySlug;
exports.categoryMatchValues = categoryMatchValues;
exports.buildCategoryFilterCondition = buildCategoryFilterCondition;
/** Canonical top-level store categories — shared with homepage tiles and admin categories. */
exports.STORE_CATEGORIES = [
    { slug: 'shirt', name: 'Shirts', order: 1 },
    { slug: 'pant', name: 'Pants', order: 2 },
    { slug: 'tshirt', name: 'T-Shirts', order: 3 },
    { slug: 'track', name: 'Track', order: 4 },
    { slug: 'shorts', name: 'Shorts', order: 5 },
    { slug: 'innerwears', name: 'Innerwears', order: 6 },
    { slug: 'footwears', name: 'Footwears', order: 7 },
];
/** Map legacy tile keys / collection slugs to canonical category slugs. */
exports.CATEGORY_SLUG_ALIASES = {
    shirts: 'shirt',
    shirt: 'shirt',
    pants: 'pant',
    pant: 'pant',
    trousers: 'pant',
    tshirts: 'tshirt',
    tshirt: 'tshirt',
    't-shirts': 'tshirt',
    track: 'track',
    tracks: 'track',
    shorts: 'shorts',
    short: 'shorts',
    innerwears: 'innerwears',
    innerwear: 'innerwears',
    footwears: 'footwears',
    footwear: 'footwears',
};
function normalizeCategorySlug(raw) {
    const key = raw.trim().toLowerCase();
    return exports.CATEGORY_SLUG_ALIASES[key] ?? null;
}
function escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
/** All category strings that should match a storefront category filter. */
function categoryMatchValues(raw) {
    const trimmed = raw.trim();
    if (!trimmed)
        return [];
    const canonical = normalizeCategorySlug(trimmed);
    if (!canonical)
        return [trimmed];
    const aliases = Object.entries(exports.CATEGORY_SLUG_ALIASES)
        .filter(([, slug]) => slug === canonical)
        .map(([alias]) => alias);
    return [...new Set([canonical, ...aliases])];
}
/** MongoDB condition for filtering products by category slug (handles aliases). */
function buildCategoryFilterCondition(raw) {
    const values = categoryMatchValues(raw);
    return {
        category: {
            $regex: new RegExp(`^(${values.map(escapeRegex).join('|')})$`, 'i'),
        },
    };
}
//# sourceMappingURL=storeCategories.js.map