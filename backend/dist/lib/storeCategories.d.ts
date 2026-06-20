/** Canonical top-level store categories — shared with homepage tiles and admin categories. */
export declare const STORE_CATEGORIES: readonly [{
    readonly slug: "shirt";
    readonly name: "Shirts";
    readonly order: 1;
}, {
    readonly slug: "pant";
    readonly name: "Pants";
    readonly order: 2;
}, {
    readonly slug: "tshirt";
    readonly name: "T-Shirts";
    readonly order: 3;
}, {
    readonly slug: "track";
    readonly name: "Track";
    readonly order: 4;
}, {
    readonly slug: "shorts";
    readonly name: "Shorts";
    readonly order: 5;
}, {
    readonly slug: "innerwears";
    readonly name: "Innerwears";
    readonly order: 6;
}, {
    readonly slug: "footwears";
    readonly name: "Footwears";
    readonly order: 7;
}];
export type StoreCategorySlug = (typeof STORE_CATEGORIES)[number]['slug'];
/** Map legacy tile keys / collection slugs to canonical category slugs. */
export declare const CATEGORY_SLUG_ALIASES: Record<string, StoreCategorySlug>;
export declare function normalizeCategorySlug(raw: string): StoreCategorySlug | null;
/** All category strings that should match a storefront category filter. */
export declare function categoryMatchValues(raw: string): string[];
/** MongoDB condition for filtering products by category slug (handles aliases). */
export declare function buildCategoryFilterCondition(raw: string): Record<string, unknown>;
//# sourceMappingURL=storeCategories.d.ts.map