/** Build MongoDB conditions for storefront sidebar filters (with fallbacks for legacy products). */
export declare function isReservedFilterQueryKey(key: string): boolean;
export declare function buildFacetFilterCondition(filterKey: string, values: string[]): Record<string, unknown> | null;
export declare function collectFacetFiltersFromQuery(query: Record<string, unknown>): Record<string, string[]>;
//# sourceMappingURL=productFilterQuery.d.ts.map