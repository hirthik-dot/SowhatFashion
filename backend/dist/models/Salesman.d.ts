import mongoose, { Document } from 'mongoose';
export interface ISalesman extends Document {
    name: string;
    phone?: string;
    isActive: boolean;
    createdAt: Date;
}
declare const _default: mongoose.Model<ISalesman, {}, {}, {}, mongoose.Document<unknown, {}, ISalesman, {}, {}> & ISalesman & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=Salesman.d.ts.map