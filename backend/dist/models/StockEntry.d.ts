import mongoose, { Document } from 'mongoose';
export interface IStockEntry extends Document {
    supplier: mongoose.Types.ObjectId;
    category: mongoose.Types.ObjectId;
    subCategory: mongoose.Types.ObjectId;
    productName?: string;
    quantity: number;
    incomingPrice: number;
    sellingPrice: number;
    size?: string;
    gstPercent: number;
    barcodes: string[];
    stockItemIds?: mongoose.Types.ObjectId[];
    productId?: mongoose.Types.ObjectId;
    productIds: mongoose.Types.ObjectId[];
    entryDate: Date;
    enteredBy?: mongoose.Types.ObjectId;
    notes?: string;
}
declare const _default: mongoose.Model<IStockEntry, {}, {}, {}, mongoose.Document<unknown, {}, IStockEntry, {}, {}> & IStockEntry & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=StockEntry.d.ts.map