import express, { Response } from 'express';
import mongoose from 'mongoose';
import Bill from '../models/Bill';
import Product from '../models/Product';
import StockItem from '../models/StockItem';
import { BillingAuthRequest, billingAuthMiddleware } from '../middleware/billingAuthMiddleware';
import { requireSuperAdmin } from '../middleware/billingRoleMiddleware';
import { triggerRevalidate } from '../lib/revalidateFrontend';

const router = express.Router();

const canEditBills = (admin: any) =>
  admin?.role === 'superadmin' || (admin?.role === 'admin' && Boolean(admin?.permissions?.canEditBills));

const enforceDiscountLimit = (req: BillingAuthRequest, payload: any) => {
  const role = req.billingAdmin?.role;
  const permissions = req.billingAdmin?.permissions || {};
  if (role === 'superadmin') return;

  const maxPercent = Math.max(0, Number(permissions.maxDiscountPercent || 0));
  const canDiscount = Boolean(permissions.canDiscount);
  const checkPercent = (value: number) => {
    if (value <= 0) return;
    if (!canDiscount) {
      throw new Error('You are not allowed to apply discounts');
    }
    if (value > maxPercent) {
      throw new Error(`Discount cannot exceed ${maxPercent}%`);
    }
  };

  if (String(payload?.billDiscountType || '') === 'percent') {
    checkPercent(Number(payload?.billDiscountValue || 0));
  }
  const items = Array.isArray(payload?.items) ? payload.items : [];
  items.forEach((item: any) => {
    if (String(item?.itemDiscountType || '') === 'percent') {
      checkPercent(Number(item?.itemDiscountValue || 0));
    }
  });
};

const adjustProductSizeStock = async (productId: string, size: string, delta: number) => {
  const product = await Product.findById(productId);
  if (!product) return;

  const sizeStock: any[] = Array.isArray((product as any).sizeStock) ? (product as any).sizeStock : [];
  const existing = sizeStock.find((entry) => String(entry.size || '') === String(size || ''));

  if (existing) {
    existing.stock = Math.max(0, Number(existing.stock || 0) + delta);
  } else if (delta > 0) {
    sizeStock.push({ size: String(size || ''), stock: delta });
  }

  (product as any).sizeStock = sizeStock;
  (product as any).totalStock = sizeStock.reduce((sum: number, entry: any) => sum + Number(entry.stock || 0), 0);
  product.stock = (product as any).totalStock;
  product.isActive = (product as any).totalStock > 0;
  await product.save();
};

const calculateBillTotals = (items: any[], billDiscountType: string, billDiscountValue: number) => {
  const normalizedItems = (items || []).map((item) => {
    const mrp = Number(item.mrp ?? item.price ?? 0);
    const quantity = Math.max(1, Number(item.quantity || 1));
    const discountType = item.itemDiscountType || 'none';
    const discountValue = Number(item.itemDiscountValue || 0);
    const itemDiscountAmount =
      discountType === 'percent' ? (mrp * discountValue) / 100 : discountType === 'amount' ? discountValue : 0;
    const sellingPrice = Math.max(0, mrp - itemDiscountAmount);
    const lineTotal = sellingPrice * quantity;
    return { ...item, mrp, quantity, itemDiscountType: discountType, itemDiscountValue: discountValue, itemDiscountAmount, sellingPrice, lineTotal };
  });

  const subtotal = normalizedItems.reduce((sum, item) => sum + item.mrp * item.quantity, 0);
  const totalItemDiscount = normalizedItems.reduce((sum, item) => sum + item.itemDiscountAmount * item.quantity, 0);
  const afterItemDiscount = subtotal - totalItemDiscount;
  const safeBillDiscountValue = Number(billDiscountValue || 0);
  const billDiscountAmount =
    billDiscountType === 'percent'
      ? (afterItemDiscount * safeBillDiscountValue) / 100
      : billDiscountType === 'amount'
      ? safeBillDiscountValue
      : 0;
  const taxableAmount = Math.max(0, afterItemDiscount - billDiscountAmount);
  const gstAmount = taxableAmount * 0.05;
  const cgst = gstAmount / 2;
  const sgst = gstAmount / 2;
  const rawTotal = taxableAmount + gstAmount;
  const roundOff = Math.round(rawTotal) - rawTotal;
  const totalAmount = Math.round(rawTotal);
  return {
    normalizedItems,
    subtotal,
    totalItemDiscount,
    billDiscountAmount,
    taxableAmount,
    gstAmount,
    cgst,
    sgst,
    roundOff,
    totalAmount,
  };
};

const generateBillNumber = async () => {
  const year = new Date().getFullYear();
  const prefix = `SW-${year}-`;
  const latest = await Bill.findOne({ billNumber: new RegExp(`^${prefix}`) }).sort({ createdAt: -1 });
  const current = latest?.billNumber ? Number(latest.billNumber.split('-')[2]) : 0;
  return `${prefix}${String(current + 1).padStart(4, '0')}`;
};

router.get('/next-number', async (_req, res: Response) => {
  const billNumber = await generateBillNumber();
  return res.json({ billNumber });
});

router.get('/scan/:barcode', async (req, res: Response) => {
  const barcode = String(req.params.barcode || '').trim();
  const stockItem = await StockItem.findOne({ barcode, status: 'available' }).populate(
    'product',
    'name category billingSubCategory'
  );
  if (!stockItem) {
    return res.status(404).json({ error: 'Barcode not found or already sold' });
  }

  const product: any = stockItem.product;
  return res.json({
    stockItemId: stockItem._id,
    barcode: stockItem.barcode,
    productId: product?._id,
    _id: product?._id, // backwards-compatible for existing frontend store
    name: product?.name || '',
    category: product?.category || '',
    size: stockItem.size,
    mrp: stockItem.sellingPrice,
    incomingPrice: stockItem.incomingPrice,
    stock: 1,
  });
});

router.get('/search', billingAuthMiddleware, async (req, res: Response) => {
  const q = (req.query.q as string) || '';
  if (!q || q.trim().length < 2) return res.json([]);

  const regex = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const results = await StockItem.aggregate([
    { $match: { status: 'available' } },
    {
      $lookup: {
        from: 'products',
        localField: 'product',
        foreignField: '_id',
        as: 'productData',
      },
    },
    { $unwind: '$productData' },
    {
      $match: {
        'productData.isBillingProduct': true,
        'productData.isActive': true,
        $or: [
          { 'productData.name': regex },
          { 'productData.billingName': regex },
          { 'productData.tags': regex },
          { 'productData.category': regex },
          { 'productData.subCategory': regex },
        ],
      },
    },
    {
      $group: {
        _id: { product: '$productData._id', size: '$size' },
        productId: { $first: '$productData._id' },
        name: { $first: { $ifNull: ['$productData.billingName', '$productData.name'] } },
        category: { $first: '$productData.category' },
        subCategory: { $first: '$productData.subCategory' },
        price: { $first: '$sellingPrice' },
        discountPrice: { $first: '$productData.discountPrice' },
        stock: { $sum: 1 },
        barcode: { $first: '$barcode' },
        size: { $first: '$size' },
        createdAt: { $min: '$createdAt' },
      },
    },
    { $sort: { createdAt: 1 } },
    { $limit: 10 },
  ]);

  return res.json(
    (results || []).map((item: any) => ({
      _id: item.productId,
      productId: item.productId,
      name: item.name,
      barcode: item.barcode,
      size: item.size || '',
      price: Number(item.price || 0),
      discountPrice: Number(item.discountPrice || 0),
      stock: Number(item.stock || 0),
      category: item.category || '',
      subCategory: item.subCategory || '',
    }))
  );
});

router.post('/calculate', async (req, res: Response) => {
  const { items, billDiscountType, billDiscountValue } = req.body || {};
  const totals = calculateBillTotals(items || [], billDiscountType || 'none', Number(billDiscountValue || 0));
  return res.json({
    subtotal: totals.subtotal,
    itemDiscounts: totals.totalItemDiscount,
    billDiscount: totals.billDiscountAmount,
    taxableAmount: totals.taxableAmount,
    gst: totals.gstAmount,
    cgst: totals.cgst,
    sgst: totals.sgst,
    roundOff: totals.roundOff,
    total: totals.totalAmount,
  });
});

router.post('/hold', billingAuthMiddleware, async (req: BillingAuthRequest, res: Response) => {
  const payload = req.body || {};
  try {
    enforceDiscountLimit(req, payload);
  } catch (error: any) {
    return res.status(403).json({ message: error.message || 'Discount permission denied' });
  }
  const totals = calculateBillTotals(payload.items || [], payload.billDiscountType || 'none', Number(payload.billDiscountValue || 0));
  const bill = await Bill.create({
    ...payload,
    items: totals.normalizedItems,
    subtotal: totals.subtotal,
    totalItemDiscount: totals.totalItemDiscount,
    billDiscountAmount: totals.billDiscountAmount,
    taxableAmount: totals.taxableAmount,
    gstAmount: totals.gstAmount,
    cgst: totals.cgst,
    sgst: totals.sgst,
    roundOff: totals.roundOff,
    totalAmount: totals.totalAmount,
    status: 'held',
    createdBy: req.billingAdminId,
  });
  return res.status(201).json(bill);
});

router.get('/held', billingAuthMiddleware, async (req: BillingAuthRequest, res: Response) => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const query: any = { status: 'held', createdAt: { $gte: start } };
  if (req.billingAdmin?.role === 'cashier') query.createdBy = req.billingAdminId;
  const heldBills = await Bill.find(query).sort({ createdAt: -1 });
  res.json(heldBills);
});

router.delete('/held/:id', billingAuthMiddleware, async (req: BillingAuthRequest, res: Response) => {
  const query: any = { _id: req.params.id };
  if (req.billingAdmin?.role === 'cashier') query.createdBy = req.billingAdminId;
  await Bill.findOneAndDelete(query);
  res.json({ message: 'Held bill discarded' });
});

router.post('/complete', billingAuthMiddleware, async (req: BillingAuthRequest, res: Response) => {
  try {
    const payload = req.body || {};
    enforceDiscountLimit(req, payload);
    const totals = calculateBillTotals(payload.items || [], payload.billDiscountType || 'none', Number(payload.billDiscountValue || 0));
    const paymentBreakdown = Array.isArray(payload.paymentBreakdown)
      ? payload.paymentBreakdown
      : [
          ...(Number(payload.splitPayment?.cash || 0) > 0 ? [{ method: 'cash', amount: Number(payload.splitPayment.cash || 0) }] : []),
          ...(Number(payload.splitPayment?.gpay || 0) > 0 ? [{ method: 'gpay', amount: Number(payload.splitPayment.gpay || 0) }] : []),
        ];
    const paymentMethod = payload.paymentMethod || 'cash';

    if (paymentMethod === 'partial') {
      if (!paymentBreakdown.length) {
        return res.status(400).json({ error: 'At least one payment split is required for partial payment' });
      }
      const hasInvalidAmount = paymentBreakdown.some((entry: any) => Number(entry?.amount || 0) <= 0);
      if (hasInvalidAmount) {
        return res.status(400).json({ error: 'Each payment split amount must be greater than 0' });
      }
      const methods = paymentBreakdown.map((entry: any) => String(entry?.method || ''));
      if (new Set(methods).size !== methods.length) {
        return res.status(400).json({ error: 'Duplicate payment methods are not allowed in partial payment' });
      }
      const totalPaid = paymentBreakdown.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
      const diff = Math.abs(totalPaid - totals.totalAmount);
      if (diff > 1) {
        return res.status(400).json({
          error: `Payment mismatch: paid ₹${totalPaid}, bill is ₹${totals.totalAmount}`,
        });
      }
    }

    const cashPortion =
      paymentMethod === 'partial'
        ? paymentBreakdown
            .filter((entry: any) => String(entry?.method || '') === 'cash')
            .reduce((sum: number, entry: any) => sum + Number(entry.amount || 0), 0)
        : paymentMethod === 'cash'
        ? totals.totalAmount
        : 0;
    const billNumber = await generateBillNumber();

    const completed = await Bill.create({
      ...payload,
      paymentMethod,
      paymentBreakdown,
      billNumber,
      items: totals.normalizedItems,
      subtotal: totals.subtotal,
      totalItemDiscount: totals.totalItemDiscount,
      billDiscountAmount: totals.billDiscountAmount,
      taxableAmount: totals.taxableAmount,
      gstAmount: totals.gstAmount,
      cgst: totals.cgst,
      sgst: totals.sgst,
      roundOff: totals.roundOff,
      totalAmount: totals.totalAmount,
      changeReturned: Math.max(0, Number(payload.cashReceived || 0) - cashPortion),
      status: 'completed',
      completedAt: new Date(),
      createdBy: req.billingAdminId,
    });

    for (const item of totals.normalizedItems) {
      const productId = item.productId || item.product;
      const barcode = String(item.barcode || '').trim();
      const size = String(item.size || '').trim();
      const quantity = Math.max(1, Number(item.quantity || 1));

      if (quantity !== 1) {
        return res.status(400).json({ message: `Quantity must be 1 per barcode (${barcode})` });
      }

      const updated = await StockItem.findOneAndUpdate(
        { barcode, status: 'available' },
        { status: 'sold', soldInBill: completed._id }
      );
      if (!updated) {
        return res.status(400).json({ message: `Barcode not available: ${barcode}` });
      }

      const product = await Product.findById(productId);
      if (!product) continue;

      const sizeStock: any[] = Array.isArray((product as any).sizeStock) ? (product as any).sizeStock : [];
      const sizeEntry = sizeStock.find((s) => String(s.size) === size);
      if (sizeEntry) sizeEntry.stock = Math.max(0, Number(sizeEntry.stock || 0) - quantity);
      (product as any).totalStock = sizeStock.reduce((sum: number, s: any) => sum + Number(s.stock || 0), 0);
      product.stock = (product as any).totalStock;
      if ((product as any).totalStock === 0) product.isActive = false;
      await product.save();
    }

    await triggerRevalidate(['/', '/products']);
    return res.status(201).json(completed);
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Failed to complete bill' });
  }
});

router.get('/', billingAuthMiddleware, async (req: BillingAuthRequest, res: Response) => {
  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 20);
  const skip = (page - 1) * limit;
  const customerPhone = String(req.query.customerPhone || '').trim();
  const query: any = {};
  if (customerPhone) {
    query['customer.phone'] = customerPhone;
  }
  if (req.billingAdmin?.role === 'cashier') query.createdBy = req.billingAdminId;
  const [data, total] = await Promise.all([
    Bill.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Bill.countDocuments(query),
  ]);
  res.json({ data, page, limit, total });
});

router.get('/history', billingAuthMiddleware, async (req: BillingAuthRequest, res: Response) => {
  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.max(1, Math.min(100, Number(req.query.limit || 20)));
  const skip = (page - 1) * limit;
  const search = String(req.query.search || '').trim();
  const status = String(req.query.status || '').trim();
  const paymentMethod = String(req.query.paymentMethod || '').trim();
  const salesmanId = String(req.query.salesmanId || '').trim();
  const startDate = String(req.query.startDate || '').trim();
  const endDate = String(req.query.endDate || '').trim();

  const query: any = {
    status: { $in: ['completed', 'replaced', 'partial_replaced'] },
  };
  if (req.billingAdmin?.role === 'cashier') query.createdBy = req.billingAdminId;

  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'i');
    query.$or = [{ billNumber: regex }, { 'customer.name': regex }, { 'customer.phone': regex }];
  }
  if (status && status !== 'all') {
    query.status = status;
  }
  if (paymentMethod && paymentMethod !== 'all') {
    query.paymentMethod = paymentMethod;
  }
  if (salesmanId && salesmanId !== 'all' && mongoose.Types.ObjectId.isValid(salesmanId)) {
    query.salesman = new mongoose.Types.ObjectId(salesmanId);
  }
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) {
      query.createdAt.$gte = new Date(`${startDate}T00:00:00.000Z`);
    }
    if (endDate) {
      query.createdAt.$lte = new Date(`${endDate}T23:59:59.999Z`);
    }
  }

  const [data, total] = await Promise.all([
    Bill.find(query)
      .populate('salesman', 'name phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Bill.countDocuments(query),
  ]);

  return res.json({ data, total, page, limit });
});

router.put('/:id/edit', billingAuthMiddleware, async (req: BillingAuthRequest, res: Response) => {
  try {
    if (!canEditBills(req.billingAdmin)) {
      return res.status(403).json({ message: 'Permission denied to edit bills' });
    }

    const bill = await Bill.findById(req.params.id);
    if (!bill) return res.status(404).json({ message: 'Bill not found' });
    if (!['completed', 'replaced', 'partial_replaced'].includes(String(bill.status))) {
      return res.status(400).json({ message: 'Only completed or returned bills can be edited' });
    }

    const payload = req.body || {};
    enforceDiscountLimit(req, payload);
    const editReason = String(payload.editReason || '').trim();
    if (!editReason) {
      return res.status(400).json({ message: 'Edit reason is required' });
    }

    const totals = calculateBillTotals(payload.items || [], payload.billDiscountType || 'none', Number(payload.billDiscountValue || 0));
    const paymentBreakdown = Array.isArray(payload.paymentBreakdown)
      ? payload.paymentBreakdown
      : [
          ...(Number(payload.splitPayment?.cash || 0) > 0 ? [{ method: 'cash', amount: Number(payload.splitPayment.cash || 0) }] : []),
          ...(Number(payload.splitPayment?.gpay || 0) > 0 ? [{ method: 'gpay', amount: Number(payload.splitPayment.gpay || 0) }] : []),
        ];
    const paymentMethod = payload.paymentMethod || 'cash';
    if (paymentMethod === 'partial') {
      if (!paymentBreakdown.length) {
        return res.status(400).json({ message: 'At least one payment split is required for partial payment' });
      }
      const hasInvalidAmount = paymentBreakdown.some((entry: any) => Number(entry?.amount || 0) <= 0);
      if (hasInvalidAmount) {
        return res.status(400).json({ message: 'Each payment split amount must be greater than 0' });
      }
      const methods = paymentBreakdown.map((entry: any) => String(entry?.method || ''));
      if (new Set(methods).size !== methods.length) {
        return res.status(400).json({ message: 'Duplicate payment methods are not allowed in partial payment' });
      }
      const totalPaid = paymentBreakdown.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
      const diff = Math.abs(totalPaid - totals.totalAmount);
      if (diff > 1) {
        return res.status(400).json({
          message: `Payment mismatch: paid ₹${totalPaid}, bill is ₹${totals.totalAmount}`,
        });
      }
    }
    const cashPortion =
      paymentMethod === 'partial'
        ? paymentBreakdown
            .filter((entry: any) => String(entry?.method || '') === 'cash')
            .reduce((sum: number, entry: any) => sum + Number(entry.amount || 0), 0)
        : paymentMethod === 'cash'
        ? totals.totalAmount
        : 0;
    const originalItems = Array.isArray((bill as any).items) ? (bill as any).items : [];
    const previousTotal = Number((bill as any).totalAmount || 0);

    const originalBarcodes = new Set(originalItems.map((item: any) => String(item.barcode || '').trim()).filter(Boolean));
    const updatedBarcodes = new Set(
      totals.normalizedItems.map((item: any) => String(item.barcode || '').trim()).filter(Boolean)
    );

    const removedItems = originalItems.filter((item: any) => {
      const barcode = String(item.barcode || '').trim();
      return barcode && !updatedBarcodes.has(barcode);
    });
    const addedItems = totals.normalizedItems.filter((item: any) => {
      const barcode = String(item.barcode || '').trim();
      return barcode && !originalBarcodes.has(barcode);
    });

    for (const item of removedItems) {
      const barcode = String(item.barcode || '').trim();
      const released = await StockItem.findOneAndUpdate(
        { barcode, soldInBill: bill._id },
        { status: 'available', soldInBill: null }
      );
      if (!released) {
        return res.status(400).json({ message: `Unable to release stock item ${barcode}` });
      }
      const productId = String(item.product || item.productId || released.product || '');
      await adjustProductSizeStock(productId, String(item.size || released.size || ''), 1);
    }

    for (const item of addedItems) {
      const barcode = String(item.barcode || '').trim();
      const sold = await StockItem.findOneAndUpdate(
        { barcode, status: 'available' },
        { status: 'sold', soldInBill: bill._id }
      );
      if (!sold) {
        return res.status(400).json({ message: `Barcode not available: ${barcode}` });
      }
      const productId = String(item.product || item.productId || sold.product || '');
      await adjustProductSizeStock(productId, String(item.size || sold.size || ''), -1);
    }

    (bill as any).customer = payload.customer || { name: '', phone: '' };
    (bill as any).salesman = payload.salesmanId || null;
    (bill as any).paymentMethod = paymentMethod;
    (bill as any).paymentBreakdown = paymentBreakdown;
    (bill as any).items = totals.normalizedItems;
    (bill as any).billDiscountType = payload.billDiscountType || 'none';
    (bill as any).billDiscountValue = Number(payload.billDiscountValue || 0);
    (bill as any).subtotal = totals.subtotal;
    (bill as any).totalItemDiscount = totals.totalItemDiscount;
    (bill as any).billDiscountAmount = totals.billDiscountAmount;
    (bill as any).taxableAmount = totals.taxableAmount;
    (bill as any).gstAmount = totals.gstAmount;
    (bill as any).cgst = totals.cgst;
    (bill as any).sgst = totals.sgst;
    (bill as any).roundOff = totals.roundOff;
    (bill as any).totalAmount = totals.totalAmount;
    (bill as any).cashReceived = Number(payload.cashReceived || 0);
    (bill as any).changeReturned = Math.max(0, Number(payload.cashReceived || 0) - cashPortion);
    (bill as any).editHistory = [
      ...((bill as any).editHistory || []),
      {
        editedAt: new Date(),
        editedBy: req.billingAdminId,
        editReason,
        previousTotal,
        newTotal: totals.totalAmount,
      },
    ];

    await bill.save();

    await triggerRevalidate(['/', '/products', '/history', '/reports', '/billing']);
    const populated = await Bill.findById(bill._id).populate('salesman', 'name phone');
    return res.json(populated);
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Failed to edit bill' });
  }
});

router.get('/number/:billNumber', billingAuthMiddleware, async (req: BillingAuthRequest, res: Response) => {
  const query: any = { billNumber: req.params.billNumber };
  if (req.billingAdmin?.role === 'cashier') query.createdBy = req.billingAdminId;
  const bill = await Bill.findOne(query);
  if (!bill) return res.status(404).json({ message: 'Bill not found' });
  return res.json(bill);
});

router.get('/:id', billingAuthMiddleware, async (req: BillingAuthRequest, res: Response) => {
  const query: any = { _id: req.params.id };
  if (req.billingAdmin?.role === 'cashier') query.createdBy = req.billingAdminId;
  const bill = await Bill.findOne(query);
  if (!bill) return res.status(404).json({ message: 'Bill not found' });
  return res.json(bill);
});

router.delete('/:id', billingAuthMiddleware, requireSuperAdmin, async (req, res: Response) => {
  const bill = await Bill.findByIdAndDelete(req.params.id);
  if (!bill) return res.status(404).json({ message: 'Bill not found' });
  return res.json({ message: 'Bill deleted' });
});

export default router;
