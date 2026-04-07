import mongoose, { Schema, Document } from 'mongoose';
import slugify from 'slugify';

export interface IProduct extends Document {
  name: string;
  billingName?: string;
  slug: string;
  category: string;
  subCategory: string;
  images: string[];
  price: number;
  discountPrice: number;
  sizes: string[];
  stock: number;
  tags: string[];
  isFeatured: boolean;
  isNewArrival: boolean;
  isActive: boolean;
  barcode?: string;
  sku?: string;
  incomingPrice?: number;
  supplier?: mongoose.Types.ObjectId;
  billingCategory?: mongoose.Types.ObjectId;
  billingSubCategory?: mongoose.Types.ObjectId;
  sizeStock?: { size: string; stock: number }[];
  totalStock?: number;
  isBillingProduct?: boolean;
  createdAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true },
    billingName: { type: String, trim: true, default: '' },
    slug: { type: String, unique: true },
    category: {
      type: String,
      required: true,
    },
    subCategory: { type: String, default: '' },
    images: [{ type: String }],
    price: { type: Number, required: true, min: 0 },
    discountPrice: { type: Number, default: 0, min: 0 },
    sizes: [{ type: String, trim: true }],
    stock: { type: Number, required: true, default: 0, min: 0 },
    tags: [{ type: String }],
    isFeatured: { type: Boolean, default: false },
    isNewArrival: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    barcode: { type: String, unique: true, sparse: true, trim: true },
    sku: { type: String, trim: true, default: '' },
    incomingPrice: { type: Number, min: 0, default: 0 },
    supplier: { type: Schema.Types.ObjectId, ref: 'Supplier' },
    billingCategory: { type: Schema.Types.ObjectId, ref: 'BillingCategory' },
    billingSubCategory: { type: Schema.Types.ObjectId, ref: 'BillingCategory' },
    sizeStock: [
      {
        size: { type: String, required: true, trim: true },
        stock: { type: Number, required: true, min: 0, default: 0 },
      },
    ],
    totalStock: { type: Number, min: 0, default: 0 },
    isBillingProduct: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

ProductSchema.pre('save', function (next) {
  if (!this.slug || (this.isModified('name') && !this.isModified('slug'))) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  next();
});

export default mongoose.model<IProduct>('Product', ProductSchema);
