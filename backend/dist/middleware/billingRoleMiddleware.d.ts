import { NextFunction, Response } from 'express';
import { BillingAuthRequest, BillingAdminPermissions } from './billingAuthMiddleware';
export declare const requireSuperAdmin: (req: BillingAuthRequest, res: Response, next: NextFunction) => void | Response<any, Record<string, any>>;
export declare const requireAdmin: (req: BillingAuthRequest, res: Response, next: NextFunction) => void | Response<any, Record<string, any>>;
export declare const requirePermission: (permission: keyof BillingAdminPermissions) => (req: BillingAuthRequest, res: Response, next: NextFunction) => void | Response<any, Record<string, any>>;
//# sourceMappingURL=billingRoleMiddleware.d.ts.map