import { Router, Request, Response } from 'express';
import MegaDropdown from '../models/MegaDropdown';
import SidebarConfig from '../models/SidebarConfig';
import authMiddleware from '../middleware/authMiddleware';

const router = Router();

// ============ MEGA DROPDOWN ============

// GET /api/catalogue/mega-dropdown/:category — public (cached by frontend ISR)
router.get('/mega-dropdown/:category', async (req: Request, res: Response) => {
  try {
    const { category } = req.params;
    let dropdown = await MegaDropdown.findOne({ category });
    if (!dropdown) {
      return res.json({ category, columns: [] });
    }
    res.json(dropdown);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
});

// GET /api/catalogue/admin/mega-dropdown/:category — admin
router.get('/admin/mega-dropdown/:category', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { category } = req.params;
    let dropdown = await MegaDropdown.findOne({ category });
    if (!dropdown) {
      return res.json({ category, columns: [] });
    }
    res.json(dropdown);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
});

// PUT /api/catalogue/admin/mega-dropdown/:category — admin
router.put('/admin/mega-dropdown/:category', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { category } = req.params;
    const { columns } = req.body;

    const dropdown = await MegaDropdown.findOneAndUpdate(
      { category },
      { category, columns },
      { new: true, upsert: true, runValidators: true }
    );

    res.json(dropdown);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
});

// ============ SIDEBAR CONFIG ============

// GET /api/catalogue/sidebar-config — public
router.get('/sidebar-config', async (_req: Request, res: Response) => {
  try {
    let config = await SidebarConfig.findOne();
    if (!config) {
      // Return default config
      return res.json({
        filters: [
          {
            id: 'price',
            label: 'Price',
            type: 'range_slider',
            filterKey: 'price',
            isVisible: true,
            order: 0,
            rangeConfig: { min: 199, max: 2999, step: 50, prefix: '₹' },
          },
          {
            id: 'promotions',
            label: 'Promotions',
            type: 'checkbox_list',
            filterKey: 'promotions',
            isVisible: true,
            order: 1,
            options: [
              { label: 'Flash Sale', value: 'flash-sale', count: 0 },
              { label: 'New Arrivals', value: 'new-arrivals', count: 0 },
              { label: 'Combo Offers', value: 'combo-offers', count: 0 },
              { label: '50% OFF', value: '50-off', count: 0 },
            ],
          },
          {
            id: 'size',
            label: 'Size',
            type: 'checkbox_list',
            filterKey: 'size',
            isVisible: true,
            order: 2,
            options: [
              { label: 'S', value: 'S', count: 0 },
              { label: 'M', value: 'M', count: 0 },
              { label: 'L', value: 'L', count: 0 },
              { label: 'XL', value: 'XL', count: 0 },
              { label: 'XXL', value: 'XXL', count: 0 },
            ],
          },
          {
            id: 'category',
            label: 'Category',
            type: 'checkbox_list',
            filterKey: 'category',
            isVisible: true,
            order: 3,
            options: [
              { label: 'T-Shirts', value: 'tshirt', count: 0 },
              { label: 'Shirts', value: 'shirt', count: 0 },
              { label: 'Pants', value: 'pant', count: 0 },
            ],
          },
          {
            id: 'discount',
            label: 'Discount',
            type: 'checkbox_list',
            filterKey: 'discount',
            isVisible: true,
            order: 4,
            options: [
              { label: '10% and above', value: '10', count: 0 },
              { label: '20% and above', value: '20', count: 0 },
              { label: '30% and above', value: '30', count: 0 },
              { label: '50% and above', value: '50', count: 0 },
            ],
          },
        ],
      });
    }
    res.json(config);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
});

// GET /api/catalogue/admin/sidebar-config — admin
router.get('/admin/sidebar-config', authMiddleware, async (_req: Request, res: Response) => {
  try {
    let config = await SidebarConfig.findOne();
    if (!config) {
      return res.json({ filters: [] });
    }
    res.json(config);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
});

// PUT /api/catalogue/admin/sidebar-config — admin
router.put('/admin/sidebar-config', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { filters } = req.body;

    let config = await SidebarConfig.findOne();
    if (config) {
      config.filters = filters;
      await config.save();
    } else {
      config = new SidebarConfig({ filters });
      await config.save();
    }

    res.json(config);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
});

// ============ PRODUCT COUNTS (for filter badges) ============

// GET /api/catalogue/product-counts?category=tshirt
router.get('/product-counts', async (req: Request, res: Response) => {
  try {
    const Product = (await import('../models/Product')).default;
    const baseFilter: any = { isActive: true };
    if (req.query.category) {
      baseFilter.category = req.query.category;
    }

    const [
      totalCount,
      sizeAgg,
      categoryAgg,
      newArrivalsCount,
      featuredCount,
    ] = await Promise.all([
      Product.countDocuments(baseFilter),
      Product.aggregate([
        { $match: baseFilter },
        { $unwind: '$sizes' },
        { $group: { _id: '$sizes', count: { $sum: 1 } } },
      ]),
      Product.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
      ]),
      Product.countDocuments({ ...baseFilter, isNewArrival: true }),
      Product.countDocuments({ ...baseFilter, isFeatured: true }),
    ]);

    const sizes: Record<string, number> = {};
    sizeAgg.forEach((s: any) => { sizes[s._id] = s.count; });

    const categories: Record<string, number> = {};
    categoryAgg.forEach((c: any) => { categories[c._id] = c.count; });

    // Discount counts: we compute how many products have >= X% discount
    const allProducts = await Product.find(baseFilter).select('price discountPrice isNewArrival').lean();
    const discountBuckets: Record<string, number> = { '10': 0, '20': 0, '30': 0, '50': 0 };
    allProducts.forEach((p: any) => {
      if (p.discountPrice && p.discountPrice < p.price) {
        const pct = Math.round(((p.price - p.discountPrice) / p.price) * 100);
        if (pct >= 10) discountBuckets['10']++;
        if (pct >= 20) discountBuckets['20']++;
        if (pct >= 30) discountBuckets['30']++;
        if (pct >= 50) discountBuckets['50']++;
      }
    });

    res.json({
      total: totalCount,
      sizes,
      categories,
      promotions: {
        'new-arrivals': newArrivalsCount,
        'flash-sale': featuredCount, // map featured to flash sale for demo
        'combo-offers': 0,
        '50-off': discountBuckets['50'],
      },
      discount: discountBuckets,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
});

export default router;
