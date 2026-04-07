import mongoose, { Document, Schema } from 'mongoose';
import slugify from 'slugify';

export interface IBillingCategory extends Document {
  name: string;
  slug: string;
  parentCategory: mongoose.Types.ObjectId | null;
  supplier?: mongoose.Types.ObjectId;
  isActive: boolean;
  order: number;
}

const BillingCategorySchema = new Schema<IBillingCategory>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, trim: true },
    parentCategory: { type: Schema.Types.ObjectId, ref: 'BillingCategory', default: null },
    supplier: { type: Schema.Types.ObjectId, ref: 'Supplier' },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

BillingCategorySchema.pre('save', function preSave(next) {
  if (this.isModified('name') || !this.slug) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  next();
});

export default mongoose.model<IBillingCategory>('BillingCategory', BillingCategorySchema);
