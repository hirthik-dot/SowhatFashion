"use strict";
/** Build MongoDB conditions for storefront sidebar filters (with fallbacks for legacy products). */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isReservedFilterQueryKey = isReservedFilterQueryKey;
exports.buildFacetFilterCondition = buildFacetFilterCondition;
exports.collectFacetFiltersFromQuery = collectFacetFiltersFromQuery;
const storeCategories_1 = require("./storeCategories");
const RESERVED_QUERY_KEYS = new Set([
    'category',
    'subCategory',
    'featured',
    'newArrival',
    'sort',
    'limit',
    'page',
    'size',
    'minPrice',
    'maxPrice',
    'discount',
    'promotions',
    'search',
    'q',
    'inStock',
    'expand',
]);
function escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
/** Case-insensitive match for a string value on an array field (tags, filterTags.*). */
function arrayFieldMatchesValue(field, value) {
    const re = new RegExp(`^${escapeRegex(value.trim())}$`, 'i');
    return { [field]: { $elemMatch: { $regex: re } } };
}
function isReservedFilterQueryKey(key) {
    return RESERVED_QUERY_KEYS.has(key);
}
function buildFacetFilterCondition(filterKey, values) {
    if (!values.length)
        return null;
    switch (filterKey) {
        case 'category': {
            if (values.length === 1)
                return (0, storeCategories_1.buildCategoryFilterCondition)(values[0]);
            const allValues = [...new Set(values.flatMap((v) => (0, storeCategories_1.categoryMatchValues)(v)))];
            if (!allValues.length)
                return null;
            return {
                category: {
                    $regex: new RegExp(`^(${allValues.map(escapeRegex).join('|')})$`, 'i'),
                },
            };
        }
        case 'size':
            return { sizes: { $in: values.map((v) => v.trim().toUpperCase()) } };
        case 'promotions': {
            const or = [];
            if (values.includes('new-arrivals'))
                or.push({ isNewArrival: true });
            if (values.includes('flash-sale'))
                or.push({ isFeatured: true });
            return or.length ? { $or: or } : null;
        }
        default: {
            const or = [];
            for (const v of values) {
                const trimmed = v.trim();
                if (!trimmed)
                    continue;
                or.push(arrayFieldMatchesValue(`filterTags.${filterKey}`, trimmed));
                or.push(arrayFieldMatchesValue('tags', trimmed));
                or.push({ subCategory: { $regex: new RegExp(`^${escapeRegex(trimmed)}$`, 'i') } });
            }
            return or.length ? { $or: or } : null;
        }
    }
}
function collectFacetFiltersFromQuery(query) {
    const facets = {};
    for (const [key, raw] of Object.entries(query)) {
        if (isReservedFilterQueryKey(key) || raw == null)
            continue;
        const val = String(raw).trim();
        if (!val)
            continue;
        facets[key] = val.split(',').map((s) => s.trim()).filter(Boolean);
    }
    return facets;
}
//# sourceMappingURL=productFilterQuery.js.map