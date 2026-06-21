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
  resolveBillingProductForSizeSlug,
} from '../lib/ecommerce-product-variants';
import {
  getVariantBySlug,
  getVariantsByProductIds,
  mergeVariantWithParent,
  pickDefaultVariant,
  syncProductVariants,
  type VariantInput,
} from '../lib/product-color-variants';
import ProductSizeVariant from '../models/ProductSizeVariant';
import {
  attachAdminSizeVariants,
  buildSizeVariantSlug,
  ensureSizeVariantsFromBillingStock,
  getSizeVariantBySlug,
  loadSizePageContext,
  mergeSizeAndColorWithParent,
  mergeSizeVariantWithParent,
  syncProductSizeVariants,
  updateBillingSizeVariantOverrides,
  type SizeVariantInput,
} from '../lib/product-size-variants';

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

// GET /api/products/meta/slugs - all variant + product slugs for SSG
router.get('/meta/slugs', async (_req: Request, res: Response) => {
  try {
    const colorVariants = await ProductVariant.find({ isActive: true }).select('slug').lean();
    const sizeVariants = await ProductSizeVariant.find({ isActive: true }).select('slug').lean();
    const slugs = [
      ...colorVariants.map((v) => v.slug),
      ...sizeVariants.map((v) => v.slug),
    ].filter(Boolean);
    res.json({ slugs });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
});

// GET /api/products/:slug - single product by slug (variant or legacy parent slug)
router.get('/:slug', async (req: Request, res: Response) => {
  try {
    const slug = String(req.params.slug || '').trim();

    // 1. Color variant slug (includes per-size colors e.g. shirt-sz-m-red)
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

      if (colorVariantHit.variant.sizeVariantId) {
        const sizeVariant = await ProductSizeVariant.findById(colorVariantHit.variant.sizeVariantId).lean();
        if (!sizeVariant) {
          return res.status(404).json({ message: 'Product not found' });
        }
        const sizeSiblings = await ProductSizeVariant.find({
          parentProductId: parent._id,
          isActive: true,
        })
          .sort({ sortOrder: 1 })
          .lean();
        const { getBillingSizeDataByProducts } = await import('../lib/product-size-variants');
        const billingMap = await getBillingSizeDataByProducts([parent._id]);
        const billingSizes = billingMap.get(String(parent._id)) || [];
        const billingBySize = new Map(billingSizes.map((b) => [b.sizeName, b]));

        const merged = mergeSizeAndColorWithParent(
          parent as Record<string, unknown>,
          sizeVariant as any,
          colorVariantHit.variant,
          colorVariantHit.siblings,
          sizeSiblings as any[],
          billingBySize.get(sizeVariant.sizeName),
          billingBySize
        );
        return res.json(merged);
      }

      const merged = mergeVariantWithParent(parent, colorVariantHit.variant, colorVariantHit.siblings);

      if (parent.isBillingProduct) {
        const sizeVariants = await ProductSizeVariant.find({
          parentProductId: parent._id,
          isActive: true,
        })
          .sort({ sortOrder: 1 })
          .lean();
        if (sizeVariants.length >= 1) {
          return res.json({ redirectTo: sizeVariants[0].slug, _id: parent._id });
        }
      }
      return res.json(merged);
    }

    // 2. Size variant slug (billing products — each size is its own page)
    const sizeVariantHit = await getSizeVariantBySlug(slug);
    if (sizeVariantHit) {
      const parent = await Product.findOne({
        _id: sizeVariantHit.variant.parentProductId,
        isEcommerceProduct: { $ne: false },
        ...(isAdminRequest(req) ? {} : { isActive: true }),
      }).lean();
      if (!parent) {
        return res.status(404).json({ message: 'Product not found' });
      }

      const colorVariants = await import('../lib/product-color-variants').then((m) =>
        m.getVariantsForSizeVariant(sizeVariantHit.variant._id)
      );
      const activeColors = colorVariants.filter((c) => c.isActive !== false);
      if (activeColors.length === 1) {
        const { getBillingSizeDataByProducts } = await import('../lib/product-size-variants');
        const billingMap = await getBillingSizeDataByProducts([parent._id]);
        const billingSizes = billingMap.get(String(parent._id)) || [];
        const billingBySize = new Map(billingSizes.map((b) => [b.sizeName, b]));
        const merged = mergeSizeAndColorWithParent(
          parent as Record<string, unknown>,
          sizeVariantHit.variant,
          activeColors[0],
          activeColors,
          sizeVariantHit.siblings,
          billingBySize.get(sizeVariantHit.variant.sizeName),
          billingBySize
        );
        if (merged.slug !== slug) {
          return res.json({ redirectTo: merged.slug, _id: parent._id });
        }
        return res.json(merged);
      }

      const merged = await loadSizePageContext(
        parent as Record<string, unknown>,
        sizeVariantHit.variant,
        sizeVariantHit.siblings
      );
      return res.json(merged);
    }

    // 3. Legacy price variant slug (backward compatibility)
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
      const sizeResolved = await resolveBillingProductForSizeSlug(
        product as Record<string, unknown>,
        slug
      );
      if (sizeResolved) return res.json(sizeResolved);

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

    // 4. Legacy parent slug → redirect to default color variant
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
          const sizeVariants = await ProductSizeVariant.find({
            parentProductId: product._id,
            isActive: true,
          })
            .sort({ sortOrder: 1 })
            .lean();
          if (sizeVariants.length >= 1) {
            return res.json({ redirectTo: sizeVariants[0].slug, _id: product._id });
          }
        }
        return res.json(merged);
      }
    }

    if (product.isBillingProduct) {
      await ensureSizeVariantsFromBillingStock(product._id, product.slug);
      const sizeVariants = await ProductSizeVariant.find({
        parentProductId: product._id,
        isActive: true,
      })
        .sort({ sortOrder: 1 })
        .lean();
      if (sizeVariants.length >= 1) {
        const defaultSlug = sizeVariants[0].slug;
        if (defaultSlug !== slug) {
          return res.json({ redirectTo: defaultSlug, _id: product._id });
        }
        const resolved = await resolveBillingProductForSizeSlug(
          product as Record<string, unknown>,
          defaultSlug
        );
        if (resolved) return res.json(resolved);
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
    const { variants, sizeVariants, ...body } = req.body as Record<string, unknown> & {
      variants?: VariantInput[];
      sizeVariants?: SizeVariantInput[];
    };
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

    let adminSizeVariants: Record<string, unknown>[] = [];
    if (Array.isArray(sizeVariants) && sizeVariants.length) {
      adminSizeVariants = (await syncProductSizeVariants(
        product._id,
        product.slug,
        sizeVariants,
        Boolean(product.isBillingProduct)
      )) as Record<string, unknown>[];
    }

    const variantsMap = await getVariantsByProductIds([product._id]);
    const colorVariants = variantsMap.get(String(product._id)) || [];
    const payload =
      colorVariants.length > 0
        ? mergeVariantWithParent(product.toObject() as unknown as Record<string, unknown>, colorVariants[0] as any, colorVariants as any)
        : product.toObject();

    res.status(201).json({ ...payload, adminVariants: colorVariants, adminSizeVariants });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
});

// PUT /api/products/:id - update product (protected)
router.put('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { variants, sizeVariants, ...body } = req.body as Record<string, unknown> & {
      variants?: VariantInput[];
      sizeVariants?: SizeVariantInput[];
    };

    const existingProduct = await Product.findById(req.params.id);
    if (!existingProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // E-commerce edits must not overwrite billing inventory prices/stock/sizes
    if (existingProduct.isBillingProduct) {
      delete body.price;
      delete body.discountPrice;
      delete body.stock;
      delete body.sizes;
      delete body.incomingPrice;
      delete body.sizeStock;
    }

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

    let adminSizeVariants: Record<string, unknown>[] = [];
    const hasSizeVariants = Array.isArray(sizeVariants) && sizeVariants.length > 0;

    if (hasSizeVariants) {
      if (product.isBillingProduct) {
        await ensureSizeVariantsFromBillingStock(product._id, product.slug);
        await updateBillingSizeVariantOverrides(product._id, sizeVariants);
      } else {
        await syncProductSizeVariants(product._id, product.slug, sizeVariants, false);
      }

      for (const sv of sizeVariants) {
        if (!sv._id || !Array.isArray(sv.colorVariants)) continue;
        const sizeDoc = await ProductSizeVariant.findById(sv._id).select('slug sizeName').lean();
        const sizeSlug =
          sizeDoc?.slug || buildSizeVariantSlug(product.slug, String(sv.sizeName || ''));
        await syncProductVariants(
          product._id,
          sizeSlug,
          sv.colorVariants.filter((c) => c.colorName?.trim()),
          sv._id
        );
      }

      adminSizeVariants = (await attachAdminSizeVariants(
        product._id,
        product.slug,
        Boolean(product.isBillingProduct),
        product.toObject() as unknown as Record<string, unknown>
      )) as Record<string, unknown>[];
    } else if (product.isBillingProduct) {
      adminSizeVariants = (await attachAdminSizeVariants(
        product._id,
        product.slug,
        true,
        product.toObject() as unknown as Record<string, unknown>
      )) as Record<string, unknown>[];
    }

    let colorVariants: Record<string, unknown>[] = [];
    if (!hasSizeVariants && Array.isArray(variants)) {
      colorVariants = (await syncProductVariants(product._id, product.slug, variants)) as Record<
        string,
        unknown
      >[];
      const defaultVariant = colorVariants[0];
      if (defaultVariant && String(product.defaultVariantId) !== String(defaultVariant._id)) {
        product.defaultVariantId = defaultVariant._id as typeof product.defaultVariantId;
        await product.save();
      }
    } else if (!hasSizeVariants) {
      const variantsMap = await getVariantsByProductIds([product._id], { productLevelOnly: true });
      colorVariants = (variantsMap.get(String(product._id)) || []) as Record<string, unknown>[];
    }

    const payload =
      colorVariants.length > 0
        ? mergeVariantWithParent(product.toObject() as unknown as Record<string, unknown>, colorVariants[0] as any, colorVariants as any)
        : product.toObject();

    res.json({ ...payload, adminVariants: colorVariants, adminSizeVariants });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
});

// GET /api/products/:id/variants - list color variants for admin (protected)
router.get('/:id/variants', authMiddleware, async (req: Request, res: Response) => {
  try {
    const variants = await ProductVariant.find({
      parentProductId: req.params.id,
      $or: [{ sizeVariantId: null }, { sizeVariantId: { $exists: false } }],
    })
      .sort({ sortOrder: 1, createdAt: 1 })
      .lean();
    res.json({ variants });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
});

// GET /api/products/:id/size-variants - list size variants for admin (protected)
router.get('/:id/size-variants', authMiddleware, async (req: Request, res: Response) => {
  try {
    const product = await Product.findById(req.params.id).lean();
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const variants = await attachAdminSizeVariants(
      product._id,
      product.slug,
      Boolean(product.isBillingProduct),
      product as Record<string, unknown>
    );

    res.json({
      variants,
      isBillingProduct: Boolean(product.isBillingProduct),
    });
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
      await ProductSizeVariant.deleteMany({ parentProductId: product._id });
      await Product.findByIdAndDelete(req.params.id);
    }
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
});

export default router;
