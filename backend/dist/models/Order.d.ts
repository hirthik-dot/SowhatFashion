import mongoose, { Document } from 'mongoose';
export interface IOrderItem {
    product: mongoose.Types.ObjectId;
    name: string;
    image: string;
    size: string;
    quantity: number;
    price: number;
}
export interface IOrder extends Document {
    customer: {
        name: string;
        email: string;
        phone: string;
        address: {
            line1: string;
            city: string;
            state: string;
            pincode: string;
        };
    };
    items: IOrderItem[];
    totalAmount: number;
    razorpayOrderId: string;
    razorpayPaymentId: string;
    paymentStatus: 'pending' | 'paid' | 'failed';
    orderStatus: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
    createdAt: Date;
}
declare const _default: mongoose.Model<IOrder, {}, {}, {}, mongoose.Document<unknown, {}, IOrder, {}, {}> & IOrder & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=Order.d.ts.map