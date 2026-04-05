import mongoose, { Document } from 'mongoose';
export interface IOffer extends Document {
    title: string;
    description: string;
    type: 'flash' | 'combo' | 'seasonal';
    image: string;
    discountPercent: number;
    comboDetails: string;
    products: mongoose.Types.ObjectId[];
    startTime: Date;
    endTime: Date;
    isActive: boolean;
    showOnHomepage: boolean;
}
declare const _default: mongoose.Model<IOffer, {}, {}, {}, mongoose.Document<unknown, {}, IOffer, {}, {}> & IOffer & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=Offer.d.ts.map