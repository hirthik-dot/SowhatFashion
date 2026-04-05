import { Router, Request, Response } from 'express';
import Product from '../models/Product';
import authMiddleware from '../middleware/authMiddleware';

const router = Router();

// GET /api/products - all active products with filters
router.get('/', async (req: Request, res: Response) => {
  try {
    const { category, subCategory, featured, newArrival, sort, limit, page, size, minPrice, maxPrice, discount, promotions, search } = req.query;

    const filter: any = { isActive: true };
    if (category) {
      // Normalize: strip trailing 's' for plurals, case-insensitive match
      let catVal = (category as string).trim();
      // 'tshirts' → 'tshirt', 'shirts' → 'shirt', 'pants' → 'pant'
      catVal = catVal.replace(/s$/i, '');
      filter.category = { $regex: new RegExp(`^${catVal}$`, 'i') };
    }
    if (subCategory) {
      filter.subCategory = { $regex: new RegExp(`^${(subCategory as string).trim()}$`, 'i') };
    }
    if (featured === 'true') filter.isFeatured = true;
    if (newArrival === 'true') filter.isNewArrival = true;

    // Size filter: ?size=M,L,XL → products that have ANY of those sizes
    if (size) {
      const sizeArr = (size as string).split(',').map(s => s.trim().toUpperCase());
      filter.sizes = { $in: sizeArr };
    }

    // Price range filter
    if (minPrice || maxPrice) {
      const priceField = 'price'; // filter on base price
      filter[priceField] = {};
      if (minPrice) filter[priceField].$gte = parseInt(minPrice as string);
      if (maxPrice) filter[priceField].$lte = parseInt(maxPrice as string);
    }

    // Promotion filters: ?promotions=flash-sale,new-arrivals
    if (promotions) {
      const promoArr = (promotions as string).split(',');
      const promoConditions: any[] = [];
      promoArr.forEach(p => {
        if (p === 'new-arrivals') promoConditions.push({ isNewArrival: true });
        if (p === 'flash-sale') promoConditions.push({ isFeatured: true });
      });
      if (promoConditions.length > 0) {
        filter.$or = promoConditions;
      }
    }

    // Search filter
    if (search) {
      filter.name = { $regex: search, $options: 'i' };
    }

    let sortObj: any = { createdAt: -1 };
    if (sort === 'price_asc' || sort === 'Price: Low-High') sortObj = { price: 1 };
    if (sort === 'price_desc' || sort === 'Price: High-Low') sortObj = { price: -1 };
    if (sort === 'newest' || sort === 'Newest') sortObj = { createdAt: -1 };
    if (sort === 'Discount') sortObj = { discountPrice: 1 };

    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 50;
    const skip = (pageNum - 1) * limitNum;

    let [products, total] = await Promise.all([
      Product.find(filter).sort(sortObj).skip(skip).limit(limitNum),
      Product.countDocuments(filter),
    ]);

    // Post-query discount filter (computed field)
    if (discount) {
      const discountMin = parseInt(discount as string);
      products = products.filter(p => {
        if (!p.discountPrice || p.discountPrice >= p.price) return false;
        const pct = Math.round(((p.price - p.discountPrice) / p.price) * 100);
        return pct >= discountMin;
      });
      total = products.length;
    }

    res.json({
      products,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
});

// GET /api/products/:slug - single product by slug
router.get('/:slug', async (req: Request, res: Response) => {
  try {
    const product = await Product.findOne({ slug: req.params.slug, isActive: true });
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
});

// POST /api/products - create product (protected)
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const product = new Product(req.body);
    await product.save();
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
});

// PUT /api/products/:id - update product (protected)
router.put('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
});

// DELETE /api/products/:id - delete product (protected)
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
});

export default router;
