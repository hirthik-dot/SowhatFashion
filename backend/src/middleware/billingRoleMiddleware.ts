import { NextFunction, Response } from 'express';
import { BillingAuthRequest, BillingAdminPermissions } from './billingAuthMiddleware';

export const requireSuperAdmin = (req: BillingAuthRequest, res: Response, next: NextFunction) => {
  if (req.billingAdmin?.role !== 'superadmin') {
    return res.status(403).json({ message: 'Superadmin access required' });
  }
  return next();
};

export const requireAdmin = (req: BillingAuthRequest, res: Response, next: NextFunction) => {
  const role = req.billingAdmin?.role;
  if (!['superadmin', 'admin'].includes(role)) {
    return res.status(403).json({ message: 'Admin access required' });
  }
  return next();
};

export const requirePermission = (permission: keyof BillingAdminPermissions) => {
  return (req: BillingAuthRequest, res: Response, next: NextFunction) => {
    if (req.billingAdmin?.role === 'superadmin') return next();
    if (!req.billingAdmin?.permissions?.[permission]) {
      return res.status(403).json({ message: `Permission denied: ${String(permission)}` });
    }
    return next();
  };
};
