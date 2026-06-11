import type { ISidebarFilter } from '../models/SidebarConfig';
export type FilterTagsMap = Record<string, string[]>;
/** Infer filter tag values from product fields (category, sizes, flags, tags, subCategory). */
export declare function computeAutoFilterTags(product: {
    category?: string;
    subCategory?: string;
    sizes?: string[];
    tags?: string[];
    colors?: {
        name?: string;
        hex?: string;
    }[];
    price?: number;
    discountPrice?: number;
    isNewArrival?: boolean;
    isFeatured?: boolean;
}, sidebarFilters?: ISidebarFilter[]): FilterTagsMap;
/** Merge manual assignments over auto; if nothing manual, use full auto map. */
export declare function mergeFilterTags(product: Parameters<typeof computeAutoFilterTags>[0], manual: FilterTagsMap | null | undefined, sidebarFilters?: ISidebarFilter[]): FilterTagsMap;
export declare function plainFilterTags(doc: {
    filterTags?: Map<string, string[]> | Record<string, string[]>;
}): FilterTagsMap;
//# sourceMappingURL=productFilterTags.d.ts.map