import express, { Response } from 'express';
import Bill from '../models/Bill';
import BillingReturn from '../models/Return';
import Product from '../models/Product';
import StockItem from '../models/StockItem';
import { BillingAuthRequest } from '../middleware/billingAuthMiddleware';
import { requireAdmin, requirePermission } from '../middleware/billingRoleMiddleware';
import { triggerRevalidate } from '../lib/revalidateFrontend';

const router = express.Router();
router.use(requireAdmin);
router.use(requirePermission('canReturn'));

const generateReturnNumber = async () => {
  const year = new Date().getFullYear();
  const prefix = `SW-RET-${year}-`;
  const latest = await BillingReturn.findOne({ returnNumber: new RegExp(`^${prefix}`) }).sort({ createdAt: -1 });
  const current = latest?.returnNumber ? Number(latest.returnNumber.split('-')[3]) : 0;
  return `${prefix}${String(current + 1).padStart(4, '0')}`;
};

router.get('/next-number', async (_req, res: Response) => {
  const returnNumber = await generateReturnNumber();
  return res.json({ returnNumber });
});

router.get('/scan/:barcode', async (req, res: Response) => {
  const bill = await Bill.findOne({ 'items.barcode': req.params.barcode, status: 'completed' });
  if (!bill) return res.status(404).json({ message: 'Sale record not found for this barcode' });
  return res.json(bill);
});

router.post('/', async (req: BillingAuthRequest, res: Response) => {
  try {
    const { billId, returnedItems = [], replacementItems = [], returnType } = req.body || {};
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

    const returnedTotal = returnedItems.reduce(
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
      returnedItems,
      replacementItems,
      returnType,
      priceDifference,
      refundAmount: 0,
      refundMethod: 'none',
      processedBy: req.billingAdminId,
    });

    // Returned items: mark StockItem as returned (manual inspection before restock)
    for (const item of returnedItems) {
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

    await triggerRevalidate(['/', '/products']);
    // Ensure key fields are always present in response JSON
    return res.status(201).json({ ...returnDoc.toObject(), returnNumber: returnDoc.returnNumber });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Return processing failed' });
  }
});

router.get('/', async (req, res: Response) => {
  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 20);
  const skip = (page - 1) * limit;
  const [data, total] = await Promise.all([
    BillingReturn.find({}).sort({ createdAt: -1 }).skip(skip).limit(limit),
    BillingReturn.countDocuments({}),
  ]);
  res.json({ data, total, page, limit });
});

router.get('/:id', async (req, res: Response) => {
  const item = await BillingReturn.findById(req.params.id);
  if (!item) return res.status(404).json({ message: 'Return not found' });
  res.json(item);
});

export default router;
