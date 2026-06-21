import mongoose, { Schema, Document } from 'mongoose';
import slugify from 'slugify';

export interface IProductVariant extends Document {
  parentProductId: mongoose.Types.ObjectId;
  /** When set, this color belongs to a specific size variant page */
  sizeVariantId?: mongoose.Types.ObjectId;
  slug: string;
  colorName: string;
  colorHex: string;
  images: string[];
  price?: number;
  discountPrice?: number;
  stock?: number;
  sku?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ProductVariantSchema = new Schema<IProductVariant>(
  {
    parentProductId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    sizeVariantId: { type: Schema.Types.ObjectId, ref: 'ProductSizeVariant', index: true },
    slug: { type: String, required: true, unique: true, trim: true },
    colorName: { type: String, required: true, trim: true },
    colorHex: { type: String, default: '#000000', trim: true },
    images: [{ type: String }],
    price: { type: Number, min: 0 },
    discountPrice: { type: Number, min: 0 },
    stock: { type: Number, min: 0 },
    sku: { type: String, trim: true, default: '' },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

ProductVariantSchema.index({ parentProductId: 1, sortOrder: 1 });
ProductVariantSchema.index({ sizeVariantId: 1, sortOrder: 1 });

ProductVariantSchema.pre('validate', function (next) {
  if (!this.slug && this.colorName) {
    this.slug = slugify(this.colorName, { lower: true, strict: true });
  }
  next();
});

export default mongoose.model<IProductVariant>('ProductVariant', ProductVariantSchema);
