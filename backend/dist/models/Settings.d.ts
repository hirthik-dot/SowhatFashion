import mongoose, { Document } from 'mongoose';
export interface HomepageSectionRow {
    id: string;
    label: string;
    isVisible: boolean;
    order: number;
    canDelete: boolean;
}
export type HeroMediaType = 'video' | 'image';
export interface ISettings extends Document {
    activeHomepage: 'allensolly' | 'magazine' | 'catalogue';
    announcementText: string;
    instagramHandle: string;
    freeDeliveryAbove: number;
    whatsappNumber: string;
    heroMediaType: HeroMediaType;
    heroVideoUrl: string;
    heroLinkedProductId: string;
    heroLinkedProductSlug: string;
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
        catalogue: Record<string, unknown>;
    };
}
declare const _default: mongoose.Model<ISettings, {}, {}, {}, mongoose.Document<unknown, {}, ISettings, {}, {}> & ISettings & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=Settings.d.ts.map