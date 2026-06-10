import mongoose from 'mongoose';
export type EcommercePriceVariant = {
    sellingPrice: number;
    incomingPrice: number;
    stock: number;
    sizes: string[];
    sizeStock: {
        size: string;
        stock: number;
    }[];
};
export declare const buildPriceVariantSlug: (baseSlug: string, sellingPrice: number) => string;
export declare const parsePriceVariantSlug: (slug: string) => {
    baseSlug: string;
    sellingPrice: number;
} | null;
export declare function getEcommerceVariantsByProducts(productIds: Array<mongoose.Types.ObjectId | string>): Promise<Map<string, EcommercePriceVariant[]>>;
export declare function applyEcommerceVariant(product: any, variant: EcommercePriceVariant, splitListing: boolean): any;
export declare function expandProductsForEcommerce(products: any[]): Promise<any[]>;
export declare function expandPopulatedProductsForEcommerce(products: any[]): Promise<any[]>;
//# sourceMappingURL=ecommerce-product-variants.d.ts.map