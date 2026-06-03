import express, { Response } from 'express';
import mongoose from 'mongoose';
import Bill from '../models/Bill';
import BillingReturn from '../models/Return';
import Product from '../models/Product';
import StockItem from '../models/StockItem';
import { BillingAuthRequest, billingAuthMiddleware } from '../middleware/billingAuthMiddleware';
import { requireSuperAdmin } from '../middleware/billingRoleMiddleware';
import { triggerRevalidate } from '../lib/revalidateFrontend';
import BillingPointsAccount from '../models/BillingPointsAccount';
import BillingPointsLedger from '../models/BillingPointsLedger';
import {
  applyPointsLedger,
  normalizeBillingPhone,
  validatePointsForBill,
  type PointsMode,
} from '../lib/billing-points';
import { activeBillItems } from '../lib/billing-replacements';

const router = express.Router();

/** GST is added on top of MRP subtotal; shop discounts are then subtracted from (subtotal + GST). */
const BILLING_GST_RATE = 0.05;

const canEditBills = (admin: any) =>
  admin?.role === 'superadmin' || Boolean(admin?.permissions?.canEditBills);

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

/** All unit barcodes on a bill line (supports multi-qty lines). */
const collectItemBarcodes = (item: any): string[] => {
  if (Array.isArray(item?.barcodes) && item.barcodes.length > 0) {
    return item.barcodes.map((value: string) => String(value || '').trim()).filter(Boolean);
  }
  const single = String(item?.barcode || '').trim();
  return single ? [single] : [];
};

const barcodeSetFromItems = (items: any[]) => {
  const set = new Set<string>();
  for (const item of items || []) {
    collectItemBarcodes(item).forEach((code) => set.add(code));
  }
  return set;
};

const findOriginalItemForBarcode = (items: any[], barcode: string) => {
  const code = String(barcode || '').trim();
  if (!code) return null;
  return (
    (items || []).find((item) => collectItemBarcodes(item).includes(code)) ||
    (items || []).find((item) => String(item?.barcode || '').trim() === code) ||
    null
  );
};

/** Keep barcodes aligned with quantity when editing a bill. */
const enrichEditedBillItems = (normalizedItems: any[], originalItems: any[], payloadItems: any[]) => {
  return (normalizedItems || []).map((item) => {
    const primary = String(item.barcode || '').trim();
    const payloadItem =
      (payloadItems || []).find((row) => collectItemBarcodes(row).includes(primary)) ||
      (payloadItems || []).find((row) => String(row?.barcode || '').trim() === primary);
    const originalItem = findOriginalItemForBarcode(originalItems, primary);
    const quantity = Math.max(1, Number(item.quantity || 1));

    let barcodes = collectItemBarcodes(payloadItem || item);
    const originalBarcodes = collectItemBarcodes(originalItem);
    if (originalBarcodes.length > 0) {
      if (originalBarcodes.includes(primary)) {
        barcodes = originalBarcodes.slice(0, quantity);
      } else if (barcodes.length === 0) {
        barcodes = originalBarcodes.slice(0, quantity);
      }
    }
    if (barcodes.length > quantity) barcodes = barcodes.slice(0, quantity);
    if (barcodes.length === 0 && primary) barcodes = [primary];

    return {
      ...item,
      quantity,
      barcode: barcodes[0] || primary,
      barcodes,
    };
  });
};

const calculateBillTotals = (
  items: any[],
  billDiscountType: string,
  billDiscountValue: number,
  pointsDiscountAmount = 0
) => {
  const normalizedItems = (items || []).map((item) => {
    const mrp = Number(item.mrp ?? item.price ?? 0);
    const quantity = Math.max(1, Number(item.quantity || 1));
    const discountType = item.itemDiscountType || 'none';
    const discountValue = Number(item.itemDiscountValue || 0);
    const itemDiscountAmount =
      discountType === 'percent' ? (mrp * discountValue) / 100 : discountType === 'amount' ? discountValue : 0;
    const sellingPrice = Math.max(0, mrp - itemDiscountAmount);
    const lineTotal = sellingPrice * quantity;
    return {
      ...item,
      mrp,
      quantity,
      itemDiscountType: discountType,
      itemDiscountValue: discountValue,
      itemDiscountAmount,
      billDiscountShare: 0,
      sellingPrice,
      lineTotal,
      netLineTotal: lineTotal,
    };
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
  const effectiveBillDiscount = Math.min(Math.max(0, billDiscountAmount), Math.max(0, afterItemDiscount));
  const withBillDiscount = normalizedItems.map((item) => ({ ...item }));
  if (withBillDiscount.length > 0 && effectiveBillDiscount > 0 && afterItemDiscount > 0) {
    let assigned = 0;
    withBillDiscount.forEach((item, index) => {
      const proportionalShare =
        index === withBillDiscount.length - 1
          ? effectiveBillDiscount - assigned
          : Number(((item.lineTotal / afterItemDiscount) * effectiveBillDiscount).toFixed(2));
      const safeShare = Math.max(0, Math.min(item.lineTotal, proportionalShare));
      item.billDiscountShare = safeShare;
      item.netLineTotal = Math.max(0, Number((item.lineTotal - safeShare).toFixed(2)));
      assigned += safeShare;
    });
  }
  const taxableAmount = Math.max(0, subtotal);
  const gstAmount = taxableAmount * BILLING_GST_RATE;
  const cgst = gstAmount / 2;
  const sgst = gstAmount / 2;
  const grossWithGst = taxableAmount + gstAmount;
  const totalDiscount = totalItemDiscount + effectiveBillDiscount;
  const prePointsRaw = Math.max(0, grossWithGst - totalDiscount);
  const prePointsTotal = Math.round(prePointsRaw);
  const safePointsDiscount = Math.min(Math.max(0, pointsDiscountAmount), prePointsTotal);
  const rawTotal = Math.max(0, prePointsRaw - safePointsDiscount);
  const roundOff = Math.round(rawTotal) - rawTotal;
  const totalAmount = Math.round(rawTotal);
  return {
    normalizedItems: withBillDiscount,
    subtotal,
    totalItemDiscount,
    billDiscountAmount: effectiveBillDiscount,
    taxableAmount,
    gstAmount,
    cgst,
    sgst,
    roundOff,
    prePointsTotal,
    pointsDiscountAmount: safePointsDiscount,
    totalAmount,
  };
};

const resolvePointsForPayload = async (payload: any, prePointsTotal: number) => {
  const phone = String(payload?.customer?.phone || '');
  const requestedMode = String(payload?.pointsMode || 'earn') as PointsMode;
  const awardPoints = payload?.awardPoints !== false;
  const pointsToRedeem = Math.floor(Number(payload?.pointsToRedeem || payload?.pointsRedeemed || 0));

  let balance = 0;
  const normalized = normalizeBillingPhone(phone);
  if (normalized.length >= 10) {
    const account = await BillingPointsAccount.findOne({ phone: normalized }).lean();
    balance = Number(account?.balance || 0);
  }

  const mode: PointsMode =
    requestedMode === 'redeem' && pointsToRedeem > 0
      ? 'redeem'
      : requestedMode === 'earn'
      ? 'earn'
      : 'none';

  const validated = validatePointsForBill({
    pointsMode: mode,
    awardPoints,
    pointsToRedeem,
    prePointsTotal,
    balance,
    phone,
  });

  const storedMode: PointsMode =
    validated.pointsRedeemed > 0 ? 'redeem' : validated.pointsEarned > 0 || (mode === 'earn' && awardPoints) ? 'earn' : 'none';

  return {
    ...validated,
    pointsMode: storedMode,
    awardPoints: mode === 'earn' && awardPoints,
    normalizedPhone: normalized,
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

const countAvailableStock = async (productId: string, size: string) =>
  StockItem.countDocuments({
    product: new mongoose.Types.ObjectId(productId),
    status: 'available',
    ...(size ? { size } : {}),
  });

const scanStockItemResponse = async (stockItem: any) => {
  const product: any = stockItem.product;
  const productId = String(product?._id || stockItem.product || '');
  const size = String(stockItem.size || '');
  const availableStock = productId ? await countAvailableStock(productId, size) : 1;
  return {
    stockItemId: stockItem._id,
    barcode: stockItem.barcode,
    productId: product?._id,
    _id: product?._id, // backwards-compatible for existing frontend store
    name: product?.name || '',
    category: product?.category || '',
    size: stockItem.size,
    mrp: stockItem.sellingPrice,
    incomingPrice: stockItem.incomingPrice,
    stock: availableStock,
  };
};

router.get('/scan/:barcode', async (req, res: Response) => {
  const barcode = String(req.params.barcode || '').trim();
  const stockItem = await StockItem.findOne({ barcode, status: 'available' }).populate(
    'product',
    'name category billingSubCategory'
  );
  if (!stockItem) {
    return res.status(404).json({ error: 'Barcode not found or already sold' });
  }

  return res.json(await scanStockItemResponse(stockItem));
});

router.get('/next-barcode', async (req, res: Response) => {
  const productId = String(req.query.productId || '').trim();
  const size = String(req.query.size || '').trim();
  const exclude = String(req.query.exclude || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
    return res.status(400).json({ message: 'Valid productId is required' });
  }

  const match: any = {
    product: new mongoose.Types.ObjectId(productId),
    status: 'available',
    ...(exclude.length ? { barcode: { $nin: exclude } } : {}),
  };
  if (size) match.size = size;

  const stockItem = await StockItem.findOne(match)
    .sort({ barcode: 1 })
    .populate('product', 'name category billingSubCategory');

  if (!stockItem) {
    return res.status(404).json({ message: 'No more stock available for this item' });
  }

  return res.json(await scanStockItemResponse(stockItem));
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
      $lookup: {
        from: 'suppliers',
        localField: 'productData.supplier',
        foreignField: '_id',
        as: 'supplierData',
      },
    },
    {
      $addFields: {
        supplierName: { $ifNull: [{ $arrayElemAt: ['$supplierData.name', 0] }, ''] },
      },
    },
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
          { supplierName: regex },
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
        supplier: { $first: '$supplierName' },
        price: { $first: '$sellingPrice' },
        discountPrice: { $first: '$productData.discountPrice' },
        stock: { $sum: 1 },
        barcode: { $first: '$barcode' },
        barcodes: { $addToSet: '$barcode' },
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
      barcodes: item.barcodes || [],
      size: item.size || '',
      price: Number(item.price || 0),
      discountPrice: Number(item.discountPrice || 0),
      stock: Number(item.stock || 0),
      category: item.category || '',
      subCategory: item.subCategory || '',
      supplier: item.supplier || '',
    }))
  );
});

const CUSTOMER_BILL_STATUSES = ['completed', 'replaced', 'partial_replaced', 'returned', 'partial_return', 'held'];

router.get('/customers/search', async (req, res: Response) => {
  const q = String(req.query.q || '').trim();
  if (!q || q.length < 2) return res.json([]);

  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(escaped, 'i');

  const results = await Bill.aggregate([
    {
      $match: {
        status: { $in: CUSTOMER_BILL_STATUSES },
        'customer.phone': { $exists: true, $ne: '' },
        $or: [{ 'customer.name': regex }, { 'customer.phone': regex }],
      },
    },
    { $sort: { createdAt: 1 } },
    {
      $group: {
        _id: '$customer.phone',
        name: { $last: '$customer.name' },
        phone: { $first: '$customer.phone' },
        totalBills: { $sum: 1 },
        lastVisit: { $max: '$createdAt' },
      },
    },
    { $sort: { lastVisit: -1 } },
    { $limit: 10 },
  ]);

  const rows = results || [];
  const phones = rows.map((row: any) => normalizeBillingPhone(String(row.phone || row._id || ''))).filter((p) => p.length >= 10);
  const accounts =
    phones.length > 0
      ? await BillingPointsAccount.find({ phone: { $in: phones } })
          .select('phone balance')
          .lean()
      : [];
  const balanceByPhone = new Map(accounts.map((a: any) => [a.phone, Number(a.balance || 0)]));

  return res.json(
    rows.map((row: any) => {
      const phone = String(row.phone || row._id || '').trim();
      const normalized = normalizeBillingPhone(phone);
      return {
        name: String(row.name || '').trim() || 'Customer',
        phone,
        totalBills: Number(row.totalBills || 0),
        lastVisit: row.lastVisit,
        pointsBalance: balanceByPhone.get(normalized) ?? 0,
      };
    })
  );
});

router.post('/calculate', async (req, res: Response) => {
  const { items, billDiscountType, billDiscountValue, pointsDiscountAmount } = req.body || {};
  const totals = calculateBillTotals(
    items || [],
    billDiscountType || 'none',
    Number(billDiscountValue || 0),
    Number(pointsDiscountAmount || 0)
  );
  return res.json({
    subtotal: totals.subtotal,
    itemDiscounts: totals.totalItemDiscount,
    billDiscount: totals.billDiscountAmount,
    taxableAmount: totals.taxableAmount,
    gst: totals.gstAmount,
    cgst: totals.cgst,
    sgst: totals.sgst,
    roundOff: totals.roundOff,
    prePointsTotal: totals.prePointsTotal,
    pointsDiscountAmount: totals.pointsDiscountAmount,
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
  const baseTotals = calculateBillTotals(
    payload.items || [],
    payload.billDiscountType || 'none',
    Number(payload.billDiscountValue || 0)
  );
  let pointsResolved: any = { pointsEarned: 0, pointsRedeemed: 0, pointsDiscountAmount: 0, pointsMode: 'none', awardPoints: false };
  try {
    pointsResolved = await resolvePointsForPayload(payload, baseTotals.prePointsTotal);
    if (pointsResolved.error) {
      return res.status(400).json({ message: pointsResolved.error });
    }
  } catch (error: any) {
    return res.status(400).json({ message: error.message || 'Invalid points' });
  }
  const totals = calculateBillTotals(
    payload.items || [],
    payload.billDiscountType || 'none',
    Number(payload.billDiscountValue || 0),
    pointsResolved.pointsDiscountAmount
  );
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
    pointsMode: pointsResolved.pointsMode,
    awardPoints: pointsResolved.awardPoints,
    pointsEarned: 0,
    pointsRedeemed: pointsResolved.pointsRedeemed,
    pointsDiscountAmount: totals.pointsDiscountAmount,
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
    const baseTotals = calculateBillTotals(
      payload.items || [],
      payload.billDiscountType || 'none',
      Number(payload.billDiscountValue || 0)
    );
    const pointsResolved = await resolvePointsForPayload(payload, baseTotals.prePointsTotal);
    if (pointsResolved.error) {
      return res.status(400).json({ message: pointsResolved.error });
    }
    const totals = calculateBillTotals(
      payload.items || [],
      payload.billDiscountType || 'none',
      Number(payload.billDiscountValue || 0),
      pointsResolved.pointsDiscountAmount
    );
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
      pointsMode: pointsResolved.pointsMode,
      awardPoints: pointsResolved.awardPoints,
      pointsEarned: pointsResolved.pointsEarned,
      pointsRedeemed: pointsResolved.pointsRedeemed,
      pointsDiscountAmount: totals.pointsDiscountAmount,
      changeReturned: Math.max(0, Number(payload.cashReceived || 0) - cashPortion),
      status: 'completed',
      completedAt: new Date(),
      createdBy: req.billingAdminId,
    });

    if (
      pointsResolved.pointsEarned > 0 ||
      pointsResolved.pointsRedeemed > 0
    ) {
      const balanceAfter = await applyPointsLedger({
        phone: String(payload.customer?.phone || ''),
        customerName: String(payload.customer?.name || ''),
        pointsEarned: pointsResolved.pointsEarned,
        pointsRedeemed: pointsResolved.pointsRedeemed,
        pointsDiscountAmount: totals.pointsDiscountAmount,
        billId: completed._id,
        billNumber,
        createdBy: req.billingAdminId,
        BillingPointsAccount,
        BillingPointsLedger,
      });
      completed.pointsBalanceAfter = balanceAfter;
      await completed.save();
    } else if (pointsResolved.normalizedPhone.length >= 10) {
      const account = await BillingPointsAccount.findOne({ phone: pointsResolved.normalizedPhone }).lean();
      completed.pointsBalanceAfter = Number(account?.balance || 0);
      await completed.save();
    }

    for (const item of totals.normalizedItems) {
      const productId = item.productId || item.product;
      const size = String(item.size || '').trim();
      const barcodes =
        Array.isArray(item.barcodes) && item.barcodes.length > 0
          ? item.barcodes.map((value: string) => String(value || '').trim()).filter(Boolean)
          : [String(item.barcode || '').trim()].filter(Boolean);
      const quantity = Math.max(1, Number(item.quantity || 1));

      if (barcodes.length !== quantity) {
        return res.status(400).json({
          message: `Barcode count (${barcodes.length}) must match quantity (${quantity}) for ${item.name || 'item'}`,
        });
      }

      for (const barcode of barcodes) {
        const updated = await StockItem.findOneAndUpdate(
          { barcode, status: 'available' },
          { status: 'sold', soldInBill: completed._id }
        );
        if (!updated) {
          return res.status(400).json({ message: `Barcode not available: ${barcode}` });
        }
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
      .limit(limit)
      .lean(),
    Bill.countDocuments(query),
  ]);

  const billIds = data.map((row: any) => row._id);
  const returns =
    billIds.length > 0
      ? await BillingReturn.find({ bill: { $in: billIds } })
          .sort({ createdAt: -1 })
          .populate('processedBy', 'name email')
          .lean()
      : [];
  const returnsByBill = returns.reduce((acc: Map<string, any[]>, row: any) => {
    const key = String(row.bill);
    if (!acc.has(key)) acc.set(key, []);
    acc.get(key)!.push({
      ...row,
      processedByName: (row as any).processedBy?.name || '',
    });
    return acc;
  }, new Map());

  return res.json({
    data: data.map((bill: any) => ({
      ...bill,
      returns: returnsByBill.get(String(bill._id)) || [],
    })),
    total,
    page,
    limit,
  });
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

    const originalItems = Array.isArray((bill as any).items) ? (bill as any).items : [];
    const historicalLines = originalItems.filter((item: any) => item.replacedOut);
    const activeOriginal = activeBillItems(bill);
    const payloadItems = (Array.isArray(payload.items) ? payload.items : []).filter(
      (item: any) => !item.replacedOut
    );
    if (payloadItems.length === 0) {
      return res.status(400).json({ message: 'At least one active bill item is required' });
    }
    const baseTotals = calculateBillTotals(
      payloadItems,
      payload.billDiscountType || 'none',
      Number(payload.billDiscountValue || 0)
    );
    const normalizedItems = enrichEditedBillItems(baseTotals.normalizedItems, activeOriginal, payloadItems);
    const totals = calculateBillTotals(
      normalizedItems,
      payload.billDiscountType || 'none',
      Number(payload.billDiscountValue || 0)
    );
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
    const previousTotal = Number((bill as any).totalAmount || 0);

    const originalBarcodeSet = barcodeSetFromItems(activeOriginal);
    const updatedBarcodeSet = barcodeSetFromItems(totals.normalizedItems);
    const removedBarcodes = [...originalBarcodeSet].filter((code) => !updatedBarcodeSet.has(code));
    const addedBarcodes = [...updatedBarcodeSet].filter((code) => !originalBarcodeSet.has(code));

    for (const barcode of removedBarcodes) {
      const released = await StockItem.findOneAndUpdate(
        { barcode, soldInBill: bill._id },
        { status: 'available', soldInBill: null }
      );
      if (!released) {
        return res.status(400).json({ message: `Unable to release stock item ${barcode}` });
      }
      const sourceItem = findOriginalItemForBarcode(originalItems, barcode);
      const productId = String(sourceItem?.product || sourceItem?.productId || released.product || '');
      await adjustProductSizeStock(productId, String(sourceItem?.size || released.size || ''), 1);
    }

    for (const barcode of addedBarcodes) {
      const sold = await StockItem.findOneAndUpdate(
        { barcode, status: 'available' },
        { status: 'sold', soldInBill: bill._id }
      );
      if (!sold) {
        return res.status(400).json({ message: `Barcode not available: ${barcode}` });
      }
      const sourceItem =
        findOriginalItemForBarcode(totals.normalizedItems, barcode) ||
        payloadItems.find((row: any) => collectItemBarcodes(row).includes(barcode));
      const productId = String(sourceItem?.product || sourceItem?.productId || sold.product || '');
      await adjustProductSizeStock(productId, String(sourceItem?.size || sold.size || ''), -1);
    }

    (bill as any).customer = payload.customer || { name: '', phone: '' };
    (bill as any).salesman = payload.salesmanId || null;
    (bill as any).paymentMethod = paymentMethod;
    (bill as any).paymentBreakdown = paymentBreakdown;
    (bill as any).items = [...historicalLines, ...totals.normalizedItems];
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

    bill.markModified('items');
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
