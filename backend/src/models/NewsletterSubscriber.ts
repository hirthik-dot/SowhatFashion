import mongoose, { Schema, Document } from 'mongoose';

export interface INewsletterSubscriber extends Document {
  email: string;
  source: string;
  subscribedAt: Date;
}

const NewsletterSubscriberSchema = new Schema<INewsletterSubscriber>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    source: { type: String, default: 'inner-circle' },
    subscribedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model<INewsletterSubscriber>('NewsletterSubscriber', NewsletterSubscriberSchema);
