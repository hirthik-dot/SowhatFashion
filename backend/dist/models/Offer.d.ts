import mongoose, { Document, Types } from 'mongoose';
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
declare const _default: mongoose.Model<IOffer, {}, {}, {}, mongoose.Document<unknown, {}, IOffer, {}, {}> & IOffer & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=Offer.d.ts.map