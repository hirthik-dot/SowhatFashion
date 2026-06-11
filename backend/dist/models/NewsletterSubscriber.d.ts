import mongoose, { Document } from 'mongoose';
export interface INewsletterSubscriber extends Document {
    email: string;
    source: string;
    subscribedAt: Date;
}
declare const _default: mongoose.Model<INewsletterSubscriber, {}, {}, {}, mongoose.Document<unknown, {}, INewsletterSubscriber, {}, {}> & INewsletterSubscriber & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=NewsletterSubscriber.d.ts.map