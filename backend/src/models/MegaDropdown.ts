import mongoose, { Schema, Document } from 'mongoose';

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

const MegaDropdownSchema = new Schema<IMegaDropdown>(
  {
    category: {
      type: String,
      required: true,
      unique: true,
      enum: ['tshirts', 'shirts', 'pants', 'offers', 'sale'],
    },
    columns: [
      {
        header: { type: String, required: true },
        items: [
          {
            label: { type: String, required: true },
            filterKey: { type: String, required: true },
            filterValue: { type: String, required: true },
          },
        ],
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model<IMegaDropdown>('MegaDropdown', MegaDropdownSchema);
