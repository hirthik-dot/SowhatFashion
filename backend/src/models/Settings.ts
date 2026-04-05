import mongoose, { Schema, Document } from 'mongoose';

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

const SettingsSchema = new Schema<ISettings>(
  {
    activeHomepage: {
      type: String,
      enum: ['allensolly', 'magazine', 'catalogue'],
      default: 'allensolly',
    },
    announcementText: {
      type: String,
      default: 'FREE DELIVERY ABOVE ₹999 | SALE UP TO 50% OFF',
    },
    instagramHandle: { type: String, default: '@sowaatmenswear' },
    freeDeliveryAbove: { type: Number, default: 999 },
    whatsappNumber: { type: String, default: '+919876543210' },
    placeholders: {
      allensolly: {
        heroImage: { type: String, default: '' },
        categoryTshirt: { type: String, default: '' },
        categoryShirt: { type: String, default: '' },
        categoryPant: { type: String, default: '' },
        instagramImages: { type: [String], default: [] },
      },
      magazine: {
        heroImage: { type: String, default: '' },
        curatedStaplesImage: { type: String, default: '' },
      },
      catalogue: {
        carouselImages: { type: [String], default: [] },
      },
    },
    homepageSections: {
      catalogue: [
        {
          id: String,
          label: String,
          isVisible: Boolean,
          order: Number,
          canDelete: Boolean,
        },
      ],
      allensolly: [
        {
          id: String,
          label: String,
          isVisible: Boolean,
          order: Number,
          canDelete: Boolean,
        },
      ],
      magazine: [
        {
          id: String,
          label: String,
          isVisible: Boolean,
          order: Number,
          canDelete: Boolean,
        },
      ],
    },
  },
  { timestamps: true }
);

export default mongoose.model<ISettings>('Settings', SettingsSchema);
