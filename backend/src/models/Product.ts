import mongoose, { Schema, Document } from 'mongoose';
import slugify from 'slugify';
import SidebarConfig from './SidebarConfig';
import { mergeFilterTags, type FilterTagsMap } from '../lib/productFilterTags';

export interface IProductColor {
  name: string;
  hex: string;
  imageIndex?: number;
}

export interface IProduct extends Document {
  name: string;
  billingName?: string;
  slug: string;
  category: string;
  subCategory: string;
  images: string[];
  colors?: IProductColor[];
  price: number;
  discountPrice: number;
  sizes: string[];
  stock: number;
  tags: string[];
  /** Admin-assigned shop filter values keyed by filterKey (e.g. fit, fabric). Auto-filled on save when empty. */
  filterTags?: Map<string, string[]> | Record<string, string[]>;
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
  notes?: string;
  isEcommerceProduct?: boolean;
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
    colors: [
      {
        name: { type: String, required: true, trim: true },
        hex: { type: String, required: true, trim: true },
        imageIndex: { type: Number, min: 0 },
      },
    ],
    price: { type: Number, required: true, min: 0 },
    discountPrice: { type: Number, default: 0, min: 0 },
    sizes: [{ type: String, trim: true }],
    stock: { type: Number, required: true, default: 0, min: 0 },
    tags: [{ type: String }],
    filterTags: {
      type: Map,
      of: [String],
      default: {},
    },
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
    isEcommerceProduct: { type: Boolean, default: true, index: true },
    notes: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

ProductSchema.pre('save', function (next) {
  if (!this.slug || (this.isModified('name') && !this.isModified('slug'))) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  next();
});

ProductSchema.pre('save', async function (next) {
  try {
    const relevant =
      this.isNew ||
      this.isModified('category') ||
      this.isModified('subCategory') ||
      this.isModified('sizes') ||
      this.isModified('tags') ||
      this.isModified('price') ||
      this.isModified('discountPrice') ||
      this.isModified('isNewArrival') ||
      this.isModified('isFeatured') ||
      this.isModified('colors') ||
      this.isModified('filterTags');

    if (!relevant) return next();

    const config = await SidebarConfig.findOne();
    const manual: FilterTagsMap = {};
    if (this.filterTags instanceof Map) {
      this.filterTags.forEach((v, k) => {
        if (Array.isArray(v) && v.length) manual[k] = v.map(String);
      });
    }

    const merged = mergeFilterTags(
      {
        category: this.category,
        subCategory: this.subCategory,
        sizes: this.sizes,
        tags: this.tags,
        price: this.price,
        discountPrice: this.discountPrice,
        isNewArrival: this.isNewArrival,
        isFeatured: this.isFeatured,
        colors: this.colors,
      },
      manual,
      config?.filters || []
    );

    this.set(
      'filterTags',
      new Map(Object.entries(merged).filter(([, v]) => Array.isArray(v) && v.length > 0) as [string, string[]][])
    );
    next();
  } catch (err) {
    next(err as Error);
  }
});

export default mongoose.model<IProduct>('Product', ProductSchema);
