import mongoose, { Document, Schema } from 'mongoose';

export interface ISalesman extends Document {
  name: string;
  phone?: string;
  isActive: boolean;
  createdAt: Date;
}

const SalesmanSchema = new Schema<ISalesman>(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model<ISalesman>('Salesman', SalesmanSchema);
