import express, { Response } from 'express';
import BillingAdmin from '../models/BillingAdmin';
import Salesman from '../models/Salesman';
import { BillingAuthRequest } from '../middleware/billingAuthMiddleware';
import { requireAdmin, requirePermission, requireSuperAdmin } from '../middleware/billingRoleMiddleware';

const router = express.Router();
router.use(requireAdmin);

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
    canManageStock: false,
    canViewReports: false,
    canViewCustomerReports: false,
    canManageSuppliersCategories: false,
    canManageAdmins: false,
    canEditBills: false,
    canDiscount: Boolean(incoming.canDiscount ?? true),
    maxDiscountPercent: Math.min(10, Math.max(0, Number(incoming.maxDiscountPercent ?? 5))),
  };
};

router.get('/admins', async (_req, res: Response) => {
  const admins = await BillingAdmin.find({}).select('-password').sort({ createdAt: -1 });
  res.json(admins);
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
  if (update.permissions) {
    update.permissions = normalizePermissions(update.role || 'cashier', update.permissions);
  }
  delete (update as any).password;
  const admin = await BillingAdmin.findByIdAndUpdate(req.params.id, update, { new: true }).select('-password');
  if (!admin) return res.status(404).json({ message: 'Admin not found' });
  return res.json(admin);
});

router.delete('/admins/:id', requireSuperAdmin, async (req, res: Response) => {
  const admin = await BillingAdmin.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true }).select('-password');
  if (!admin) return res.status(404).json({ message: 'Admin not found' });
  return res.json({ message: 'Admin deactivated' });
});

router.get('/salesmen', async (_req, res: Response) => {
  const salesmen = await Salesman.find({ isActive: true }).sort({ createdAt: -1 });
  res.json(salesmen);
});

router.post('/salesmen', requireAdmin, async (req, res: Response) => {
  const salesman = await Salesman.create(req.body || {});
  res.status(201).json(salesman);
});

router.put('/salesmen/:id', requireAdmin, async (req, res: Response) => {
  const salesman = await Salesman.findByIdAndUpdate(req.params.id, req.body || {}, { new: true });
  if (!salesman) return res.status(404).json({ message: 'Salesman not found' });
  res.json(salesman);
});

router.delete('/salesmen/:id', requireAdmin, async (req, res: Response) => {
  const salesman = await Salesman.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!salesman) return res.status(404).json({ message: 'Salesman not found' });
  res.json({ message: 'Salesman deactivated' });
});

export default router;
