import mongoose, { Document, Schema } from 'mongoose';

const ReturnItemSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product' },
    barcode: { type: String, trim: true, default: '' },
    name: { type: String, trim: true, default: '' },
    size: { type: String, trim: true, default: '' },
    quantity: { type: Number, default: 1 },
    sellingPrice: { type: Number, default: 0 },
    reason: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const ReplacementItemSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product' },
    barcode: { type: String, trim: true, default: '' },
    name: { type: String, trim: true, default: '' },
    size: { type: String, trim: true, default: '' },
    quantity: { type: Number, default: 1 },
    mrp: { type: Number, default: 0 },
    itemDiscountType: { type: String, enum: ['percent', 'amount', 'none'], default: 'none' },
    itemDiscountValue: { type: Number, default: 0 },
    itemDiscountAmount: { type: Number, default: 0 },
    billDiscountShare: { type: Number, default: 0 },
    sellingPrice: { type: Number, default: 0 },
    lineTotal: { type: Number, default: 0 },
    netLineTotal: { type: Number, default: 0 },
  },
  { _id: false }
);

export interface IBillingReturn extends Document {
  bill?: mongoose.Types.ObjectId;
  billNumber: string;
  returnNumber: string;
  customer: { name: string; phone?: string };
  returnedItems: any[];
  replacementItems: any[];
  returnType: 'replacement' | 'partial';
  priceDifference: number;
  replacementSubtotal?: number;
  replacementItemDiscount?: number;
  replacementBillDiscount?: number;
  refundAmount: number;
  refundMethod: 'none';
  processedBy?: mongoose.Types.ObjectId;
}

const ReturnSchema = new Schema<IBillingReturn>(
  {
    bill: { type: Schema.Types.ObjectId, ref: 'Bill' },
    billNumber: { type: String, trim: true, default: '' },
    returnNumber: { type: String, unique: true, trim: true },
    customer: {
      name: { type: String, trim: true, default: '' },
      phone: { type: String, trim: true, default: '' },
    },
    returnedItems: [ReturnItemSchema],
    replacementItems: [ReplacementItemSchema],
    returnType: { type: String, enum: ['replacement', 'partial'], required: true },
    priceDifference: { type: Number, default: 0 },
    replacementSubtotal: { type: Number, default: 0 },
    replacementItemDiscount: { type: Number, default: 0 },
    replacementBillDiscount: { type: Number, default: 0 },
    refundAmount: { type: Number, default: 0 },
    refundMethod: { type: String, enum: ['none'], default: 'none' },
    processedBy: { type: Schema.Types.ObjectId, ref: 'BillingAdmin' },
  },
  { timestamps: true }
);

export default mongoose.model<IBillingReturn>('Return', ReturnSchema);
