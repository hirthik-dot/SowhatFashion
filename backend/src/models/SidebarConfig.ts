import mongoose, { Schema, Document } from 'mongoose';

export interface ISidebarFilterOption {
  label: string;
  value: string;
  count?: number;
}

export interface ISidebarRangeConfig {
  min: number;
  max: number;
  step: number;
  prefix: string;
}

export interface ISidebarFilter {
  id: string;
  label: string;
  type: 'range_slider' | 'checkbox_list' | 'radio_list';
  filterKey: string;
  isVisible: boolean;
  order: number;
  options?: ISidebarFilterOption[];
  rangeConfig?: ISidebarRangeConfig;
}

export interface ISidebarConfig extends Document {
  filters: ISidebarFilter[];
  updatedAt: Date;
}

const SidebarConfigSchema = new Schema<ISidebarConfig>(
  {
    filters: [
      {
        id: { type: String, required: true },
        label: { type: String, required: true },
        type: {
          type: String,
          required: true,
          enum: ['range_slider', 'checkbox_list', 'radio_list'],
        },
        filterKey: { type: String, required: true },
        isVisible: { type: Boolean, default: true },
        order: { type: Number, default: 0 },
        options: [
          {
            label: { type: String },
            value: { type: String },
            count: { type: Number, default: 0 },
          },
        ],
        rangeConfig: {
          min: { type: Number },
          max: { type: Number },
          step: { type: Number, default: 1 },
          prefix: { type: String, default: '₹' },
        },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model<ISidebarConfig>('SidebarConfig', SidebarConfigSchema);
