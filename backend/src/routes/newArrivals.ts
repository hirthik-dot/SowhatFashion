import { Router, Request, Response } from 'express';
import NewArrival from '../models/NewArrival';
import authMiddleware from '../middleware/authMiddleware';
import { triggerRevalidate } from '../lib/revalidateFrontend';

const publicRouter = Router();
const adminRouter = Router();

// GET /api/new-arrivals
publicRouter.get('/', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(Math.max(parseInt(String(req.query.limit), 10) || 100, 1), 200);
    const skip = Math.max(parseInt(String(req.query.skip), 10) || 0, 0);

    const [raw, total] = await Promise.all([
      NewArrival.find({ isActive: true })
        .populate('product')
        .sort({ order: 1, addedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      NewArrival.countDocuments({ isActive: true }),
    ]);

    const items = raw.filter(
      (row: any) => row.product && row.product.isActive !== false
    );

    res.json({
      items,
      total,
      hasMore: skip + raw.length < total,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
});

// GET /api/admin/new-arrivals
adminRouter.get('/', authMiddleware, async (_req: Request, res: Response) => {
  try {
    const rows = await NewArrival.find().populate('product').sort({ order: 1, addedAt: -1 });
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
});

// PATCH /api/admin/new-arrivals/reorder (before :id routes)
adminRouter.patch('/reorder', authMiddleware, async (req: Request, res: Response) => {
  try {
    const body = req.body as { id: string; order: number }[];
    if (!Array.isArray(body)) {
      return res.status(400).json({ message: 'Expected array of { id, order }' });
    }
    await Promise.all(
      body.map((row) => NewArrival.findByIdAndUpdate(row.id, { order: row.order }).exec())
    );
    await triggerRevalidate(['/']);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
});

// POST /api/admin/new-arrivals
adminRouter.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { productId, weekLabel } = req.body as { productId?: string; weekLabel?: string };
    if (!productId) {
      return res.status(400).json({ message: 'productId required' });
    }
    const maxOrder = await NewArrival.findOne().sort({ order: -1 }).select('order').lean();
    const order = (maxOrder?.order ?? -1) + 1;
    const row = await NewArrival.create({
      product: productId,
      weekLabel: weekLabel?.trim() || 'This Week',
      order,
    });
    const populated = await NewArrival.findById(row._id).populate('product');
    await triggerRevalidate(['/']);
    res.status(201).json(populated);
  } catch (error: any) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: 'Product already in new arrivals' });
    }
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
});

// DELETE /api/admin/new-arrivals/:id
adminRouter.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const row = await NewArrival.findByIdAndDelete(req.params.id);
    if (!row) {
      return res.status(404).json({ message: 'Not found' });
    }
    await triggerRevalidate(['/']);
    res.json({ message: 'Removed' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
});

// PATCH /api/admin/new-arrivals/:id/toggle
adminRouter.patch('/:id/toggle', authMiddleware, async (req: Request, res: Response) => {
  try {
    const row = await NewArrival.findById(req.params.id);
    if (!row) {
      return res.status(404).json({ message: 'Not found' });
    }
    row.isActive = !row.isActive;
    await row.save();
    await row.populate('product');
    await triggerRevalidate(['/']);
    res.json(row);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
});

export { publicRouter as newArrivalsPublicRoutes, adminRouter as newArrivalsAdminRoutes };
