import mongoose, { Document } from 'mongoose';
export interface ISupplier extends Document {
    name: string;
    phone?: string;
    address?: string;
    gstNumber?: string;
    isActive: boolean;
    createdAt: Date;
}
declare const _default: mongoose.Model<ISupplier, {}, {}, {}, mongoose.Document<unknown, {}, ISupplier, {}, {}> & ISupplier & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=Supplier.d.ts.map