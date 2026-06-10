/** Map billing category display names to ecommerce catalogue slugs. */
export declare function toEcommerceCategorySlug(name: string): string;
export declare function toEcommerceSubCategorySlug(name: string): string;
export declare function applyBillingCategoriesToProduct(product: {
    category?: string;
    subCategory?: string;
}, categoryName: string, subCategoryName: string): void;
//# sourceMappingURL=billing-ecommerce-category.d.ts.map