import mongoose, { Document } from 'mongoose';
export interface ISettings extends Document {
    activeHomepage: 'allensolly' | 'magazine' | 'catalogue';
    announcementText: string;
    instagramHandle: string;
    freeDeliveryAbove: number;
    whatsappNumber: string;
    placeholders: {
        allensolly: {
            heroImage: string;
            categoryTshirt: string;
            categoryShirt: string;
            categoryPant: string;
            instagramImages: string[];
        };
        magazine: {
            heroImage: string;
            curatedStaplesImage: string;
        };
        catalogue: {
            carouselImages: string[];
        };
    };
}
declare const _default: mongoose.Model<ISettings, {}, {}, {}, mongoose.Document<unknown, {}, ISettings, {}, {}> & ISettings & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=Settings.d.ts.map