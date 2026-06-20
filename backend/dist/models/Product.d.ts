import mongoose, { Document } from 'mongoose';
export interface IProductColor {
    name: string;
    hex: string;
    imageIndex?: number;
}
export interface IProduct extends Document {
    name: string;
    billingName?: string;
    slug: string;
    /** Shared product description (variants inherit this) */
    description?: string;
    category: string;
    subCategory: string;
    images: string[];
    colors?: IProductColor[];
    /** Default color variant for listing / legacy URL redirects */
    defaultVariantId?: mongoose.Types.ObjectId;
    price: number;
    discountPrice: number;
    sizes: string[];
    stock: number;
    tags: string[];
    /** Admin-assigned shop filter values keyed by filterKey (e.g. fit, fabric). Auto-filled on save when empty. */
    filterTags?: Map<string, string[]> | Record<string, string[]>;
    isFeatured: boolean;
    isNewArrival: boolean;
    isActive: boolean;
    barcode?: string;
    sku?: string;
    incomingPrice?: number;
    supplier?: mongoose.Types.ObjectId;
    billingCategory?: mongoose.Types.ObjectId;
    billingSubCategory?: mongoose.Types.ObjectId;
    sizeStock?: {
        size: string;
        stock: number;
    }[];
    totalStock?: number;
    isBillingProduct?: boolean;
    notes?: string;
    isEcommerceProduct?: boolean;
    createdAt: Date;
}
declare const _default: mongoose.Model<IProduct, {}, {}, {}, mongoose.Document<unknown, {}, IProduct, {}, {}> & IProduct & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=Product.d.ts.map