import mongoose, { Schema, Document, Types } from 'mongoose';

export interface INewArrival extends Document {
  product: Types.ObjectId;
  addedAt: Date;
  weekLabel: string;
  isActive: boolean;
  order: number;
}

const NewArrivalSchema = new Schema<INewArrival>(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    addedAt: { type: Date, default: () => new Date() },
    weekLabel: { type: String, default: 'This Week', trim: true },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

NewArrivalSchema.index({ order: 1 });
NewArrivalSchema.index({ product: 1 }, { unique: true });

export default mongoose.model<INewArrival>('NewArrival', NewArrivalSchema);
