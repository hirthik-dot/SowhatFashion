import mongoose, { Document } from 'mongoose';
export interface IProduct extends Document {
    name: string;
    slug: string;
    category: 'tshirt' | 'shirt' | 'pant';
    images: string[];
    price: number;
    discountPrice: number;
    sizes: string[];
    stock: number;
    tags: string[];
    isFeatured: boolean;
    isNewArrival: boolean;
    isActive: boolean;
    createdAt: Date;
}
declare const _default: mongoose.Model<IProduct, {}, {}, {}, mongoose.Document<unknown, {}, IProduct, {}, {}> & IProduct & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=Product.d.ts.map