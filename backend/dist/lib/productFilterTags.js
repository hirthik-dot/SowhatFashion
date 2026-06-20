"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeAutoFilterTags = computeAutoFilterTags;
exports.mergeFilterTags = mergeFilterTags;
exports.plainFilterTags = plainFilterTags;
const storeCategories_1 = require("./storeCategories");
const BUILTIN_KEYS = new Set(['category', 'size', 'promotions', 'discount', 'price']);
/** Infer filter tag values from product fields (category, sizes, flags, tags, subCategory). */
function computeAutoFilterTags(product, sidebarFilters = []) {
    const out = {};
    if (product.category) {
        const normalized = (0, storeCategories_1.normalizeCategorySlug)(product.category);
        out.category = [normalized || String(product.category).trim().toLowerCase()];
    }
    if (product.sizes?.length) {
        out.size = product.sizes.map((s) => String(s).trim().toUpperCase()).filter(Boolean);
    }
    const promos = [];
    if (product.isNewArrival)
        promos.push('new-arrivals');
    if (product.isFeatured)
        promos.push('flash-sale');
    if (promos.length)
        out.promotions = promos;
    if (product.discountPrice && product.price && product.discountPrice < product.price) {
        const pct = Math.round(((product.price - product.discountPrice) / product.price) * 100);
        const buckets = [];
        if (pct >= 10)
            buckets.push('10');
        if (pct >= 20)
            buckets.push('20');
        if (pct >= 30)
            buckets.push('30');
        if (pct >= 50)
            buckets.push('50');
        if (buckets.length)
            out.discount = buckets;
    }
    const productTags = (product.tags || []).map((t) => String(t).trim().toLowerCase()).filter(Boolean);
    const sub = String(product.subCategory || '').trim().toLowerCase();
    const colorNames = (product.colors || [])
        .map((c) => String(c.name || '').trim().toLowerCase())
        .filter(Boolean);
    for (const f of sidebarFilters) {
        const key = f.filterKey;
        if (!key || BUILTIN_KEYS.has(key))
            continue;
        const matches = [];
        for (const opt of f.options || []) {
            const val = String(opt.value).trim().toLowerCase();
            const lab = String(opt.label).trim().toLowerCase();
            if (productTags.includes(val) ||
                productTags.includes(lab) ||
                sub === val ||
                (sub && (sub.includes(val) || val.includes(sub))) ||
                (key === 'color' &&
                    colorNames.some((cn) => cn === val || cn === lab || cn.includes(val) || val.includes(cn) || lab.includes(cn)))) {
                matches.push(opt.value);
            }
        }
        if (key === 'color' && colorNames.length && !matches.length) {
            out.color = [...new Set(colorNames.map((n) => n.replace(/\s+/g, '-')))];
        }
        else if (matches.length) {
            out[key] = [...new Set(matches)];
        }
    }
    return out;
}
/** Merge manual assignments over auto; if nothing manual, use full auto map. */
function mergeFilterTags(product, manual, sidebarFilters = []) {
    const auto = computeAutoFilterTags(product, sidebarFilters);
    const manualObj = manual && typeof manual === 'object' ? manual : {};
    const hasManual = Object.values(manualObj).some((v) => Array.isArray(v) && v.length > 0);
    if (!hasManual)
        return auto;
    const merged = { ...auto };
    for (const [key, values] of Object.entries(manualObj)) {
        if (Array.isArray(values) && values.length > 0) {
            merged[key] = values.map((v) => String(v));
        }
    }
    return merged;
}
function plainFilterTags(doc) {
    if (!doc.filterTags)
        return {};
    if (doc.filterTags instanceof Map) {
        const o = {};
        doc.filterTags.forEach((v, k) => {
            o[k] = v;
        });
        return o;
    }
    return { ...doc.filterTags };
}
//# sourceMappingURL=productFilterTags.js.map