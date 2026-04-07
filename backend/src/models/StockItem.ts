import mongoose, { Document, Schema } from 'mongoose';

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

const StockItemSchema = new Schema<IStockItem>(
  {
    barcode: { type: String, required: true, unique: true, index: true, trim: true },
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    size: { type: String, required: true, trim: true },
    incomingPrice: { type: Number, min: 0, default: 0 },
    sellingPrice: { type: Number, min: 0, default: 0 },
    stockEntry: { type: Schema.Types.ObjectId, ref: 'StockEntry' },
    supplier: { type: Schema.Types.ObjectId, ref: 'Supplier' },
    status: {
      type: String,
      enum: ['available', 'sold', 'returned', 'damaged'],
      default: 'available',
      index: true,
    },
    soldInBill: { type: Schema.Types.ObjectId, ref: 'Bill', default: null },
    returnedInReturn: { type: Schema.Types.ObjectId, ref: 'Return', default: null },
  },
  { timestamps: true }
);

StockItemSchema.index({ barcode: 1 });
StockItemSchema.index({ product: 1 });
StockItemSchema.index({ status: 1 });

export default mongoose.model<IStockItem>('StockItem', StockItemSchema);
