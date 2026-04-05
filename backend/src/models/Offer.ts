import mongoose, { Schema, Document, Types } from 'mongoose';
import slugify from 'slugify';

export type CarouselTemplate = 'fullbleed' | 'splitcard' | 'spotlight';

export interface IOffer extends Document {
  title: string;
  slug: string;
  subtitle: string;
  description: string;
  /** Legacy — Allen Solly / magazine homepages */
  type: 'flash' | 'combo' | 'seasonal';
  carouselTemplate: CarouselTemplate;
  image: string;
  backgroundImage: string;
  accentColor: string;
  discountPercent: number;
  discountLabel: string;
  /** Legacy combo text */
  comboDetails: string;
  ctaText: string;
  products: Types.ObjectId[];
  startTime: Date;
  endTime: Date | null;
  hasCountdown: boolean;
  isActive: boolean;
  showOnCarousel: boolean;
  /** Legacy homepage flag */
  showOnHomepage: boolean;
  order: number;
}

async function ensureUniqueSlug(title: string, excludeId?: Types.ObjectId): Promise<string> {
  let base = slugify(title || 'offer', { lower: true, strict: true }) || 'offer';
  let slug = base;
  let n = 1;
  const Model = mongoose.model<IOffer>('Offer');
  while (true) {
    const q: Record<string, unknown> = { slug };
    if (excludeId) q._id = { $ne: excludeId };
    const exists = await Model.findOne(q);
    if (!exists) return slug;
    slug = `${base}-${n++}`;
  }
}

const OfferSchema = new Schema<IOffer>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, sparse: true, trim: true },
    subtitle: { type: String, default: '' },
    description: { type: String, default: '' },
    type: {
      type: String,
      enum: ['flash', 'combo', 'seasonal'],
      default: 'flash',
    },
    carouselTemplate: {
      type: String,
      enum: ['fullbleed', 'splitcard', 'spotlight'],
      default: 'fullbleed',
    },
    image: { type: String, default: '' },
    backgroundImage: { type: String, default: '' },
    accentColor: { type: String, default: '' },
    discountPercent: { type: Number, default: 0, min: 0, max: 100 },
    discountLabel: { type: String, default: '' },
    comboDetails: { type: String, default: '' },
    ctaText: { type: String, default: 'SHOP NOW' },
    products: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
    startTime: { type: Date, required: true },
    endTime: { type: Date, default: null },
    hasCountdown: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
    showOnCarousel: { type: Boolean, default: false },
    showOnHomepage: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

OfferSchema.pre('save', async function (next) {
  if (this.isModified('title') || !this.slug) {
    try {
      this.slug = await ensureUniqueSlug(this.title, this._id as Types.ObjectId);
    } catch (e) {
      return next(e as Error);
    }
  }
  next();
});

export default mongoose.model<IOffer>('Offer', OfferSchema);
