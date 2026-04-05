import mongoose, { Schema, Document } from 'mongoose';

export interface IOffer extends Document {
  title: string;
  description: string;
  type: 'flash' | 'combo' | 'seasonal';
  image: string;
  discountPercent: number;
  comboDetails: string;
  products: mongoose.Types.ObjectId[];
  startTime: Date;
  endTime: Date;
  isActive: boolean;
  showOnHomepage: boolean;
}

const OfferSchema = new Schema<IOffer>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    type: {
      type: String,
      required: true,
      enum: ['flash', 'combo', 'seasonal'],
    },
    image: { type: String, default: '' },
    discountPercent: { type: Number, default: 0, min: 0, max: 100 },
    comboDetails: { type: String, default: '' },
    products: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
    showOnHomepage: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model<IOffer>('Offer', OfferSchema);
