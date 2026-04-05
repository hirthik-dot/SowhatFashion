import { Router, Request, Response } from 'express';
import Category from '../models/Category';
import authMiddleware from '../middleware/authMiddleware';

const router = Router();

// GET /api/categories — public (all active categories with hierarchy)
router.get('/', async (_req: Request, res: Response) => {
  try {
    const categories = await Category.find({ isActive: true }).sort({ order: 1, name: 1 });

    // Build hierarchy: top-level + children
    const topLevel = categories.filter(c => !c.parentSlug);
    const result = topLevel.map(parent => ({
      _id: parent._id,
      name: parent.name,
      slug: parent.slug,
      megaDropdownLabel: parent.megaDropdownLabel,
      order: parent.order,
      subCategories: categories
        .filter(c => c.parentSlug === parent.slug)
        .map(sub => ({
          _id: sub._id,
          name: sub.name,
          slug: sub.slug,
          megaDropdownLabel: sub.megaDropdownLabel,
          order: sub.order,
        })),
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
});

// GET /api/categories/all — admin (flat list, includes inactive)
router.get('/all', authMiddleware, async (_req: Request, res: Response) => {
  try {
    const categories = await Category.find().sort({ order: 1, name: 1 });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
});

// POST /api/categories — admin create
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const category = new Category(req.body);
    await category.save();
    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
});

// PUT /api/categories/:id — admin update
router.put('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const category = await Category.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    res.json(category);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
});

// DELETE /api/categories/:id — admin delete
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    // Also delete children if this was a parent
    if (!category.parentSlug) {
      await Category.deleteMany({ parentSlug: category.slug });
    }
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
});

export default router;
