import mongoose, { Document } from 'mongoose';
export interface IBill extends Document {
    billNumber: string;
    customer: {
        name: string;
        phone?: string;
    };
    salesman?: mongoose.Types.ObjectId;
    items: any[];
    subtotal: number;
    totalItemDiscount: number;
    billDiscountType: 'percent' | 'amount' | 'none';
    billDiscountValue: number;
    billDiscountAmount: number;
    taxableAmount: number;
    gstAmount: number;
    cgst: number;
    sgst: number;
    roundOff: number;
    totalAmount: number;
    paymentMethod: 'cash' | 'gpay' | 'upi' | 'card' | 'partial' | 'pending';
    paymentBreakdown?: Array<{
        method: 'cash' | 'gpay' | 'upi' | 'card';
        amount: number;
    }>;
    pendingAmount?: number;
    cashReceived?: number;
    changeReturned?: number;
    pointsMode?: 'earn' | 'redeem' | 'none';
    awardPoints?: boolean;
    pointsEarned?: number;
    pointsRedeemed?: number;
    pointsDiscountAmount?: number;
    pointsBalanceAfter?: number;
    status: 'draft' | 'held' | 'completed' | 'replaced' | 'partial_replaced';
    createdBy?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
    completedAt?: Date;
    editHistory?: Array<{
        editedAt: Date;
        editedBy?: mongoose.Types.ObjectId;
        editReason: string;
        previousTotal: number;
        newTotal: number;
    }>;
}
declare const _default: mongoose.Model<IBill, {}, {}, {}, mongoose.Document<unknown, {}, IBill, {}, {}> & IBill & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=Bill.d.ts.map