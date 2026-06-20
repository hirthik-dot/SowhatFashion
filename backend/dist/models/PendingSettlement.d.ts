import mongoose, { Document } from 'mongoose';
export interface IPendingSettlement extends Document {
    phone: string;
    customerName: string;
    amount: number;
    paymentMethod: 'cash' | 'gpay' | 'upi' | 'card';
    note?: string;
    allocations: Array<{
        bill: mongoose.Types.ObjectId;
        billNumber: string;
        amount: number;
    }>;
    createdBy?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<IPendingSettlement, {}, {}, {}, mongoose.Document<unknown, {}, IPendingSettlement, {}, {}> & IPendingSettlement & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=PendingSettlement.d.ts.map