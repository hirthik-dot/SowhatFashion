import type { FilterGroup } from '@/lib/collection-filters';

export type SidebarFilterConfig = {
  id: string;
  label: string;
  type: 'range_slider' | 'checkbox_list' | 'radio_list';
  filterKey: string;
  isVisible: boolean;
  order: number;
  options?: { label: string; value: string; count?: number }[];
  rangeConfig?: { min: number; max: number; step: number; prefix: string };
};

export type ProductCountsResponse = {
  total?: number;
  size?: Record<string, number>;
  category?: Record<string, number>;
  promotions?: Record<string, number>;
  discount?: Record<string, number>;
  facets?: Record<string, Record<string, number>>;
};

export function sidebarConfigToFilterGroups(
  filters: SidebarFilterConfig[],
  counts?: ProductCountsResponse | null
): FilterGroup[] {
  const sorted = [...filters].filter((f) => f.isVisible).sort((a, b) => a.order - b.order);

  return sorted.map((f) => {
    const key = f.filterKey;
    const countBucket =
      counts?.facets?.[key] ||
      (key === 'size' ? counts?.size : undefined) ||
      (key === 'category' ? counts?.category : undefined) ||
      (key === 'promotions' ? counts?.promotions : undefined) ||
      (key === 'discount' ? counts?.discount : undefined);

    if (f.type === 'range_slider') {
      const rc = f.rangeConfig || { min: 0, max: 15000, step: 100, prefix: '₹' };
      return {
        id: f.id,
        label: f.label.toUpperCase(),
        type: 'price-range',
        paramKey: key === 'price' ? 'price' : key,
        rangeMin: rc.min,
        rangeMax: rc.max,
        rangeStep: rc.step,
      };
    }

    const options = (f.options || []).map((o) => ({
      label: o.label,
      value: o.value,
      count: countBucket?.[o.value] ?? o.count,
    }));

    if (key === 'size') {
      return {
        id: f.id,
        label: f.label.toUpperCase(),
        type: 'size-buttons',
        paramKey: 'size',
        options,
      };
    }

    return {
      id: f.id,
      label: f.label.toUpperCase(),
      type: f.type === 'radio_list' ? 'radio' : 'checkbox',
      paramKey: key,
      options,
    };
  });
}

/** Keys managed by dedicated query params (not generic facets). */
export const RESERVED_FILTER_PARAMS = new Set([
  'page',
  'sort',
  'category',
  'subCategory',
  'featured',
  'newArrival',
  'search',
  'q',
  'minPrice',
  'maxPrice',
  'inStock',
  'limit',
]);

export function getFacetParamKeys(groups: FilterGroup[]): string[] {
  return groups
    .map((g) => g.paramKey || g.id)
    .filter((k) => k && k !== 'price' && !RESERVED_FILTER_PARAMS.has(k));
}
