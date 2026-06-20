import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import Product from '../models/Product';
import ProductVariant from '../models/ProductVariant';
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
import {
  getVariantBySlug,
  getVariantsByProductIds,
  mergeVariantWithParent,
  pickDefaultVariant,
  syncProductVariants,
  type VariantInput,
} from '../lib/product-color-variants';

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

async function applyFilterTagsToBody(body: Record<string, unknown>, variantColors?: { name?: string }[]) {
  if (typeof body.category === 'string' && body.category.trim()) {
    const normalized = normalizeCategorySlug(body.category);
    if (normalized) body.category = normalized;
  }
  const config = await SidebarConfig.findOne();
  const sidebarFilters = config?.filters || [];
  const colorsFromVariants = (variantColors || [])
    .map((c) => ({ name: c.name, hex: '#000000' }))
    .filter((c) => c.name);
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
      colors: colorsFromVariants.length
        ? colorsFromVariants
        : (body.colors as { name?: string; hex?: string }[] | undefined),
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

    let products: any[] = await Product.find(filter).sort(sortObj).lean();
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

// GET /api/products/slugs - all variant + product slugs for SSG
router.get('/meta/slugs', async (_req: Request, res: Response) => {
  try {
    const variants = await ProductVariant.find({ isActive: true }).select('slug').lean();
    const slugs = variants.map((v) => v.slug).filter(Boolean);
    res.json({ slugs });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
});

// GET /api/products/:slug - single product by slug (variant or legacy parent slug)
router.get('/:slug', async (req: Request, res: Response) => {
  try {
    const slug = String(req.params.slug || '').trim();

    // 1. Color variant slug
    const colorVariantHit = await getVariantBySlug(slug);
    if (colorVariantHit) {
      const parent = await Product.findOne({
        _id: colorVariantHit.variant.parentProductId,
        isEcommerceProduct: { $ne: false },
        ...(isAdminRequest(req) ? {} : { isActive: true }),
      }).lean();
      if (!parent) {
        return res.status(404).json({ message: 'Product not found' });
      }
      const merged = mergeVariantWithParent(parent, colorVariantHit.variant, colorVariantHit.siblings);

      if (parent.isBillingProduct) {
        const variantsByProduct = await getEcommerceVariantsByProducts([parent._id]);
        const priceVariants = (variantsByProduct.get(String(parent._id)) || []).filter((e) => e.stock > 0);
        if (priceVariants.length === 1) {
          return res.json(applyEcommerceVariant(merged, priceVariants[0], false));
        }
      }
      return res.json(merged);
    }

    // 2. Price variant slug (billing products)
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

    const product = await Product.findOne({
      slug,
      ...(isAdminRequest(req) ? {} : { isActive: true }),
      isEcommerceProduct: { $ne: false },
    }).lean();
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // 3. Legacy parent slug → redirect to default color variant
    const variantsMap = await getVariantsByProductIds([product._id]);
    const colorVariants = variantsMap.get(String(product._id)) || [];
    if (colorVariants.length > 0) {
      const defaultVariant =
        colorVariants.find((v) => String(v._id) === String(product.defaultVariantId)) ||
        pickDefaultVariant(colorVariants);
      if (defaultVariant && defaultVariant.slug !== slug) {
        return res.json({ redirectTo: defaultVariant.slug, _id: product._id });
      }
      if (defaultVariant) {
        const merged = mergeVariantWithParent(product, defaultVariant, colorVariants);
        if (product.isBillingProduct) {
          const variantsByProduct = await getEcommerceVariantsByProducts([product._id]);
          const priceVariants = (variantsByProduct.get(String(product._id)) || []).filter((e) => e.stock > 0);
          if (priceVariants.length === 1) {
            return res.json(applyEcommerceVariant(merged, priceVariants[0], false));
          }
          if (priceVariants.length > 1) {
            return res.json(applyEcommerceVariant(merged, priceVariants[0], false));
          }
        }
        return res.json(merged);
      }
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
    const { variants, ...body } = req.body as Record<string, unknown> & { variants?: VariantInput[] };
    await applyFilterTagsToBody(body, variants?.map((v) => ({ name: v.colorName })));
    const product = new Product(body);
    await product.save();

    if (Array.isArray(variants) && variants.length) {
      await syncProductVariants(product._id, product.slug, variants);
      const savedVariants = await ProductVariant.find({ parentProductId: product._id })
        .sort({ sortOrder: 1 })
        .lean();
      if (savedVariants[0]) {
        product.defaultVariantId = savedVariants[0]._id;
        await product.save();
      }
    } else if (Array.isArray(product.images) && product.images.length) {
      await syncProductVariants(product._id, product.slug, [
        {
          colorName: 'Default',
          colorHex: '#000000',
          images: product.images,
          isActive: true,
        },
      ]);
      const savedVariants = await ProductVariant.find({ parentProductId: product._id }).lean();
      if (savedVariants[0]) {
        product.defaultVariantId = savedVariants[0]._id;
        await product.save();
      }
    }

    const variantsMap = await getVariantsByProductIds([product._id]);
    const colorVariants = variantsMap.get(String(product._id)) || [];
    const payload =
      colorVariants.length > 0
        ? mergeVariantWithParent(product.toObject() as unknown as Record<string, unknown>, colorVariants[0] as any, colorVariants as any)
        : product.toObject();

    res.status(201).json({ ...payload, adminVariants: colorVariants });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
});

// PUT /api/products/:id - update product (protected)
router.put('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { variants, ...body } = req.body as Record<string, unknown> & { variants?: VariantInput[] };
    const shouldApplyFilterTags = FILTER_TAG_BODY_FIELDS.some((field) => field in body) || Array.isArray(variants);
    if (shouldApplyFilterTags) {
      await applyFilterTagsToBody(body, variants?.map((v) => ({ name: v.colorName })));
    }

    const product = await Product.findByIdAndUpdate(req.params.id, body, {
      new: true,
      runValidators: true,
    });
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    let colorVariants: Record<string, unknown>[] = [];
    if (Array.isArray(variants)) {
      colorVariants = (await syncProductVariants(product._id, product.slug, variants)) as Record<
        string,
        unknown
      >[];
      const defaultVariant = colorVariants[0];
      if (defaultVariant && String(product.defaultVariantId) !== String(defaultVariant._id)) {
        product.defaultVariantId = defaultVariant._id as typeof product.defaultVariantId;
        await product.save();
      }
    } else {
      const variantsMap = await getVariantsByProductIds([product._id]);
      colorVariants = (variantsMap.get(String(product._id)) || []) as Record<string, unknown>[];
    }

    const payload =
      colorVariants.length > 0
        ? mergeVariantWithParent(product.toObject() as unknown as Record<string, unknown>, colorVariants[0] as any, colorVariants as any)
        : product.toObject();

    res.json({ ...payload, adminVariants: colorVariants });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
});

// GET /api/products/:id/variants - list variants for admin (protected)
router.get('/:id/variants', authMiddleware, async (req: Request, res: Response) => {
  try {
    const variants = await ProductVariant.find({ parentProductId: req.params.id })
      .sort({ sortOrder: 1, createdAt: 1 })
      .lean();
    res.json({ variants });
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
      await ProductVariant.deleteMany({ parentProductId: product._id });
      await Product.findByIdAndDelete(req.params.id);
    }
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
});

export default router;
