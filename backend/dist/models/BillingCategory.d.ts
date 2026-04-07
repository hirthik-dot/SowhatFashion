import mongoose, { Document } from 'mongoose';
export interface IBillingCategory extends Document {
    name: string;
    slug: string;
    parentCategory: mongoose.Types.ObjectId | null;
    supplier?: mongoose.Types.ObjectId;
    isActive: boolean;
    order: number;
}
declare const _default: mongoose.Model<IBillingCategory, {}, {}, {}, mongoose.Document<unknown, {}, IBillingCategory, {}, {}> & IBillingCategory & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=BillingCategory.d.ts.map