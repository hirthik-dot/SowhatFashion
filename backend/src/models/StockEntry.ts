import mongoose, { Document, Schema } from 'mongoose';

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

const StockEntrySchema = new Schema<IStockEntry>(
  {
    supplier: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true },
    category: { type: Schema.Types.ObjectId, ref: 'BillingCategory', required: true },
    subCategory: { type: Schema.Types.ObjectId, ref: 'BillingCategory', required: true },
    productName: { type: String, trim: true, default: '' },
    quantity: { type: Number, required: true, min: 1 },
    incomingPrice: { type: Number, required: true, min: 0 },
    sellingPrice: { type: Number, required: true, min: 0 },
    size: { type: String, trim: true, default: '' },
    gstPercent: { type: Number, default: 5, min: 0 },
    barcodes: [{ type: String, trim: true }],
    stockItemIds: [{ type: Schema.Types.ObjectId, ref: 'StockItem' }],
    productId: { type: Schema.Types.ObjectId, ref: 'Product' },
    productIds: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
    entryDate: { type: Date, default: Date.now },
    enteredBy: { type: Schema.Types.ObjectId, ref: 'BillingAdmin' },
    notes: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

export default mongoose.model<IStockEntry>('StockEntry', StockEntrySchema);
