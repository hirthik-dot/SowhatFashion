import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import Product from '../models/Product';
import SidebarConfig from '../models/SidebarConfig';
import authMiddleware from '../middleware/authMiddleware';
import { mergeFilterTags, plainFilterTags, type FilterTagsMap } from '../lib/productFilterTags';
import { buildFacetFilterCondition, collectFacetFiltersFromQuery } from '../lib/productFilterQuery';
import { buildCategoryFilterCondition, normalizeCategorySlug } from '../lib/storeCategories';
import {
  applyEcommerceVariant,
  expandProductsForEcommerce,
  getEcommerceVariantsByProducts,
  parsePriceVariantSlug,
} from '../lib/ecommerce-product-variants';

const router = Router();

function isAdminRequest(req: Request): boolean {
  try {
    const token = req.cookies?.token;
    if (!token) return false;
    jwt.verify(token, process.env.JWT_SECRET as string);
    return true;
  } catch {
    return false;
  }
}

const FILTER_TAG_BODY_FIELDS = [
  'category',
  'subCategory',
  'sizes',
  'tags',
  'price',
  'discountPrice',
  'isNewArrival',
  'isFeatured',
  'filterTags',
] as const;

function filterTagsToMap(tags: FilterTagsMap): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const [key, values] of Object.entries(tags)) {
    if (Array.isArray(values) && values.length > 0) {
      map.set(key, values.map((v) => String(v)));
    }
  }
  return map;
}

async function applyFilterTagsToBody(body: Record<string, unknown>) {
  if (typeof body.category === 'string' && body.category.trim()) {
    const normalized = normalizeCategorySlug(body.category);
    if (normalized) body.category = normalized;
  }
  const config = await SidebarConfig.findOne();
  const sidebarFilters = config?.filters || [];
  const merged = mergeFilterTags(
    {
      category: body.category as string,
      subCategory: body.subCategory as string,
      sizes: body.sizes as string[],
      tags: body.tags as string[],
      price: body.price as number,
      discountPrice: body.discountPrice as number,
      isNewArrival: body.isNewArrival as boolean,
      isFeatured: body.isFeatured as boolean,
    },
    body.filterTags as FilterTagsMap | undefined,
    sidebarFilters
  );
  body.filterTags = filterTagsToMap(merged);
}

// GET /api/products - all active products with filters
router.get('/', async (req: Request, res: Response) => {
  try {
    const { category, subCategory, featured, newArrival, sort, limit, page, size, minPrice, maxPrice, discount, promotions, search } = req.query;

    const filter: any = { isEcommerceProduct: { $ne: false } };
    if (!isAdminRequest(req)) {
      filter.isActive = true;
    }
    if (category) {
      Object.assign(filter, buildCategoryFilterCondition(category as string));
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

    // Custom facet filters from sidebar config (e.g. ?fit=slim,regular)
    const facetFilters = collectFacetFiltersFromQuery(req.query as Record<string, unknown>);
    const facetConditions = Object.entries(facetFilters)
      .map(([key, values]) => buildFacetFilterCondition(key, values))
      .filter(Boolean) as Record<string, unknown>[];
    if (facetConditions.length) {
      filter.$and = [...(filter.$and || []), ...facetConditions];
    }

    let sortObj: any = { createdAt: -1 };
    if (sort === 'price_asc' || sort === 'Price: Low-High') sortObj = { price: 1 };
    if (sort === 'price_desc' || sort === 'Price: High-Low') sortObj = { price: -1 };
    if (sort === 'newest' || sort === 'Newest') sortObj = { createdAt: -1 };
    if (sort === 'Discount') sortObj = { discountPrice: 1 };

    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 50;
    const skip = (pageNum - 1) * limitNum;

    let products = await Product.find(filter).sort(sortObj).lean();
    const expandVariants = req.query.expand !== 'false';
    let expandedProducts = expandVariants
      ? await expandProductsForEcommerce(products)
      : products;

    // Post-query discount filter (computed field)
    if (discount) {
      const discountMin = parseInt(discount as string);
      expandedProducts = expandedProducts.filter((p) => {
        if (!p.discountPrice || p.discountPrice >= p.price) return false;
        const pct = Math.round(((p.price - p.discountPrice) / p.price) * 100);
        return pct >= discountMin;
      });
    }

    const total = expandedProducts.length;
    const pagedProducts = expandedProducts.slice(skip, skip + limitNum);

    res.json({
      products: pagedProducts,
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
    const slug = String(req.params.slug || '').trim();
    const variantSlug = parsePriceVariantSlug(slug);

    if (variantSlug) {
      const product = await Product.findOne({
        slug: variantSlug.baseSlug,
        isActive: true,
        isEcommerceProduct: { $ne: false },
      }).lean();
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }
      const variantsByProduct = await getEcommerceVariantsByProducts([product._id]);
      const variant = (variantsByProduct.get(String(product._id)) || []).find(
        (entry) => Math.round(entry.sellingPrice) === Math.round(variantSlug.sellingPrice)
      );
      if (!variant) {
        return res.status(404).json({ message: 'Product not found' });
      }
      return res.json(applyEcommerceVariant(product, variant, true));
    }

    const product = await Product.findOne({ slug, isActive: true, isEcommerceProduct: { $ne: false } }).lean();
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (product.isBillingProduct) {
      const variantsByProduct = await getEcommerceVariantsByProducts([product._id]);
      const variants = (variantsByProduct.get(String(product._id)) || []).filter((entry) => entry.stock > 0);
      if (variants.length === 1) {
        return res.json(applyEcommerceVariant(product, variants[0], false));
      }
      if (variants.length > 1) {
        // Base slug (hero links, bookmarks): default to lowest in-stock price variant
        return res.json(applyEcommerceVariant(product, variants[0], false));
      }
    }

    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
});

// POST /api/products - create product (protected)
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    await applyFilterTagsToBody(req.body);
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
    const shouldApplyFilterTags = FILTER_TAG_BODY_FIELDS.some((field) => field in req.body);
    if (shouldApplyFilterTags) {
      await applyFilterTagsToBody(req.body);
    }
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

// POST /api/products/backfill-filter-tags — populate filterTags on all products (protected)
router.post('/backfill-filter-tags', authMiddleware, async (_req: Request, res: Response) => {
  try {
    const config = await SidebarConfig.findOne();
    const sidebarFilters = config?.filters || [];
    const products = await Product.find({});
    let updated = 0;
    for (const product of products) {
      const merged = mergeFilterTags(
        {
          category: product.category,
          subCategory: product.subCategory,
          sizes: product.sizes,
          tags: product.tags,
          price: product.price,
          discountPrice: product.discountPrice,
          isNewArrival: product.isNewArrival,
          isFeatured: product.isFeatured,
        },
        plainFilterTags(product),
        sidebarFilters
      );
      product.set('filterTags', filterTagsToMap(merged));
      await product.save();
      updated++;
    }
    res.json({ message: 'Filter tags backfilled', updated });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
});

// DELETE /api/products/:id - delete product (protected)
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (product.isBillingProduct) {
      product.isEcommerceProduct = false;
      await product.save();
    } else {
      await Product.findByIdAndDelete(req.params.id);
    }
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
});

export default router;
