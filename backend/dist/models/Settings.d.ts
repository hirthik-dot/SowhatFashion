import mongoose, { Document } from 'mongoose';
export interface HomepageSectionRow {
    id: string;
    label: string;
    isVisible: boolean;
    order: number;
    canDelete: boolean;
}
export interface ISettings extends Document {
    activeHomepage: 'allensolly' | 'magazine' | 'catalogue';
    announcementText: string;
    instagramHandle: string;
    freeDeliveryAbove: number;
    whatsappNumber: string;
    homepageSections?: {
        catalogue?: HomepageSectionRow[];
        allensolly?: HomepageSectionRow[];
        magazine?: HomepageSectionRow[];
    };
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