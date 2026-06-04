/** Build MongoDB conditions for storefront sidebar filters (with fallbacks for legacy products). */

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
]);

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Case-insensitive match for a string value on an array field (tags, filterTags.*). */
function arrayFieldMatchesValue(field: string, value: string): Record<string, unknown> {
  const re = new RegExp(`^${escapeRegex(value.trim())}$`, 'i');
  return { [field]: { $elemMatch: { $regex: re } } };
}

export function isReservedFilterQueryKey(key: string): boolean {
  return RESERVED_QUERY_KEYS.has(key);
}

export function buildFacetFilterCondition(filterKey: string, values: string[]): Record<string, unknown> | null {
  if (!values.length) return null;

  switch (filterKey) {
    case 'category': {
      const normalized = values.map((v) => v.trim().replace(/s$/i, ''));
      return {
        category: {
          $regex: new RegExp(`^(${normalized.map((v) => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})$`, 'i'),
        },
      };
    }
    case 'size':
      return { sizes: { $in: values.map((v) => v.trim().toUpperCase()) } };
    case 'promotions': {
      const or: Record<string, boolean>[] = [];
      if (values.includes('new-arrivals')) or.push({ isNewArrival: true });
      if (values.includes('flash-sale')) or.push({ isFeatured: true });
      return or.length ? { $or: or } : null;
    }
    default: {
      const or: Record<string, unknown>[] = [];
      for (const v of values) {
        const trimmed = v.trim();
        if (!trimmed) continue;
        or.push(arrayFieldMatchesValue(`filterTags.${filterKey}`, trimmed));
        or.push(arrayFieldMatchesValue('tags', trimmed));
        or.push({ subCategory: { $regex: new RegExp(`^${escapeRegex(trimmed)}$`, 'i') } });
      }
      return or.length ? { $or: or } : null;
    }
  }
}

export function collectFacetFiltersFromQuery(query: Record<string, unknown>): Record<string, string[]> {
  const facets: Record<string, string[]> = {};
  for (const [key, raw] of Object.entries(query)) {
    if (isReservedFilterQueryKey(key) || raw == null) continue;
    const val = String(raw).trim();
    if (!val) continue;
    facets[key] = val.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return facets;
}
