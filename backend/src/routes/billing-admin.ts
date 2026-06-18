import express, { Response } from 'express';
import mongoose from 'mongoose';
import BillingAdmin from '../models/BillingAdmin';
import Bill from '../models/Bill';
import BillingReturn from '../models/Return';
import StockEntry from '../models/StockEntry';
import Salesman from '../models/Salesman';
import { BillingAuthRequest } from '../middleware/billingAuthMiddleware';
import { requirePermission } from '../middleware/billingRoleMiddleware';

const router = express.Router();

const normalizePermissions = (role: string, incoming: any = {}) => {
  if (role === 'superadmin') {
    return {
      canBill: true,
      canReturn: true,
      canManageStock: true,
      canViewReports: true,
      canViewCustomerReports: true,
      canManageSuppliersCategories: true,
      canManageAdmins: true,
      canEditBills: true,
      canDiscount: true,
      maxDiscountPercent: 100,
    };
  }
  if (role === 'admin') {
    return {
      canBill: true,
      canReturn: Boolean(incoming.canReturn ?? true),
      canManageStock: Boolean(incoming.canManageStock ?? true),
      canViewReports: Boolean(incoming.canViewReports ?? true),
      canViewCustomerReports: Boolean(incoming.canViewCustomerReports ?? true),
      canManageSuppliersCategories: Boolean(incoming.canManageSuppliersCategories ?? true),
      canManageAdmins: Boolean(incoming.canManageAdmins ?? true),
      canEditBills: Boolean(incoming.canEditBills ?? true),
      canDiscount: Boolean(incoming.canDiscount ?? true),
      maxDiscountPercent: Math.min(100, Math.max(0, Number(incoming.maxDiscountPercent ?? 25))),
    };
  }
  return {
    canBill: true,
    canReturn: Boolean(incoming.canReturn ?? false),
    canManageStock: Boolean(incoming.canManageStock ?? false),
    canViewReports: Boolean(incoming.canViewReports ?? false),
    canViewCustomerReports: Boolean(incoming.canViewCustomerReports ?? false),
    canManageSuppliersCategories: Boolean(incoming.canManageSuppliersCategories ?? false),
    canManageAdmins: Boolean(incoming.canManageAdmins ?? false),
    canEditBills: Boolean(incoming.canEditBills ?? false),
    canDiscount: Boolean(incoming.canDiscount ?? true),
    maxDiscountPercent: Math.min(100, Math.max(0, Number(incoming.maxDiscountPercent ?? 5))),
  };
};

router.get('/admins', requirePermission('canManageAdmins'), async (_req, res: Response) => {
  const admins = await BillingAdmin.find({}).select('-password').sort({ createdAt: -1 });
  res.json(admins);
});

router.get('/admins/:id/records/summary', requirePermission('canManageAdmins'), async (req, res: Response) => {
  const staffId = req.params.id;
  if (!mongoose.Types.ObjectId.isValid(staffId)) {
    return res.status(400).json({ message: 'Invalid staff id' });
  }

  const staff = await BillingAdmin.findById(staffId).select('-password').lean();
  if (!staff) return res.status(404).json({ message: 'Staff not found' });

  const staffObjectId = new mongoose.Types.ObjectId(staffId);
  const billQuery = {
    createdBy: staffObjectId,
    status: { $in: ['completed', 'replaced', 'partial_replaced'] },
  };
  const returnQuery = { processedBy: staffObjectId };
  const stockQuery = { enteredBy: staffObjectId };

  const [billCount, billRevenueAgg, returnCount, stockCount, lastBill, lastReturn, lastStock] = await Promise.all([
    Bill.countDocuments(billQuery),
    Bill.aggregate([{ $match: billQuery }, { $group: { _id: null, total: { $sum: '$totalAmount' } } }]),
    BillingReturn.countDocuments(returnQuery),
    StockEntry.countDocuments(stockQuery),
    Bill.findOne(billQuery).sort({ createdAt: -1 }).select('createdAt').lean(),
    BillingReturn.findOne(returnQuery).sort({ createdAt: -1 }).select('createdAt').lean(),
    StockEntry.findOne(stockQuery).sort({ createdAt: -1 }).select('createdAt').lean(),
  ]);

  const activityDates = [lastBill?.createdAt, lastReturn?.createdAt, lastStock?.createdAt]
    .filter(Boolean)
    .map((date) => new Date(date as Date).getTime());
  const lastActivity = activityDates.length ? new Date(Math.max(...activityDates)) : null;

  return res.json({
    staff,
    bills: { count: billCount, revenue: billRevenueAgg[0]?.total || 0 },
    returns: { count: returnCount },
    stockEntries: { count: stockCount },
    lastActivity,
  });
});

router.post('/admins', requirePermission('canManageAdmins'), async (req: BillingAuthRequest, res: Response) => {
  const payload = req.body || {};
  if (req.billingAdmin?.role !== 'superadmin' && payload.role === 'superadmin') {
    return res.status(403).json({ message: 'Only superadmin can create superadmin' });
  }
  if (req.billingAdmin?.role === 'admin' && payload.role === 'admin') {
    return res.status(403).json({ message: 'Admin can only create cashier staff' });
  }
  const normalizedPermissions = normalizePermissions(payload.role || 'cashier', payload.permissions || {});
  if (req.billingAdmin?.role === 'admin') {
    const ownPermissions = req.billingAdmin?.permissions || {};
    for (const key of Object.keys(normalizedPermissions) as Array<keyof typeof normalizedPermissions>) {
      if (key === 'maxDiscountPercent') {
        if (Number(normalizedPermissions.maxDiscountPercent) > Number(ownPermissions.maxDiscountPercent || 0)) {
          return res.status(403).json({ message: 'Cannot assign higher discount permission than your own' });
        }
        continue;
      }
      if (normalizedPermissions[key] && !ownPermissions[key]) {
        return res.status(403).json({ message: `Cannot assign permission you do not have: ${key}` });
      }
    }
  }
  const admin = await BillingAdmin.create({
    ...payload,
    permissions: normalizedPermissions,
    createdBy: req.billingAdminId,
  });
  return res.status(201).json({ ...admin.toObject(), password: undefined });
});

router.put('/admins/:id', requirePermission('canManageAdmins'), async (req: BillingAuthRequest, res: Response) => {
  const update = { ...(req.body || {}) };
  if (req.billingAdmin?.role !== 'superadmin' && update.role === 'superadmin') {
    return res.status(403).json({ message: 'Only superadmin can assign superadmin role' });
  }
  const existing = await BillingAdmin.findById(req.params.id);
  if (!existing) return res.status(404).json({ message: 'Admin not found' });

  if (update.permissions) {
    const role = update.role || existing.role;
    update.permissions = normalizePermissions(role, update.permissions);
    if (req.billingAdmin?.role === 'admin') {
      const ownPermissions = req.billingAdmin?.permissions || {};
      for (const key of Object.keys(update.permissions) as Array<keyof typeof update.permissions>) {
        if (key === 'maxDiscountPercent') {
          if (Number(update.permissions.maxDiscountPercent) > Number(ownPermissions.maxDiscountPercent || 0)) {
            return res.status(403).json({ message: 'Cannot assign higher discount permission than your own' });
          }
          continue;
        }
        if (update.permissions[key] && !ownPermissions[key]) {
          return res.status(403).json({
            message: `Cannot assign permission you do not have: ${String(key)}`,
          });
        }
      }
    }
  }
  delete (update as any).password;
  const admin = await BillingAdmin.findByIdAndUpdate(req.params.id, update, { new: true }).select('-password');
  if (!admin) return res.status(404).json({ message: 'Admin not found' });
  return res.json(admin);
});

router.delete('/admins/:id', requirePermission('canManageAdmins'), async (req: BillingAuthRequest, res: Response) => {
  const existing = await BillingAdmin.findById(req.params.id);
  if (!existing) return res.status(404).json({ message: 'Admin not found' });

  if (String(existing._id) === String(req.billingAdminId)) {
    return res.status(403).json({ message: 'You cannot change your own status' });
  }
  if (existing.role === 'superadmin' && req.billingAdmin?.role !== 'superadmin') {
    return res.status(403).json({ message: 'Only superadmin can change superadmin status' });
  }

  const admin = await BillingAdmin.findByIdAndUpdate(
    req.params.id,
    { isActive: !existing.isActive },
    { new: true }
  ).select('-password');

  return res.json({
    message: admin?.isActive ? 'Admin activated' : 'Admin deactivated',
    admin,
  });
});

// Read-only list for billing/history dropdowns — any authenticated billing user.
router.get('/salesmen', async (_req, res: Response) => {
  const salesmen = await Salesman.find({ isActive: true }).sort({ createdAt: -1 });
  res.json(salesmen);
});

router.post('/salesmen', requirePermission('canManageAdmins'), async (req, res: Response) => {
  const salesman = await Salesman.create(req.body || {});
  res.status(201).json(salesman);
});

router.put('/salesmen/:id', requirePermission('canManageAdmins'), async (req, res: Response) => {
  const salesman = await Salesman.findByIdAndUpdate(req.params.id, req.body || {}, { new: true });
  if (!salesman) return res.status(404).json({ message: 'Salesman not found' });
  res.json(salesman);
});

router.delete('/salesmen/:id', requirePermission('canManageAdmins'), async (req, res: Response) => {
  const salesman = await Salesman.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!salesman) return res.status(404).json({ message: 'Salesman not found' });
  res.json({ message: 'Salesman deactivated' });
});

export default router;
