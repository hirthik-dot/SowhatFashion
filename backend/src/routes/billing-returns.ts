import express, { Response } from 'express';
import Bill from '../models/Bill';
import BillingReturn from '../models/Return';
import Product from '../models/Product';
import StockItem from '../models/StockItem';
import { BillingAuthRequest } from '../middleware/billingAuthMiddleware';
import { requireAnyPermission, requirePermission } from '../middleware/billingRoleMiddleware';
import { triggerRevalidate } from '../lib/revalidateFrontend';
import BillingPointsAccount from '../models/BillingPointsAccount';
import BillingPointsLedger from '../models/BillingPointsLedger';
import { clawbackPointsOnReturn } from '../lib/billing-points';
import {
  applyReplacementToBill,
  billForReturn,
  expandReturnedLineItems,
  itemBarcodes,
  returnableBillItems,
} from '../lib/billing-replacements';

const router = express.Router();

const generateReturnNumber = async () => {
  const year = new Date().getFullYear();
  const prefix = `SW-RET-${year}-`;
  const latest = await BillingReturn.findOne({ returnNumber: new RegExp(`^${prefix}`) }).sort({ createdAt: -1 });
  const current = latest?.returnNumber ? Number(latest.returnNumber.split('-')[3]) : 0;
  return `${prefix}${String(current + 1).padStart(4, '0')}`;
};

router.get('/next-number', requirePermission('canReturn'), async (_req, res: Response) => {
  const returnNumber = await generateReturnNumber();
  return res.json({ returnNumber });
});

router.get('/scan/:barcode', requirePermission('canReturn'), async (req, res: Response) => {
  const barcode = String(req.params.barcode || '').trim();
  const bill = await Bill.findOne({
    $or: [{ 'items.barcode': barcode }, { 'items.barcodes': barcode }],
    status: { $in: ['completed', 'partial_replaced'] },
  });
  if (!bill) return res.status(404).json({ message: 'Sale record not found for this barcode' });

  const eligible = returnableBillItems(bill);
  const onReturnableLine = eligible.some((item: { barcode?: string; barcodes?: string[] }) =>
    itemBarcodes(item).includes(barcode)
  );
  if (!onReturnableLine) {
    return res.status(404).json({ message: 'This item was already returned or replaced' });
  }
  return res.json(billForReturn(bill));
});

router.post('/', requirePermission('canReturn'), async (req: BillingAuthRequest, res: Response) => {
  try {
    const {
      billId,
      returnedItems = [],
      replacementItems = [],
      returnType,
      replacementSubtotal,
      replacementItemDiscount,
      replacementBillDiscount,
    } = req.body || {};
    const bill = await Bill.findById(billId);
    if (!bill) return res.status(404).json({ message: 'Original bill not found' });
    if (!['replacement', 'partial'].includes(returnType)) {
      return res.status(400).json({ message: 'Only replacement is supported' });
    }
    if (!Array.isArray(returnedItems) || returnedItems.length === 0) {
      return res.status(400).json({ message: 'Select at least one returned item' });
    }
    if (!Array.isArray(replacementItems) || replacementItems.length === 0) {
      return res.status(400).json({ message: 'Scan at least one replacement item' });
    }

    const normalizedReturned = expandReturnedLineItems(returnedItems);
    if (normalizedReturned.length === 0) {
      return res.status(400).json({ message: 'Select at least one returned item' });
    }

    const eligible = returnableBillItems(bill);
    const eligibleBarcodes = new Set<string>();
    for (const line of eligible) {
      itemBarcodes(line).forEach((code) => eligibleBarcodes.add(code));
    }
    for (const row of normalizedReturned) {
      const code = String(row.barcode || '').trim();
      if (!code || !eligibleBarcodes.has(code)) {
        return res.status(400).json({ message: `Item is not eligible for return: ${code || 'unknown'}` });
      }
    }

    const returnedTotal = normalizedReturned.reduce(
      (sum: number, item: any) => sum + Number(item.sellingPrice || 0) * Number(item.quantity || 1),
      0
    );
    const replacementTotal = replacementItems.reduce(
      (sum: number, item: any) => sum + Number(item.sellingPrice || 0) * Number(item.quantity || 1),
      0
    );
    const priceDifference = replacementTotal - returnedTotal;

    const returnDoc = await BillingReturn.create({
      bill: bill._id,
      billNumber: bill.billNumber,
      returnNumber: await generateReturnNumber(),
      customer: bill.customer,
      returnedItems: normalizedReturned,
      replacementItems,
      returnType,
      priceDifference,
      replacementSubtotal: Number(replacementSubtotal || replacementTotal),
      replacementItemDiscount: Number(replacementItemDiscount || 0),
      replacementBillDiscount: Number(replacementBillDiscount || 0),
      refundAmount: 0,
      refundMethod: 'none',
      processedBy: req.billingAdminId,
    });

    applyReplacementToBill(bill, normalizedReturned, replacementItems);

    // Returned items: mark StockItem as returned (manual inspection before restock)
    for (const item of normalizedReturned) {
      const barcode = String(item.barcode || '').trim();
      if (!barcode) continue;
      await StockItem.findOneAndUpdate({ barcode }, { status: 'returned', returnedInReturn: returnDoc._id });
    }

    // Replacement items: mark StockItem sold and decrement master Product aggregates (same as billing)
    for (const item of replacementItems) {
      const barcode = String(item.barcode || '').trim();
      const productId = item.productId || item.product;
      const size = String(item.size || '').trim();
      const qty = Math.max(1, Math.abs(Number(item.quantity || 1)));
      if (qty !== 1) {
        return res.status(400).json({ message: 'Replacement item quantity must be 1 per barcode' });
      }

      const updated = await StockItem.findOneAndUpdate(
        { barcode, status: 'available' },
        { status: 'sold', soldInBill: bill._id }
      );
      if (!updated) {
        return res.status(400).json({ message: `Replacement barcode not available: ${barcode}` });
      }

      const product = await Product.findById(productId);
      if (!product) continue;
      const sizeStock: any[] = Array.isArray((product as any).sizeStock) ? (product as any).sizeStock : [];
      const sizeEntry = sizeStock.find((s) => String(s.size) === size);
      if (sizeEntry) sizeEntry.stock = Math.max(0, Number(sizeEntry.stock || 0) - 1);
      (product as any).totalStock = sizeStock.reduce((sum: number, s: any) => sum + Number(s.stock || 0), 0);
      product.stock = (product as any).totalStock;
      if ((product as any).totalStock === 0) product.isActive = false;
      await product.save();
    }

    bill.status = returnType === 'partial' ? 'partial_replaced' : 'replaced';
    await bill.save();

    const originalPointsEarned = Number((bill as any).pointsEarned || 0);
    if (originalPointsEarned > 0 && returnedTotal > 0) {
      await clawbackPointsOnReturn({
        phone: String(bill.customer?.phone || ''),
        refundAmount: returnedTotal,
        originalPointsEarned,
        billId: bill._id,
        billNumber: String(bill.billNumber || ''),
        createdBy: req.billingAdminId,
        BillingPointsAccount,
        BillingPointsLedger,
      });
    }

    await triggerRevalidate(['/', '/products']);
    // Ensure key fields are always present in response JSON
    return res.status(201).json({ ...returnDoc.toObject(), returnNumber: returnDoc.returnNumber });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Return processing failed' });
  }
});

router.get(
  '/history',
  requireAnyPermission('canReturn', 'canViewReports'),
  async (req, res: Response) => {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
    const skip = (page - 1) * limit;
    const search = String(req.query.search || '').trim();
    const startDate = String(req.query.startDate || '').trim();
    const endDate = String(req.query.endDate || '').trim();

    const query: Record<string, unknown> = {};
    if (search) {
      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [{ returnNumber: regex }, { billNumber: regex }, { 'customer.name': regex }, { 'customer.phone': regex }];
    }
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) (query.createdAt as any).$gte = new Date(`${startDate}T00:00:00.000Z`);
      if (endDate) (query.createdAt as any).$lte = new Date(`${endDate}T23:59:59.999Z`);
    }

    const [data, total] = await Promise.all([
      BillingReturn.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('processedBy', 'name email')
        .lean(),
      BillingReturn.countDocuments(query),
    ]);

    res.json({
      data: data.map((row: any) => ({
        ...row,
        processedByName: row.processedBy?.name || '',
      })),
      total,
      page,
      limit,
    });
  }
);

router.get('/:id', requireAnyPermission('canReturn', 'canViewReports'), async (req, res: Response) => {
  const item = await BillingReturn.findById(req.params.id).populate('processedBy', 'name email').lean();
  if (!item) return res.status(404).json({ message: 'Return not found' });
  res.json({ ...item, processedByName: (item as any).processedBy?.name || '' });
});

export default router;
