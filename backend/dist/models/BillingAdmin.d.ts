import mongoose, { Document } from 'mongoose';
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
declare const _default: mongoose.Model<IBillingAdmin, {}, {}, {}, mongoose.Document<unknown, {}, IBillingAdmin, {}, {}> & IBillingAdmin & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=BillingAdmin.d.ts.map