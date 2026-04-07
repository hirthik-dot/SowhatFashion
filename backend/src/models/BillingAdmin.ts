import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

type BillingRole = 'superadmin' | 'admin' | 'cashier';

interface Permissions {
  canBill: boolean;
  canReturn: boolean;
  canManageStock: boolean;
  canViewReports: boolean;
  canViewCustomerReports: boolean;
  canManageSuppliersCategories: boolean;
  canManageAdmins: boolean;
  canEditBills: boolean;
  canDiscount: boolean;
  maxDiscountPercent: number;
}

export interface IBillingAdmin extends Document {
  name: string;
  email: string;
  password: string;
  role: BillingRole;
  createdBy?: mongoose.Types.ObjectId;
  permissions: Permissions;
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  comparePassword: (password: string) => Promise<boolean>;
}

const BillingAdminSchema = new Schema<IBillingAdmin>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    password: { type: String, required: true, minlength: 6 },
    role: { type: String, enum: ['superadmin', 'admin', 'cashier'], default: 'cashier' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'BillingAdmin' },
    permissions: {
      canBill: { type: Boolean, default: true },
      canReturn: { type: Boolean, default: false },
      canManageStock: { type: Boolean, default: false },
      canViewReports: { type: Boolean, default: false },
      canViewCustomerReports: { type: Boolean, default: false },
      canManageSuppliersCategories: { type: Boolean, default: false },
      canManageAdmins: { type: Boolean, default: false },
      canEditBills: { type: Boolean, default: false },
      canDiscount: { type: Boolean, default: true },
      maxDiscountPercent: { type: Number, default: 5 },
    },
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date },
  },
  { timestamps: true }
);

BillingAdminSchema.pre('save', async function preSave(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

BillingAdminSchema.methods.comparePassword = async function comparePassword(password: string) {
  return bcrypt.compare(password, this.password);
};

export default mongoose.model<IBillingAdmin>('BillingAdmin', BillingAdminSchema);
