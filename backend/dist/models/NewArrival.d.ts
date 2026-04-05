import mongoose, { Document, Types } from 'mongoose';
export interface INewArrival extends Document {
    product: Types.ObjectId;
    addedAt: Date;
    weekLabel: string;
    isActive: boolean;
    order: number;
}
declare const _default: mongoose.Model<INewArrival, {}, {}, {}, mongoose.Document<unknown, {}, INewArrival, {}, {}> & INewArrival & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=NewArrival.d.ts.map