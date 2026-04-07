import mongoose, { Document } from 'mongoose';
export interface IBillingReturn extends Document {
    bill?: mongoose.Types.ObjectId;
    billNumber: string;
    returnNumber: string;
    customer: {
        name: string;
        phone?: string;
    };
    returnedItems: any[];
    replacementItems: any[];
    returnType: 'replacement' | 'partial';
    priceDifference: number;
    refundAmount: number;
    refundMethod: 'none';
    processedBy?: mongoose.Types.ObjectId;
}
declare const _default: mongoose.Model<IBillingReturn, {}, {}, {}, mongoose.Document<unknown, {}, IBillingReturn, {}, {}> & IBillingReturn & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=Return.d.ts.map