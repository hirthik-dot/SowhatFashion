import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import BillingAdmin from '../models/BillingAdmin';

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

interface BillingJwtPayload {
  id: string;
  role?: BillingRole;
  permissions?: BillingAdminPermissions;
}

export const billingAuthMiddleware = async (
  req: BillingAuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.cookies?.billing_token;
    if (!token) {
      return res.status(401).json({ message: 'Billing authentication required' });
    }

    const decoded = jwt.verify(
      token,
      process.env.BILLING_JWT_SECRET as string
    ) as BillingJwtPayload;
    const admin = await BillingAdmin.findById(decoded.id).select('-password');
    if (!admin || !admin.isActive) {
      return res.status(401).json({ message: 'Invalid billing session' });
    }

    req.billingAdminId = admin._id.toString();
    req.billingAdmin = admin;
    req.admin = {
      id: admin._id.toString(),
      role: admin.role,
      permissions: admin.permissions as BillingAdminPermissions,
      name: admin.name,
      email: admin.email,
    };
    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired billing token' });
  }
};

export const requireBillingPermission = (permission: keyof BillingAdminPermissions) => {
  return (req: BillingAuthRequest, res: Response, next: NextFunction) => {
    if (req.billingAdmin?.role === 'superadmin') return next();
    const permissions = req.billingAdmin?.permissions || {};
    if (!permissions[permission]) {
      return res.status(403).json({ message: 'Permission denied' });
    }
    return next();
  };
};
