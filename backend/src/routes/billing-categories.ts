import express, { Response } from 'express';
import BillingCategory from '../models/BillingCategory';
import { requireAdmin, requirePermission } from '../middleware/billingRoleMiddleware';

const router = express.Router();
router.use(requireAdmin);

router.get('/', async (_req, res: Response) => {
  const categories = await BillingCategory.find({ isActive: true }).sort({ order: 1, name: 1 }).lean();
  const mains = categories.filter((c) => !c.parentCategory);
  const nested = mains.map((main) => ({
    ...main,
    subCategories: categories.filter(
      (sub) => String(sub.parentCategory || '') === String(main._id)
    ),
  }));
  res.json(nested);
});

router.get('/flat', async (req, res: Response) => {
  const supplier = String(req.query.supplier || '').trim();
  const query: any = { isActive: true };
  if (supplier) query.supplier = supplier;
  const categories = await BillingCategory.find(query).sort({ order: 1, name: 1 });
  res.json(categories);
});

router.get('/:id/subcategories', async (req, res: Response) => {
  const supplier = String(req.query.supplier || '').trim();
  const query: any = { parentCategory: req.params.id, isActive: true };
  if (supplier) query.supplier = supplier;
  const categories = await BillingCategory.find(query).sort({
    order: 1,
    name: 1,
  });
  res.json(categories);
});

router.post('/', requirePermission('canManageSuppliersCategories'), async (req, res: Response) => {
  const category = await BillingCategory.create(req.body || {});
  res.status(201).json(category);
});

router.put('/:id', requirePermission('canManageSuppliersCategories'), async (req, res: Response) => {
  const category = await BillingCategory.findByIdAndUpdate(req.params.id, req.body || {}, { new: true });
  if (!category) return res.status(404).json({ message: 'Category not found' });
  res.json(category);
});

router.delete('/:id', requirePermission('canManageSuppliersCategories'), async (req, res: Response) => {
  const category = await BillingCategory.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!category) return res.status(404).json({ message: 'Category not found' });
  res.json({ message: 'Category deactivated' });
});

export default router;
