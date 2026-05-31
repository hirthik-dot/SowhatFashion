import mongoose, { Document } from 'mongoose';
export interface IBillingPointsAccount extends Document {
    phone: string;
    customerName: string;
    balance: number;
}
declare const _default: mongoose.Model<IBillingPointsAccount, {}, {}, {}, mongoose.Document<unknown, {}, IBillingPointsAccount, {}, {}> & IBillingPointsAccount & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=BillingPointsAccount.d.ts.map