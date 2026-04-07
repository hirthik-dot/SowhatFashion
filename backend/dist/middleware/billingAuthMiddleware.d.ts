import { NextFunction, Request, Response } from 'express';
export interface BillingAdminPermissions {
    canBill: boolean;
    canReturn: boolean;
    canManageStock: boolean;
    canViewReports: boolean;
    canViewCustomerReports?: boolean;
    canManageSuppliersCategories?: boolean;
    canManageAdmins: boolean;
    canEditBills: boolean;
    canDiscount: boolean;
    maxDiscountPercent: number;
}
export type BillingRole = 'superadmin' | 'admin' | 'cashier';
export interface BillingAuthRequest extends Request {
    billingAdminId?: string;
    billingAdmin?: any;
    admin?: {
        id: string;
        role: BillingRole;
        permissions: BillingAdminPermissions;
        name?: string;
        email?: string;
    };
}
export declare const billingAuthMiddleware: (req: BillingAuthRequest, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
export declare const requireBillingPermission: (permission: keyof BillingAdminPermissions) => (req: BillingAuthRequest, res: Response, next: NextFunction) => void | Response<any, Record<string, any>>;
//# sourceMappingURL=billingAuthMiddleware.d.ts.map