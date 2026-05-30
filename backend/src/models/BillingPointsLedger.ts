import mongoose, { Document, Schema } from 'mongoose';

export type PointsLedgerType = 'earn' | 'redeem' | 'adjust' | 'return_clawback';

export interface IBillingPointsLedger extends Document {
  phone: string;
  type: PointsLedgerType;
  points: number;
  rupees?: number;
  bill?: mongoose.Types.ObjectId;
  billNumber?: string;
  balanceAfter: number;
  createdBy?: mongoose.Types.ObjectId;
  note?: string;
}

const BillingPointsLedgerSchema = new Schema<IBillingPointsLedger>(
  {
    phone: { type: String, required: true, trim: true, index: true },
    type: {
      type: String,
      enum: ['earn', 'redeem', 'adjust', 'return_clawback'],
      required: true,
    },
    points: { type: Number, required: true },
    rupees: { type: Number },
    bill: { type: Schema.Types.ObjectId, ref: 'Bill' },
    billNumber: { type: String, trim: true },
    balanceAfter: { type: Number, required: true, min: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'BillingAdmin' },
    note: { type: String, trim: true },
  },
  { timestamps: true }
);

BillingPointsLedgerSchema.index({ phone: 1, createdAt: -1 });

export default mongoose.model<IBillingPointsLedger>('BillingPointsLedger', BillingPointsLedgerSchema);
