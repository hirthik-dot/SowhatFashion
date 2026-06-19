import mongoose, { Document, Schema } from 'mongoose';

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

const PendingSettlementSchema = new Schema<IPendingSettlement>(
  {
    phone: { type: String, required: true, trim: true, index: true },
    customerName: { type: String, trim: true, default: '' },
    amount: { type: Number, required: true, min: 0 },
    paymentMethod: { type: String, enum: ['cash', 'gpay', 'upi', 'card'], required: true },
    note: { type: String, trim: true, default: '' },
    allocations: [
      {
        _id: false,
        bill: { type: Schema.Types.ObjectId, ref: 'Bill', required: true },
        billNumber: { type: String, trim: true, required: true },
        amount: { type: Number, required: true, min: 0 },
      },
    ],
    createdBy: { type: Schema.Types.ObjectId, ref: 'BillingAdmin' },
  },
  { timestamps: true }
);

export default mongoose.model<IPendingSettlement>('PendingSettlement', PendingSettlementSchema);
