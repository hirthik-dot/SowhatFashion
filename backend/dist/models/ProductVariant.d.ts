import mongoose, { Document } from 'mongoose';
export interface IProductVariant extends Document {
    parentProductId: mongoose.Types.ObjectId;
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
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<IProductVariant, {}, {}, {}, mongoose.Document<unknown, {}, IProductVariant, {}, {}> & IProductVariant & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=ProductVariant.d.ts.map