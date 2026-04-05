import mongoose, { Document } from 'mongoose';
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
declare const _default: mongoose.Model<ISidebarConfig, {}, {}, {}, mongoose.Document<unknown, {}, ISidebarConfig, {}, {}> & ISidebarConfig & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=SidebarConfig.d.ts.map