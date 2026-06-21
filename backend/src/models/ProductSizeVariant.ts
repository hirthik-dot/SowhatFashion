import mongoose, { Schema, Document } from 'mongoose';

export interface IProductSizeVariant extends Document {
  parentProductId: mongoose.Types.ObjectId;
  slug: string;
  sizeName: string;
  /** E-commerce-only price override — never written to billing StockItem */
  ecommercePrice?: number;
  ecommerceDiscountPrice?: number;
  images: string[];
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSizeVariantSchema = new Schema<IProductSizeVariant>(
  {
    parentProductId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    slug: { type: String, required: true, unique: true, trim: true },
    sizeName: { type: String, required: true, trim: true },
    ecommercePrice: { type: Number, min: 0 },
    ecommerceDiscountPrice: { type: Number, min: 0 },
    images: [{ type: String }],
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

ProductSizeVariantSchema.index({ parentProductId: 1, sizeName: 1 }, { unique: true });
ProductSizeVariantSchema.index({ parentProductId: 1, sortOrder: 1 });

export default mongoose.model<IProductSizeVariant>('ProductSizeVariant', ProductSizeVariantSchema);
