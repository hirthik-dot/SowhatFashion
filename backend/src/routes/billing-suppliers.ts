import express, { Response } from 'express';
import Supplier from '../models/Supplier';
import { BillingAuthRequest } from '../middleware/billingAuthMiddleware';
import { requireAdmin, requirePermission } from '../middleware/billingRoleMiddleware';

const router = express.Router();
router.use(requireAdmin);

router.get('/', async (_req, res: Response) => {
  const suppliers = await Supplier.find({ isActive: true }).sort({ createdAt: -1 });
  res.json(suppliers);
});

router.post('/', async (req: BillingAuthRequest, res: Response) => {
  if (req.billingAdmin?.role !== 'superadmin' && !req.billingAdmin?.permissions?.canManageSuppliersCategories) {
    return res.status(403).json({ message: 'Permission denied' });
  }
  const supplier = await Supplier.create(req.body || {});
  return res.status(201).json(supplier);
});

router.put('/:id', requirePermission('canManageSuppliersCategories'), async (req, res: Response) => {
  const supplier = await Supplier.findByIdAndUpdate(req.params.id, req.body || {}, { new: true });
  if (!supplier) return res.status(404).json({ message: 'Supplier not found' });
  return res.json(supplier);
});

router.delete('/:id', requirePermission('canManageSuppliersCategories'), async (req, res: Response) => {
  const supplier = await Supplier.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!supplier) return res.status(404).json({ message: 'Supplier not found' });
  return res.json({ message: 'Supplier deactivated' });
});

export default router;
