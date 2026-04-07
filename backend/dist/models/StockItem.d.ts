import mongoose, { Document } from 'mongoose';
export type StockItemStatus = 'available' | 'sold' | 'returned' | 'damaged';
export interface IStockItem extends Document {
    barcode: string;
    product: mongoose.Types.ObjectId;
    size: string;
    incomingPrice?: number;
    sellingPrice?: number;
    stockEntry?: mongoose.Types.ObjectId;
    supplier?: mongoose.Types.ObjectId;
    status: StockItemStatus;
    soldInBill?: mongoose.Types.ObjectId | null;
    returnedInReturn?: mongoose.Types.ObjectId | null;
    createdAt: Date;
}
declare const _default: mongoose.Model<IStockItem, {}, {}, {}, mongoose.Document<unknown, {}, IStockItem, {}, {}> & IStockItem & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=StockItem.d.ts.map