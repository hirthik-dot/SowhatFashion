import mongoose from 'mongoose';
export type ProductVariantRecord = {
    _id: mongoose.Types.ObjectId | string;
    parentProductId: mongoose.Types.ObjectId | string;
    slug: string;
    colorName: string;
    colorHex: string;
    images: string[];
    price?: number;
    discountPrice?: number;
    stock?: number;
    sku?: string;
    sortOrder: number;
    isActive: boolean;
};
export declare const buildColorVariantSlug: (baseSlug: string, colorName: string) => string;
export declare const uniqueVariantSlug: (baseSlug: string, colorName: string, excludeId?: string) => Promise<string>;
export declare function resolveVariantFields(parent: Record<string, unknown>, variant: ProductVariantRecord): {
    price: number;
    discountPrice: number;
    stock: number;
    sku: string;
};
export declare function mergeVariantWithParent(parent: Record<string, unknown>, variant: ProductVariantRecord, siblings?: ProductVariantRecord[]): {
    _id: unknown;
    slug: string;
    name: unknown;
    images: string[];
    price: number;
    discountPrice: number;
    stock: number;
    sku: string;
    variantId: string;
    parentProductId: string;
    colorName: string;
    colorHex: string;
    isColorVariant: boolean;
    variants: {
        _id: string;
        slug: string;
        colorName: string;
        colorHex: string;
        images: string[];
        price: number;
        discountPrice: number;
        stock: number;
        isActive: boolean;
        thumbnail: string;
    }[];
    colors: {
        name: string;
        hex: string;
        slug: string;
        _id: string;
    }[];
};
export declare function getVariantsByProductIds(productIds: Array<mongoose.Types.ObjectId | string>): Promise<Map<string, ProductVariantRecord[]>>;
export declare function getVariantBySlug(slug: string): Promise<{
    variant: ProductVariantRecord;
    siblings: ProductVariantRecord[];
} | null>;
export declare function pickDefaultVariant(variants: ProductVariantRecord[]): ProductVariantRecord | null;
export declare function applyDefaultVariantToProduct(parent: Record<string, unknown>): Promise<Record<string, unknown>>;
export declare function attachVariantsForListing(products: Record<string, unknown>[]): Promise<Record<string, unknown>[]>;
export type VariantInput = {
    _id?: string;
    slug?: string;
    colorName: string;
    colorHex?: string;
    images?: string[];
    price?: number | null;
    discountPrice?: number | null;
    stock?: number | null;
    sku?: string;
    sortOrder?: number;
    isActive?: boolean;
};
export declare function syncProductVariants(productId: mongoose.Types.ObjectId | string, baseSlug: string, variants: VariantInput[]): Promise<(mongoose.FlattenMaps<import("../models/ProductVariant").IProductVariant> & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
})[]>;
//# sourceMappingURL=product-color-variants.d.ts.map