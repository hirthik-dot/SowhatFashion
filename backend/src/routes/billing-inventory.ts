import express, { Response } from 'express';
import Product from '../models/Product';
import StockEntry from '../models/StockEntry';
import StockItem from '../models/StockItem';
import { BillingAuthRequest } from '../middleware/billingAuthMiddleware';
import { requireAdmin } from '../middleware/billingRoleMiddleware';

const router = express.Router();
router.use(requireAdmin);

router.get('/summary', async (req: BillingAuthRequest, res: Response) => {
  const query = { isBillingProduct: true } as any;
  const [totals, lowStock, outOfStock] = await Promise.all([
    Product.find(query).select('stock price incomingPrice').lean(),
    Product.countDocuments({ ...query, stock: { $gt: 0, $lte: 2 } }),
    Product.countDocuments({ ...query, stock: { $lte: 0 } }),
  ]);

  const totalProducts = totals.length;
  const totalUnits = totals.reduce((sum, product) => sum + Number(product.stock || 0), 0);
  const totalRetailValue = totals.reduce((sum, product) => sum + Number(product.stock || 0) * Number(product.price || 0), 0);
  const totalCostValue = totals.reduce(
    (sum, product) => sum + Number(product.stock || 0) * Number(product.incomingPrice || 0),
    0
  );

  const isSuperAdmin = req.billingAdmin?.role === 'superadmin';
  return res.json({
    totalProducts,
    totalUnits,
    totalRetailValue,
    totalCostValue: isSuperAdmin ? totalCostValue : undefined,
    expectedProfit: isSuperAdmin ? totalRetailValue - totalCostValue : undefined,
    lowStock,
    outOfStock,
  });
});

router.get('/products', async (req: BillingAuthRequest, res: Response) => {
  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 25);
  const skip = (page - 1) * limit;
  const search = String(req.query.search || '').trim();
  const supplier = String(req.query.supplier || '').trim();
  const stock = String(req.query.stock || '').trim();

  const query: any = { isBillingProduct: true };
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { billingName: { $regex: search, $options: 'i' } },
      { category: { $regex: search, $options: 'i' } },
      { subCategory: { $regex: search, $options: 'i' } },
    ];
  }
  if (supplier) query.supplier = supplier;
  if (stock === 'low') query.stock = { $gt: 0, $lte: 2 };
  if (stock === 'out') query.stock = { $lte: 0 };
  if (stock === 'in') query.stock = { $gt: 0 };

  const [data, total] = await Promise.all([
    Product.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('supplier', 'name')
      .populate('billingSubCategory', 'name')
      .lean(),
    Product.countDocuments(query),
  ]);

  const soldCounts = await StockItem.aggregate([
    { $match: { status: 'sold', product: { $in: data.map((d: any) => d._id) } } },
    { $group: { _id: '$product', count: { $sum: 1 } } },
  ]);
  const soldMap = new Map<string, number>(soldCounts.map((s: any) => [String(s._id), Number(s.count || 0)]));

  const isSuperAdmin = req.billingAdmin?.role === 'superadmin';
  return res.json({
    data: data.map((product: any) => {
      const row = {
        ...product,
        name: product.billingName || product.name,
        sold: soldMap.get(String(product._id)) || 0,
      };
      if (!isSuperAdmin) {
        delete (row as any).incomingPrice;
      }
      return row;
    }),
    total,
    page,
    limit,
  });
});

router.get('/entries', async (req, res: Response) => {
  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 20);
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    StockEntry.find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('supplier', 'name')
      .populate('category', 'name')
      .populate('subCategory', 'name')
      .populate('enteredBy', 'name email')
      .lean(),
    StockEntry.countDocuments({}),
  ]);

  return res.json({ data, total, page, limit });
});

export default router;
