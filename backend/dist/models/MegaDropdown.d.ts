import mongoose, { Document } from 'mongoose';
export interface IMegaDropdownItem {
    label: string;
    filterKey: string;
    filterValue: string;
}
export interface IMegaDropdownColumn {
    header: string;
    items: IMegaDropdownItem[];
}
export interface IMegaDropdown extends Document {
    category: string;
    columns: IMegaDropdownColumn[];
    updatedAt: Date;
}
declare const _default: mongoose.Model<IMegaDropdown, {}, {}, {}, mongoose.Document<unknown, {}, IMegaDropdown, {}, {}> & IMegaDropdown & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=MegaDropdown.d.ts.map