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
    paymentMethod: 'cash' | 'gpay' | 'upi' | 'card' | 'partial';
    paymentBreakdown?: Array<{
        method: 'cash' | 'gpay' | 'upi' | 'card';
        amount: number;
    }>;
    cashReceived?: number;
    changeReturned?: number;
    status: 'draft' | 'held' | 'completed' | 'replaced' | 'partial_replaced';
    createdBy?: mongoose.Types.ObjectId;
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