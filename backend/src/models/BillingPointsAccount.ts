import mongoose, { Document, Schema } from 'mongoose';

export interface IBillingPointsAccount extends Document {
  phone: string;
  customerName: string;
  balance: number;
}

const BillingPointsAccountSchema = new Schema<IBillingPointsAccount>(
  {
    phone: { type: String, required: true, unique: true, trim: true, index: true },
    customerName: { type: String, trim: true, default: '' },
    balance: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

export default mongoose.model<IBillingPointsAccount>('BillingPointsAccount', BillingPointsAccountSchema);
