import type { ISidebarFilter } from '../models/SidebarConfig';

export type FilterTagsMap = Record<string, string[]>;

const BUILTIN_KEYS = new Set(['category', 'size', 'promotions', 'discount', 'price']);

/** Infer filter tag values from product fields (category, sizes, flags, tags, subCategory). */
export function computeAutoFilterTags(
  product: {
    category?: string;
    subCategory?: string;
    sizes?: string[];
    tags?: string[];
    price?: number;
    discountPrice?: number;
    isNewArrival?: boolean;
    isFeatured?: boolean;
  },
  sidebarFilters: ISidebarFilter[] = []
): FilterTagsMap {
  const out: FilterTagsMap = {};

  if (product.category) {
    out.category = [String(product.category).trim().toLowerCase().replace(/s$/i, '')];
  }

  if (product.sizes?.length) {
    out.size = product.sizes.map((s) => String(s).trim().toUpperCase()).filter(Boolean);
  }

  const promos: string[] = [];
  if (product.isNewArrival) promos.push('new-arrivals');
  if (product.isFeatured) promos.push('flash-sale');
  if (promos.length) out.promotions = promos;

  if (product.discountPrice && product.price && product.discountPrice < product.price) {
    const pct = Math.round(((product.price - product.discountPrice) / product.price) * 100);
    const buckets: string[] = [];
    if (pct >= 10) buckets.push('10');
    if (pct >= 20) buckets.push('20');
    if (pct >= 30) buckets.push('30');
    if (pct >= 50) buckets.push('50');
    if (buckets.length) out.discount = buckets;
  }

  const productTags = (product.tags || []).map((t) => String(t).trim().toLowerCase()).filter(Boolean);
  const sub = String(product.subCategory || '').trim().toLowerCase();

  for (const f of sidebarFilters) {
    const key = f.filterKey;
    if (!key || BUILTIN_KEYS.has(key)) continue;
    const matches: string[] = [];
    for (const opt of f.options || []) {
      const val = String(opt.value).trim().toLowerCase();
      const lab = String(opt.label).trim().toLowerCase();
      if (
        productTags.includes(val) ||
        productTags.includes(lab) ||
        sub === val ||
        (sub && (sub.includes(val) || val.includes(sub)))
      ) {
        matches.push(opt.value);
      }
    }
    if (matches.length) out[key] = [...new Set(matches)];
  }

  return out;
}

/** Merge manual assignments over auto; if nothing manual, use full auto map. */
export function mergeFilterTags(
  product: Parameters<typeof computeAutoFilterTags>[0],
  manual: FilterTagsMap | null | undefined,
  sidebarFilters: ISidebarFilter[] = []
): FilterTagsMap {
  const auto = computeAutoFilterTags(product, sidebarFilters);
  const manualObj = manual && typeof manual === 'object' ? manual : {};
  const hasManual = Object.values(manualObj).some((v) => Array.isArray(v) && v.length > 0);

  if (!hasManual) return auto;

  const merged = { ...auto };
  for (const [key, values] of Object.entries(manualObj)) {
    if (Array.isArray(values) && values.length > 0) {
      merged[key] = values.map((v) => String(v));
    }
  }
  return merged;
}

export function plainFilterTags(doc: { filterTags?: Map<string, string[]> | Record<string, string[]> }): FilterTagsMap {
  if (!doc.filterTags) return {};
  if (doc.filterTags instanceof Map) {
    const o: FilterTagsMap = {};
    doc.filterTags.forEach((v, k) => {
      o[k] = v;
    });
    return o;
  }
  return { ...(doc.filterTags as Record<string, string[]>) };
}
