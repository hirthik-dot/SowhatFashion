import mongoose, { Document, Schema } from 'mongoose';

const ItemSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product' },
    barcode: { type: String, trim: true, default: '' },
    name: { type: String, trim: true, default: '' },
    category: { type: String, trim: true, default: '' },
    size: { type: String, trim: true, default: '' },
    mrp: { type: Number, default: 0 },
    itemDiscountType: { type: String, enum: ['percent', 'amount', 'none'], default: 'none' },
    itemDiscountValue: { type: Number, default: 0 },
    itemDiscountAmount: { type: Number, default: 0 },
    sellingPrice: { type: Number, default: 0 },
    quantity: { type: Number, default: 1, min: 1 },
    gstPercent: { type: Number, default: 5 },
    lineTotal: { type: Number, default: 0 },
  },
  { _id: false }
);

export interface IBill extends Document {
  billNumber: string;
  customer: { name: string; phone?: string };
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
  paymentBreakdown?: Array<{ method: 'cash' | 'gpay' | 'upi' | 'card'; amount: number }>;
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

const BillSchema = new Schema<IBill>(
  {
    billNumber: { type: String, unique: true, sparse: true, trim: true },
    customer: {
      name: { type: String, trim: true, default: '' },
      phone: { type: String, trim: true, default: '' },
    },
    salesman: { type: Schema.Types.ObjectId, ref: 'Salesman' },
    items: [ItemSchema],
    subtotal: { type: Number, required: true, default: 0 },
    totalItemDiscount: { type: Number, default: 0 },
    billDiscountType: { type: String, enum: ['percent', 'amount', 'none'], default: 'none' },
    billDiscountValue: { type: Number, default: 0 },
    billDiscountAmount: { type: Number, default: 0 },
    taxableAmount: { type: Number, default: 0 },
    gstAmount: { type: Number, default: 0 },
    cgst: { type: Number, default: 0 },
    sgst: { type: Number, default: 0 },
    roundOff: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },
    paymentMethod: { type: String, enum: ['cash', 'gpay', 'upi', 'card', 'partial'], default: 'cash' },
    paymentBreakdown: [
      {
        _id: false,
        method: { type: String, enum: ['cash', 'gpay', 'upi', 'card'], required: true },
        amount: { type: Number, required: true, min: 0 },
      },
    ],
    cashReceived: { type: Number, default: 0 },
    changeReturned: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['draft', 'held', 'completed', 'replaced', 'partial_replaced'],
      default: 'draft',
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'BillingAdmin' },
    completedAt: { type: Date },
    editHistory: [
      {
        _id: false,
        editedAt: { type: Date, required: true, default: Date.now },
        editedBy: { type: Schema.Types.ObjectId, ref: 'BillingAdmin' },
        editReason: { type: String, required: true, trim: true },
        previousTotal: { type: Number, required: true, default: 0 },
        newTotal: { type: Number, required: true, default: 0 },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model<IBill>('Bill', BillSchema);
