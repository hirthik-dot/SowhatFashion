import mongoose, { Document } from 'mongoose';
export type PointsLedgerType = 'earn' | 'redeem' | 'adjust' | 'return_clawback';
export interface IBillingPointsLedger extends Document {
    phone: string;
    type: PointsLedgerType;
    points: number;
    rupees?: number;
    bill?: mongoose.Types.ObjectId;
    billNumber?: string;
    balanceAfter: number;
    createdBy?: mongoose.Types.ObjectId;
    note?: string;
}
declare const _default: mongoose.Model<IBillingPointsLedger, {}, {}, {}, mongoose.Document<unknown, {}, IBillingPointsLedger, {}, {}> & IBillingPointsLedger & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=BillingPointsLedger.d.ts.map