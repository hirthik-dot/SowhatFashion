import mongoose, { Schema, Document } from 'mongoose';
import slugify from 'slugify';

export interface IProduct extends Document {
  name: string;
  slug: string;
  category: 'tshirt' | 'shirt' | 'pant';
  images: string[];
  price: number;
  discountPrice: number;
  sizes: string[];
  stock: number;
  tags: string[];
  isFeatured: boolean;
  isNewArrival: boolean;
  isActive: boolean;
  createdAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, unique: true },
    category: {
      type: String,
      required: true,
      enum: ['tshirt', 'shirt', 'pant'],
    },
    images: [{ type: String }],
    price: { type: Number, required: true, min: 0 },
    discountPrice: { type: Number, default: 0, min: 0 },
    sizes: [{ type: String, enum: ['S', 'M', 'L', 'XL', 'XXL', 'XXXL'] }],
    stock: { type: Number, required: true, default: 0, min: 0 },
    tags: [{ type: String }],
    isFeatured: { type: Boolean, default: false },
    isNewArrival: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

ProductSchema.pre('save', function (next) {
  if (this.isModified('name') || !this.slug) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  next();
});

export default mongoose.model<IProduct>('Product', ProductSchema);
