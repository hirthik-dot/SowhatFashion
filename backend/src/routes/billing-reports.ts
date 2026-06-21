import express, { Response } from 'express';
import ExcelJS from 'exceljs';
import mongoose from 'mongoose';
import Bill from '../models/Bill';
import BillingReturn from '../models/Return';
import StockItem from '../models/StockItem';
import { requirePermission } from '../middleware/billingRoleMiddleware';
import {
  BILLING_GST_RATE,
  billRevenueExGst,
  lineRevenueExGst,
} from '../lib/billing-revenue';
import { gstOnAfterItemDiscount } from '../lib/billing-totals';
import { activeBillItems, recalculateBillTotalsFromActiveItems } from '../lib/billing-replacements';
import BillingPointsAccount from '../models/BillingPointsAccount';
import BillingPointsLedger from '../models/BillingPointsLedger';
import { normalizeBillingPhone } from '../lib/billing-points';

const router = express.Router();
router.use(requirePermission('canViewReports'));
const FINALIZED_STATUSES = ['completed', 'replaced', 'partial_replaced', 'returned', 'partial_return'];

const billCashCollected = (bill: any) => {
  const recalculated = recalculateBillTotalsFromActiveItems(bill);
  if (
    recalculated &&
    (String(bill?.status || '').includes('replaced') ||
      (bill?.items || []).some((item: any) => item.isReplacement && !item.replacedOut))
  ) {
    return recalculated.totalAmount;
  }
  return Number(bill?.totalAmount || 0);
};

const gstOnBill = (bill: any) => {
  const active = activeBillItems(bill);
  if (active.length > 0) {
    const subtotal = active.reduce(
      (sum: number, item: any) => sum + Number(item.mrp || 0) * Math.max(1, Number(item.quantity || 1)),
      0
    );
    const totalItemDiscount = active.reduce(
      (sum: number, item: any) =>
        sum + Number(item.itemDiscountAmount || 0) * Math.max(1, Number(item.quantity || 1)),
      0
    );
    return gstOnAfterItemDiscount(subtotal, totalItemDiscount);
  }
  if (Number(bill?.gstAmount || 0) > 0 && Number(bill?.taxableAmount || 0) >= 0) {
    const gstAmount = Number(bill.gstAmount);
    const taxableAmount = Number(bill.taxableAmount);
    return { taxableAmount, gstAmount, cgst: gstAmount / 2, sgst: gstAmount / 2 };
  }
  return gstOnAfterItemDiscount(Number(bill?.subtotal || 0), Number(bill?.totalItemDiscount || 0));
};

const billItemRowFields = {
  barcode: '$$billItem.barcode',
  mrp: '$$billItem.mrp',
  quantity: '$$billItem.quantity',
  netLineTotal: '$$billItem.netLineTotal',
  lineTotal: '$$billItem.lineTotal',
  itemDiscountAmount: '$$billItem.itemDiscountAmount',
  billDiscountShare: '$$billItem.billDiscountShare',
};

/** Per-bill sales value excluding GST.
 *  Revenue = subtotal - totalItemDiscount (customer/bill discount NOT subtracted). */
const billExGstMongoExpr = {
  $max: [
    0,
    {
      $subtract: [
        { $ifNull: ['$subtotal', 0] },
        { $ifNull: ['$totalItemDiscount', 0] },
      ],
    },
  ],
};

/** Bill revenue from line items (stays correct after bill edits).
 *  Revenue = sum of (mrp * qty - itemDiscount * qty) per active line. */
const billRevenueFromItemsMongoExpr = {
  $let: {
    vars: {
      fromItems: {
        $sum: {
          $map: {
            input: {
              $filter: {
                input: { $ifNull: ['$items', []] },
                as: 'item',
                cond: { $ne: [{ $ifNull: ['$$item.replacedOut', false] }, true] },
              },
            },
            as: 'item',
            in: {
              $max: [
                0,
                {
                  $subtract: [
                    {
                      $multiply: [
                        { $ifNull: ['$$item.mrp', 0] },
                        { $max: [1, { $ifNull: ['$$item.quantity', 1] }] },
                      ],
                    },
                    {
                      $multiply: [
                        { $ifNull: ['$$item.itemDiscountAmount', 0] },
                        { $max: [1, { $ifNull: ['$$item.quantity', 1] }] },
                      ],
                    },
                  ],
                },
              ],
            },
          },
        },
      },
    },
    in: {
      $cond: [
        { $gt: [{ $size: { $ifNull: ['$items', []] } }, 0] },
        '$$fromItems',
        billExGstMongoExpr,
      ],
    },
  },
};

/** Count of active bill lines (excludes replaced-out originals). */
const activeBillItemCountMongoExpr = {
  $size: {
    $filter: {
      input: { $ifNull: ['$items', []] },
      as: 'item',
      cond: { $ne: [{ $ifNull: ['$$item.replacedOut', false] }, true] },
    },
  },
};

/** Profit batch: per sold stock unit (not full bill line qty).
 *  Revenue per unit = mrp - itemDiscount (customer/bill discount NOT subtracted). */
const profitLineRevenueExpr = {
  $max: [
    0,
    {
      $subtract: [
        { $ifNull: ['$$matchedBillItem.mrp', '$$soldItem.sellingPrice'] },
        { $ifNull: ['$$matchedBillItem.itemDiscountAmount', 0] },
      ],
    },
  ],
};

const parseDateString = (dateStr: string) => {
  if (dateStr.length === 10 && dateStr.includes('-')) {
    const parts = dateStr.split('-');
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  }
  return new Date(dateStr);
};

const getDateFilter = (startDate?: string, endDate?: string) => {
  const query: any = { status: { $in: FINALIZED_STATUSES } };
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = parseDateString(startDate);
    if (endDate) {
      const end = parseDateString(endDate);
      end.setHours(23, 59, 59, 999);
      query.createdAt.$lte = end;
    }
  }
  return query;
};

const getDateRange = (startDate?: string, endDate?: string) => {
  if (!startDate && !endDate) return null;
  const range: any = {};
  if (startDate) range.$gte = parseDateString(startDate);
  if (endDate) {
    const end = parseDateString(endDate);
    end.setHours(23, 59, 59, 999);
    range.$lte = end;
  }
  return range;
};

router.get('/summary', async (req, res: Response) => {
  const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
  const query = getDateFilter(startDate, endDate);
  const bills = await Bill.find(query).populate('salesman', 'name phone').lean();
  const returnsCount = await BillingReturn.countDocuments(
    startDate || endDate ? { createdAt: (query as any).createdAt || {} } : {}
  );

  const totalRevenue = bills.reduce((sum, bill) => sum + billRevenueExGst(bill), 0);
  const totalPointsCost = bills.reduce((sum, bill) => sum + Number(bill.pointsDiscountAmount || 0), 0);
  const totalPointsRedeemed = bills.reduce((sum, bill) => sum + Number(bill.pointsRedeemed || 0), 0);
  const totalCashCollected = bills.reduce((sum, bill) => sum + billCashCollected(bill), 0);
  const totalBills = bills.length;
  const totalItems = bills.reduce(
    (sum, bill) =>
      sum +
      activeBillItems(bill).reduce((x: number, i: any) => x + Number(i.quantity || 0), 0),
    0
  );
  const totalDiscount = bills.reduce((sum, bill) => sum + Number(bill.totalItemDiscount || 0) + Number(bill.billDiscountAmount || 0), 0);
  // GST is 5% on amount after item discounts.
  const totalGst = bills.reduce((sum, bill) => sum + gstOnBill(bill).gstAmount, 0);
  const totalTaxable = bills.reduce((sum, bill) => sum + gstOnBill(bill).taxableAmount, 0);
  const totalCgst = bills.reduce((sum, bill) => sum + gstOnBill(bill).cgst, 0);
  const totalSgst = bills.reduce((sum, bill) => sum + gstOnBill(bill).sgst, 0);
  const avgBillValue = totalBills ? totalRevenue / totalBills : 0;

  const paymentMethodBreakdown = bills.reduce((acc: any, bill: any) => {
    const method = bill.paymentMethod || 'unknown';
    acc[method] = (acc[method] || 0) + billRevenueExGst(bill);
    return acc;
  }, {});

  const categoryBreakdown = bills.reduce((acc: any, bill: any) => {
    activeBillItems(bill).forEach((item: any) => {
      const key = item.category || 'Uncategorized';
      acc[key] = (acc[key] || 0) + lineRevenueExGst(item);
    });
    return acc;
  }, {});

  const salesmanMap = bills.reduce((acc: Record<string, any>, bill: any) => {
    const salesmanId = bill.salesman?._id?.toString?.() || bill.salesman?.toString?.() || 'unknown';
    if (!acc[salesmanId]) {
      acc[salesmanId] = {
        salesmanId,
        salesmanName: bill.salesman?.name || 'Unknown',
        salesmanPhone: bill.salesman?.phone || '',
        totalBills: 0,
        totalRevenue: 0,
        avgBillValue: 0,
        totalReturns: 0,
      };
    }
    acc[salesmanId].totalBills += 1;
    acc[salesmanId].totalRevenue += billRevenueExGst(bill);
    if (String(bill.status || '').includes('return')) acc[salesmanId].totalReturns += 1;
    return acc;
  }, {});
  const salesmanPerformance = Object.values(salesmanMap).map((row: any) => ({
    ...row,
    avgBillValue: row.totalBills ? row.totalRevenue / row.totalBills : 0,
  }));

  const getLocalDateString = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const dailyRevenueMap = bills.reduce((acc: any, bill: any) => {
    const dayStr = getLocalDateString(new Date(bill.createdAt));
    acc[dayStr] = (acc[dayStr] || 0) + billRevenueExGst(bill);
    return acc;
  }, {});
  
  const dailyRevenue = Object.entries(dailyRevenueMap)
    .map(([day, value]) => ({ day, value }))
    .sort((a: any, b: any) => a.day.localeCompare(b.day));

  return res.json({
    totalRevenue,
    totalPointsCost,
    totalPointsRedeemed,
    totalCashCollected,
    totalBills,
    totalItems,
    totalReturns: returnsCount,
    totalDiscount,
    totalGst,
    totalTaxable,
    totalCgst,
    totalSgst,
    avgBillValue,
    topProducts: [],
    salesmanPerformance,
    paymentMethodBreakdown,
    categoryBreakdown,
    hourlyRevenue: [],
    dailyRevenue,
  });
});

router.get('/bills', async (req, res: Response) => {
  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 20);
  const skip = (page - 1) * limit;
  const { startDate, endDate, search } = req.query as { startDate?: string; endDate?: string; search?: string };
  const query = getDateFilter(startDate, endDate);
  const trimmedSearch = String(search || '').trim();
  if (trimmedSearch) {
    const regex = new RegExp(trimmedSearch, 'i');
    query.$or = [{ billNumber: regex }, { 'customer.name': regex }, { 'customer.phone': regex }];
  }
  const [data, total] = await Promise.all([
    Bill.find(query).populate('salesman', 'name phone').populate('createdBy', 'name').sort({ createdAt: -1 }).skip(skip).limit(limit),
    Bill.countDocuments(query),
  ]);
  res.json({
    data: data.map((bill: any) => ({
      ...bill.toObject(),
      salesmanName: bill.salesman?.name || '',
      salesmanPhone: bill.salesman?.phone || '',
      items: (bill.items || []).map((item: any) => ({
        barcode: item.barcode,
        name: item.name,
        size: item.size,
        mrp: item.mrp,
        sellingPrice: item.sellingPrice,
        quantity: item.quantity,
        lineTotal: item.lineTotal,
        category: item.category,
        itemDiscountAmount: item.itemDiscountAmount,
        replacedOut: Boolean(item.replacedOut),
        isReplacement: Boolean(item.isReplacement),
      })),
    })),
    total,
    page,
    limit,
  });
});

const billProfitSortFields: Record<string, string> = {
  date: 'createdAt',
  revenue: 'revenue',
  cost: 'cost',
  profit: 'profit',
  margin: 'margin',
};

const buildBillProfitLines = (bill: any, stockItems: any[], returns: any[] = []) => {
  const itemsByBarcode = (stockItems || []).reduce((acc: Record<string, any[]>, row: any) => {
    const key = String(row.barcode || '').trim();
    if (!key) return acc;
    if (!acc[key]) acc[key] = [];
    acc[key].push(row);
    return acc;
  }, {});

  const billItems = activeBillItems(bill, returns);
  const lines = billItems.map((item: any) => {
    const barcodes =
      Array.isArray(item.barcodes) && item.barcodes.length > 0
        ? item.barcodes.map((value: string) => String(value || '').trim()).filter(Boolean)
        : [String(item.barcode || '').trim()].filter(Boolean);
    const matchedStock = barcodes.flatMap((barcode: string) => itemsByBarcode[barcode] || []);
    const cost = matchedStock.reduce((sum: number, row: any) => sum + Number(row.incomingPrice || 0), 0);
    const revenue = lineRevenueExGst(item);
    const profit = revenue - cost;
    return {
      name: item.name,
      barcode: item.barcode,
      barcodes,
      size: item.size,
      category: item.category,
      quantity: item.quantity,
      isReplacement: Boolean(item.isReplacement),
      replacedOut: Boolean(item.replacedOut),
      mrp: item.mrp,
      sellingPrice: item.sellingPrice,
      itemDiscountAmount: item.itemDiscountAmount,
      billDiscountShare: item.billDiscountShare,
      lineTotal: item.lineTotal,
      revenue,
      cost,
      profit,
      margin: revenue ? (profit / revenue) * 100 : 0,
      stockItems: matchedStock.map((row: any) => ({
        barcode: row.barcode,
        incomingPrice: Number(row.incomingPrice || 0),
        sellingPrice: Number(row.sellingPrice || 0),
      })),
    };
  });

  const revenue = billItems.reduce((sum: number, item: any) => sum + lineRevenueExGst(item), 0);
  const cost = (stockItems || []).reduce((sum: number, row: any) => sum + Number(row.incomingPrice || 0), 0);
  const profit = revenue - cost;

  return {
    lines,
    revenue,
    cost,
    profit,
    margin: revenue ? (profit / revenue) * 100 : 0,
    stockUnits: stockItems?.length || 0,
  };
};

router.get('/bill-profit', async (req, res: Response) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
    const skip = (page - 1) * limit;
    const { startDate, endDate, search, sortBy: sortByRaw, sortOrder: sortOrderRaw } = req.query as {
      startDate?: string;
      endDate?: string;
      search?: string;
      sortBy?: string;
      sortOrder?: string;
    };
    const sortField = billProfitSortFields[String(sortByRaw || 'date')] || 'createdAt';
    const sortOrder = String(sortOrderRaw || 'desc').toLowerCase() === 'asc' ? 1 : -1;

    const query = getDateFilter(startDate, endDate);
    const trimmedSearch = String(search || '').trim();
    if (trimmedSearch) {
      const regex = new RegExp(trimmedSearch, 'i');
      query.$or = [{ billNumber: regex }, { 'customer.name': regex }, { 'customer.phone': regex }];
    }

    const [rows, countRows, summaryRows] = await Promise.all([
      Bill.aggregate([
        { $match: query },
        {
          $lookup: {
            from: 'stockitems',
            let: { billId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [{ $eq: ['$soldInBill', '$$billId'] }, { $eq: ['$status', 'sold'] }],
                  },
                },
              },
              {
                $group: {
                  _id: null,
                  cost: { $sum: { $ifNull: ['$incomingPrice', 0] } },
                  stockUnits: { $sum: 1 },
                },
              },
            ],
            as: 'costDoc',
          },
        },
        {
          $addFields: {
            revenue: billRevenueFromItemsMongoExpr,
            cost: { $ifNull: [{ $arrayElemAt: ['$costDoc.cost', 0] }, 0] },
            stockUnits: { $ifNull: [{ $arrayElemAt: ['$costDoc.stockUnits', 0] }, 0] },
            itemCount: activeBillItemCountMongoExpr,
          },
        },
        {
          $addFields: {
            profit: { $subtract: ['$revenue', '$cost'] },
            margin: {
              $cond: [
                { $gt: ['$revenue', 0] },
                {
                  $multiply: [
                    { $divide: [{ $subtract: ['$revenue', '$cost'] }, '$revenue'] },
                    100,
                  ],
                },
                0,
              ],
            },
          },
        },
        { $sort: { [sortField]: sortOrder, createdAt: -1, _id: 1 } },
        { $skip: skip },
        { $limit: limit },
        {
          $lookup: {
            from: 'salesmen',
            localField: 'salesman',
            foreignField: '_id',
            as: 'salesmanDoc',
          },
        },
        {
          $project: {
            billNumber: 1,
            customer: 1,
            createdAt: 1,
            status: 1,
            paymentMethod: 1,
            totalAmount: 1,
            pointsRedeemed: 1,
            pointsDiscountAmount: 1,
            subtotal: 1,
            totalItemDiscount: 1,
            billDiscountAmount: 1,
            gstAmount: 1,
            revenue: 1,
            pointsCost: { $ifNull: ['$pointsDiscountAmount', 0] },
            cashCollected: { $ifNull: ['$totalAmount', 0] },
            cost: 1,
            profit: 1,
            margin: 1,
            stockUnits: 1,
            itemCount: 1,
            salesmanName: { $ifNull: [{ $arrayElemAt: ['$salesmanDoc.name', 0] }, ''] },
            salesmanPhone: { $ifNull: [{ $arrayElemAt: ['$salesmanDoc.phone', 0] }, ''] },
          },
        },
      ]),
      Bill.aggregate([{ $match: query }, { $count: 'total' }]),
      Bill.aggregate([
        { $match: query },
        {
          $lookup: {
            from: 'stockitems',
            let: { billId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [{ $eq: ['$soldInBill', '$$billId'] }, { $eq: ['$status', 'sold'] }],
                  },
                },
              },
              { $group: { _id: null, cost: { $sum: { $ifNull: ['$incomingPrice', 0] } } } },
            ],
            as: 'costDoc',
          },
        },
        {
          $addFields: {
            revenue: billRevenueFromItemsMongoExpr,
            cost: { $ifNull: [{ $arrayElemAt: ['$costDoc.cost', 0] }, 0] },
            pointsCost: { $ifNull: ['$pointsDiscountAmount', 0] },
            cashCollected: { $ifNull: ['$totalAmount', 0] },
          },
        },
        {
          $group: {
            _id: null,
            totalBills: { $sum: 1 },
            totalRevenue: { $sum: '$revenue' },
            totalCost: { $sum: '$cost' },
            totalPointsCost: { $sum: '$pointsCost' },
            totalCashCollected: { $sum: '$cashCollected' },
          },
        },
        {
          $addFields: {
            totalProfit: { $subtract: ['$totalRevenue', '$totalCost'] },
            profitMargin: {
              $cond: [
                { $gt: ['$totalRevenue', 0] },
                {
                  $multiply: [
                    { $divide: [{ $subtract: ['$totalRevenue', '$totalCost'] }, '$totalRevenue'] },
                    100,
                  ],
                },
                0,
              ],
            },
          },
        },
      ]),
    ]);

    const summary = summaryRows?.[0] || {
      totalBills: 0,
      totalRevenue: 0,
      totalCost: 0,
      totalProfit: 0,
      profitMargin: 0,
      totalPointsCost: 0,
      totalCashCollected: 0,
    };

    res.json({
      data: rows,
      total: Number(countRows?.[0]?.total || 0),
      page,
      limit,
      summary: {
        totalBills: Number(summary.totalBills || 0),
        totalRevenue: Number(summary.totalRevenue || 0),
        totalCost: Number(summary.totalCost || 0),
        totalProfit: Number(summary.totalProfit || 0),
        profitMargin: Number(summary.profitMargin || 0),
        totalPointsCost: Number(summary.totalPointsCost || 0),
        totalCashCollected: Number(summary.totalCashCollected || 0),
      },
    });
  } catch (err: any) {
    console.error('❌ /bill-profit error:', err?.message || err);
    res.status(500).json({ message: 'Failed to load bill profit data', error: err?.message });
  }
});

router.get('/bill-profit/:id', async (req, res: Response) => {
  try {
    const bill = await Bill.findById(req.params.id).populate('salesman', 'name phone').lean();
    if (!bill) return res.status(404).json({ message: 'Bill not found' });
    if (!FINALIZED_STATUSES.includes(String((bill as any).status || ''))) {
      return res.status(400).json({ message: 'Bill is not finalized' });
    }

    const [stockItems, returns] = await Promise.all([
      StockItem.find({ soldInBill: bill._id, status: 'sold' }).lean(),
      BillingReturn.find({ bill: bill._id }).sort({ createdAt: -1 }).lean(),
    ]);
    const metrics = buildBillProfitLines(bill, stockItems, returns);

    res.json({
      returns,
      bill: {
        _id: bill._id,
        billNumber: bill.billNumber,
        customer: bill.customer,
        salesmanName: (bill as any).salesman?.name || '',
        salesmanPhone: (bill as any).salesman?.phone || '',
        createdAt: (bill as any).createdAt,
        status: bill.status,
        paymentMethod: bill.paymentMethod,
        subtotal: bill.subtotal,
        totalItemDiscount: bill.totalItemDiscount,
        billDiscountAmount: bill.billDiscountAmount,
        gstAmount: bill.gstAmount,
        totalAmount: bill.totalAmount,
        pointsRedeemed: Number((bill as any).pointsRedeemed || 0),
        pointsDiscountAmount: Number((bill as any).pointsDiscountAmount || 0),
        pointsCost: Number((bill as any).pointsDiscountAmount || 0),
        cashCollected: billCashCollected(bill),
      },
      ...metrics,
    });
  } catch (err: any) {
    console.error('❌ /bill-profit/:id error:', err?.message || err);
    res.status(500).json({ message: 'Failed to load bill profit detail', error: err?.message });
  }
});

router.get('/customers', requirePermission('canViewCustomerReports'), async (req, res: Response) => {
  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
  const skip = (page - 1) * limit;
  const search = String(req.query.search || '').trim();
  const startDate = String(req.query.startDate || '').trim();
  const endDate = String(req.query.endDate || '').trim();
  const minSpend = Math.max(0, Number(req.query.minSpend || 0));
  const minVisits = Math.max(0, Number(req.query.minVisits || 0));
  const sortByRaw = String(req.query.sortBy || 'lastVisit');
  const sortOrderRaw = String(req.query.sortOrder || 'desc').toLowerCase();
  const sortOrder = sortOrderRaw === 'asc' ? 1 : -1;

  const sortableFields: Record<string, string> = {
    totalSpent: 'totalSpent',
    lastVisit: 'lastVisit',
    totalBills: 'totalBills',
  };
  const sortField = sortableFields[sortByRaw] || 'lastVisit';

  const baseMatch: any = {
    status: { $in: FINALIZED_STATUSES },
    'customer.phone': { $exists: true, $ne: '' },
  };
  if (search) {
    const regex = new RegExp(search, 'i');
    baseMatch.$or = [{ 'customer.name': regex }, { 'customer.phone': regex }];
  }

  const groupedFilters: any = {};
  const dateRange = getDateRange(startDate || undefined, endDate || undefined);
  if (dateRange) groupedFilters.lastVisit = dateRange;
  if (minSpend > 0) groupedFilters.totalSpent = { $gte: minSpend };
  if (minVisits > 0) groupedFilters.totalBills = { $gte: minVisits };

  const dataPipeline: any[] = [
    { $match: baseMatch },
    { $sort: { createdAt: 1 } },
    {
      $group: {
        _id: '$customer.phone',
        name: { $last: '$customer.name' },
        phone: { $first: '$customer.phone' },
        totalBills: { $sum: 1 },
        totalSpent: { $sum: billExGstMongoExpr },
        totalDiscount: { $sum: { $add: ['$totalItemDiscount', '$billDiscountAmount'] } },
        lastVisit: { $max: '$createdAt' },
        firstVisit: { $min: '$createdAt' },
        avgBillValue: { $avg: billExGstMongoExpr },
      },
    },
  ];
  if (Object.keys(groupedFilters).length > 0) dataPipeline.push({ $match: groupedFilters });
  dataPipeline.push(
    {
      $lookup: {
        from: 'bills',
        let: { customerPhone: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ['$customer.phone', '$$customerPhone'] },
              status: { $in: FINALIZED_STATUSES },
            },
          },
          { $unwind: { path: '$items', preserveNullAndEmptyArrays: false } },
          {
            $group: {
              _id: { $ifNull: ['$items.category', 'Uncategorized'] },
              qty: { $sum: { $ifNull: ['$items.quantity', 0] } },
            },
          },
          { $sort: { qty: -1 } },
          { $limit: 1 },
        ],
        as: 'favouriteCategoryDoc',
      },
    },
    {
      $addFields: {
        favouriteCategory: {
          $ifNull: [{ $arrayElemAt: ['$favouriteCategoryDoc._id', 0] }, '-'],
        },
      },
    },
    {
      $project: {
        favouriteCategoryDoc: 0,
      },
    },
    { $sort: { [sortField]: sortOrder, _id: 1 } },
    { $skip: skip },
    { $limit: limit }
  );

  const totalPipeline: any[] = [
    { $match: baseMatch },
    {
      $group: {
        _id: '$customer.phone',
        totalBills: { $sum: 1 },
        totalSpent: { $sum: billExGstMongoExpr },
        lastVisit: { $max: '$createdAt' },
      },
    },
  ];
  if (Object.keys(groupedFilters).length > 0) totalPipeline.push({ $match: groupedFilters });
  totalPipeline.push({ $count: 'total' });

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);
  const statsPipeline: any[] = [
    { $match: baseMatch },
    {
      $group: {
        _id: '$customer.phone',
        totalBills: { $sum: 1 },
        totalSpent: { $sum: billExGstMongoExpr },
        firstVisit: { $min: '$createdAt' },
      },
    },
  ];
  if (Object.keys(groupedFilters).length > 0) statsPipeline.push({ $match: groupedFilters });
  statsPipeline.push({
    $group: {
      _id: null,
      totalCustomers: { $sum: 1 },
      todayNewCustomers: {
        $sum: {
          $cond: [
            {
              $and: [{ $gte: ['$firstVisit', todayStart] }, { $lte: ['$firstVisit', todayEnd] }],
            },
            1,
            0,
          ],
        },
      },
      repeatCustomers: {
        $sum: {
          $cond: [{ $gt: ['$totalBills', 1] }, 1, 0],
        },
      },
      spentSum: { $sum: '$totalSpent' },
      visitsSum: { $sum: '$totalBills' },
    },
  });

  const [data, countRows, statsRows] = await Promise.all([
    Bill.aggregate(dataPipeline),
    Bill.aggregate(totalPipeline),
    Bill.aggregate(statsPipeline),
  ]);
  const stats = statsRows?.[0] || {};

  const phones = (data || [])
    .map((row: any) => normalizeBillingPhone(String(row.phone || row._id || '')))
    .filter((p) => p.length >= 10);
  const pointsAccounts =
    phones.length > 0
      ? await BillingPointsAccount.find({ phone: { $in: phones } })
          .select('phone balance')
          .lean()
      : [];
  const pointsByPhone = new Map(pointsAccounts.map((a: any) => [a.phone, Number(a.balance || 0)]));
  const enrichedData = (data || []).map((row: any) => {
    const normalized = normalizeBillingPhone(String(row.phone || row._id || ''));
    const points = pointsByPhone.get(normalized) ?? 0;
    return { ...row, points, pointsBalance: points };
  });

  res.json({
    data: enrichedData,
    total: Number(countRows?.[0]?.total || 0),
    summary: {
      totalCustomers: Number(stats.totalCustomers || 0),
      todayNewCustomers: Number(stats.todayNewCustomers || 0),
      repeatCustomers: Number(stats.repeatCustomers || 0),
      avgSpendPerVisit: Number(stats.visitsSum || 0) ? Number(stats.spentSum || 0) / Number(stats.visitsSum || 0) : 0,
    },
    page,
    limit,
  });
});

router.get('/customers/:phone', requirePermission('canViewCustomerReports'), async (req, res: Response) => {
  const phone = decodeURIComponent(String(req.params.phone || '')).trim();
  if (!phone) return res.status(400).json({ message: 'Phone is required' });

  const billQuery = { status: { $in: FINALIZED_STATUSES }, 'customer.phone': phone };
  const normalizedPhone = normalizeBillingPhone(phone);

  const [bills, returns, pointsAccount, pointsLedger] = await Promise.all([
    Bill.find(billQuery).populate('salesman', 'name phone').sort({ createdAt: -1 }).lean(),
    BillingReturn.find({ 'customer.phone': phone }).sort({ createdAt: -1 }).lean(),
    normalizedPhone.length >= 10
      ? BillingPointsAccount.findOne({ phone: normalizedPhone }).lean()
      : Promise.resolve(null),
    normalizedPhone.length >= 10
      ? BillingPointsLedger.find({ phone: normalizedPhone }).sort({ createdAt: -1 }).limit(20).lean()
      : Promise.resolve([]),
  ]);

  if (!bills.length && !returns.length) return res.status(404).json({ message: 'Customer not found' });

  const returnsByBill = returns.reduce((acc: Record<string, any[]>, row: any) => {
    const key = String(row.bill || '');
    if (!key) return acc;
    if (!acc[key]) acc[key] = [];
    acc[key].push(row);
    return acc;
  }, {});

  const billMetrics = bills.reduce(
    (acc: any, bill: any) => {
      acc.totalSpent += billRevenueExGst(bill);
      acc.totalDiscount += Number(bill.totalItemDiscount || 0) + Number(bill.billDiscountAmount || 0);
      acc.payments[bill.paymentMethod || 'unknown'] = (acc.payments[bill.paymentMethod || 'unknown'] || 0) + 1;
      activeBillItems(bill, returnsByBill[String(bill._id)] || []).forEach((item: any) => {
        const categoryKey = item.category || 'Uncategorized';
        acc.categories[categoryKey] = (acc.categories[categoryKey] || 0) + Number(item.quantity || 0);
      });
      return acc;
    },
    { totalSpent: 0, totalDiscount: 0, categories: {} as Record<string, number>, payments: {} as Record<string, number> }
  );
  const categoryEntries = Object.entries(billMetrics.categories as Record<string, number>);
  const paymentEntries = Object.entries(billMetrics.payments as Record<string, number>);
  const billRows = bills as any[];

  const favouriteCategory = categoryEntries.sort((a, b) => Number(b[1]) - Number(a[1]))[0]?.[0] || '-';
  const favouritePayment = paymentEntries.sort((a, b) => Number(b[1]) - Number(a[1]))[0]?.[0] || '-';
  const totalBills = bills.length;
  const firstVisit = billRows.length ? billRows[billRows.length - 1]?.createdAt || null : null;
  const lastVisit = billRows.length ? billRows[0]?.createdAt || null : null;

  const customer = bills[0]?.customer || returns[0]?.customer || { name: 'Unknown', phone };

  res.json({
    customer: {
      name: customer?.name || 'Unknown',
      phone: customer?.phone || phone,
    },
    summary: {
      totalBills,
      totalSpent: billMetrics.totalSpent,
      totalDiscount: billMetrics.totalDiscount,
      totalReturns: returns.length,
      avgBillValue: totalBills ? billMetrics.totalSpent / totalBills : 0,
      firstVisit,
      lastVisit,
      favouriteCategory,
      favouritePayment,
      pointsBalance: Number(pointsAccount?.balance || 0),
    },
    points: {
      balance: Number(pointsAccount?.balance || 0),
      ledger: pointsLedger || [],
    },
    bills: bills.map((bill: any) => {
      const billReturns = returnsByBill[String(bill._id)] || [];
      const recalculated = recalculateBillTotalsFromActiveItems(bill, billReturns);
      return {
        ...bill,
        items: activeBillItems(bill, billReturns),
        totalAmount: recalculated?.totalAmount ?? bill.totalAmount,
      };
    }),
    returns,
  });
});

router.get('/export', async (req, res: Response) => {
  const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
  const bills = await Bill.find(getDateFilter(startDate, endDate)).populate('salesman', 'name phone').lean();

  const workbook = new ExcelJS.Workbook();
  const summarySheet = workbook.addWorksheet('Bills summary');
  const itemSheet = workbook.addWorksheet('Item-wise breakdown');
  const salesmanSheet = workbook.addWorksheet('Salesman performance');
  const categorySheet = workbook.addWorksheet('Category breakdown');

  summarySheet.columns = [
    { header: 'Bill Number', key: 'billNumber', width: 20 },
    { header: 'Date', key: 'date', width: 20 },
    { header: 'Customer', key: 'customer', width: 24 },
    { header: 'Salesman', key: 'salesman', width: 20 },
    { header: 'Subtotal', key: 'subtotal', width: 12 },
    { header: 'Discount', key: 'discount', width: 12 },
    { header: 'GST', key: 'gst', width: 12 },
    { header: 'Payment', key: 'payment', width: 15 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'Points Redeemed', key: 'pointsRedeemed', width: 16 },
    { header: 'Points Cost', key: 'pointsCost', width: 14 },
    { header: 'Cash Collected', key: 'cashCollected', width: 14 },
    { header: 'Total', key: 'total', width: 14 },
  ];

  bills.forEach((bill: any) => {
    summarySheet.addRow({
      billNumber: bill.billNumber || '',
      date: new Date(bill.createdAt).toISOString(),
      customer: bill.customer?.name || 'Walk-in',
      salesman: (bill as any).salesman?.name || '',
      subtotal: bill.subtotal || 0,
      discount: Number(bill.totalItemDiscount || 0) + Number(bill.billDiscountAmount || 0),
      gst: bill.gstAmount || 0,
      payment: bill.paymentMethod || '',
      status: bill.status || '',
      pointsRedeemed: Number(bill.pointsRedeemed || 0),
      pointsCost: Number(bill.pointsDiscountAmount || 0),
      cashCollected: Number(bill.totalAmount || 0),
      total: bill.totalAmount || 0,
    });
  });

  itemSheet.columns = [
    { header: 'Bill Number', key: 'billNumber', width: 20 },
    { header: 'Date', key: 'date', width: 20 },
    { header: 'Barcode', key: 'barcode', width: 20 },
    { header: 'Product', key: 'item', width: 24 },
    { header: 'Category', key: 'category', width: 18 },
    { header: 'Size', key: 'size', width: 10 },
    { header: 'MRP', key: 'mrp', width: 10 },
    { header: 'Discount', key: 'discount', width: 10 },
    { header: 'Selling Price', key: 'sellingPrice', width: 14 },
    { header: 'Qty', key: 'qty', width: 8 },
    { header: 'Line Total', key: 'lineTotal', width: 14 },
    { header: 'Replacement', key: 'isReplacement', width: 12 },
  ];
  bills.forEach((bill: any) => {
    activeBillItems(bill).forEach((item: any) => {
      itemSheet.addRow({
        billNumber: bill.billNumber || '',
        date: new Date(bill.createdAt).toISOString(),
        barcode: item.barcode || '',
        item: item.name || '',
        category: item.category || '',
        size: item.size || '',
        mrp: item.mrp || 0,
        discount: item.itemDiscountAmount || 0,
        sellingPrice: item.sellingPrice || 0,
        qty: item.quantity || 0,
        lineTotal: item.lineTotal || 0,
        isReplacement: item.isReplacement ? 'Yes' : 'No',
      });
    });
  });

  const salesmanStats = bills.reduce((acc: Record<string, any>, bill: any) => {
    const key = bill.salesman?._id?.toString?.() || 'unknown';
    if (!acc[key]) {
      acc[key] = {
        name: bill.salesman?.name || 'Unknown',
        bills: 0,
        revenue: 0,
        avgBill: 0,
        returns: 0,
        gstCollected: 0,
      };
    }
    acc[key].bills += 1;
    acc[key].revenue += billRevenueExGst(bill);
    acc[key].gstCollected += Number(bill.gstAmount || 0);
    if (String(bill.status || '').includes('return')) acc[key].returns += 1;
    return acc;
  }, {});

  salesmanSheet.addRow(['Name', 'Bills', 'Revenue', 'Avg Bill', 'Returns', 'GST Collected']);
  Object.values(salesmanStats).forEach((row: any) => {
    salesmanSheet.addRow([
      row.name,
      row.bills,
      row.revenue,
      row.bills ? row.revenue / row.bills : 0,
      row.returns,
      row.gstCollected,
    ]);
  });
  categorySheet.addRow(['Category', 'Revenue']);

  const buffer = await workbook.xlsx.writeBuffer();
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=billing-report-${Date.now()}.xlsx`);
  return res.send(Buffer.from(buffer));
});

const parseSupplierFilter = (supplierRaw?: string) => {
  const supplierId = String(supplierRaw || '').trim();
  if (!supplierId) return {};
  if (!mongoose.Types.ObjectId.isValid(supplierId)) return null;
  return { supplier: new mongoose.Types.ObjectId(supplierId) };
};

/** Stock entry filters for purchase batch reports (entryDate = when stock was brought in). */
const buildStockEntryMatch = (
  supplierRaw?: string,
  startDate?: string,
  endDate?: string
): Record<string, unknown> | null => {
  const supplierPart = parseSupplierFilter(supplierRaw);
  if (supplierPart === null) return null;
  const match: Record<string, unknown> = { ...supplierPart };
  const entryDateRange = getDateRange(startDate, endDate);
  if (entryDateRange) match.entryDate = entryDateRange;
  return match;
};

/** Shared stages: stock items + sold bills + per-entry sold metrics (after projectStage fields exist). */
const profitSoldMetricsStages: any[] = [
  {
    $addFields: {
      soldItems: {
        $filter: {
          input: '$items',
          as: 'item',
          cond: { $eq: ['$$item.status', 'sold'] },
        },
      },
      billItemRows: {
        $reduce: {
          input: '$soldBills',
          initialValue: [],
          in: {
            $concatArrays: [
              '$$value',
              {
                $map: {
                  input: {
                    $filter: {
                      input: { $ifNull: ['$$this.items', []] },
                      as: 'billItem',
                      cond: { $ne: [{ $ifNull: ['$$billItem.replacedOut', false] }, true] },
                    },
                  },
                  as: 'billItem',
                  in: billItemRowFields,
                },
              },
            ],
          },
        },
      },
    },
  },
  {
    $addFields: {
      qtySold: {
        $size: {
          $filter: {
            input: '$items',
            as: 'item',
            cond: { $eq: ['$$item.status', 'sold'] },
          },
        },
      },
      soldRevenue: {
        $sum: {
          $map: {
            input: '$soldItems',
            as: 'soldItem',
            in: {
              $let: {
                vars: {
                  matchedBillItem: {
                    $arrayElemAt: [
                      {
                        $filter: {
                          input: '$billItemRows',
                          as: 'billItem',
                          cond: { $eq: ['$$billItem.barcode', '$$soldItem.barcode'] },
                        },
                      },
                      0,
                    ],
                  },
                },
                in: profitLineRevenueExpr,
              },
            },
          },
        },
      },
      soldDiscount: {
        $sum: {
          $map: {
            input: '$soldItems',
            as: 'soldItem',
            in: {
              $let: {
                vars: {
                  matchedBillItem: {
                    $arrayElemAt: [
                      {
                        $filter: {
                          input: '$billItemRows',
                          as: 'billItem',
                          cond: { $eq: ['$$billItem.barcode', '$$soldItem.barcode'] },
                        },
                      },
                      0,
                    ],
                  },
                },
                in: { $ifNull: ['$$matchedBillItem.itemDiscountAmount', 0] },
              },
            },
          },
        },
      },
      soldCost: { $multiply: ['$qtySold', '$incomingPrice'] },
      totalInvestment: { $multiply: ['$quantity', '$incomingPrice'] },
      qtyPurchased: '$quantity',
    },
  },
  {
    $addFields: {
      realizedProfit: { $subtract: ['$soldRevenue', '$soldCost'] },
    },
  },
];

router.get('/profit/supplier-summary', requirePermission('canViewReports'), async (req, res: Response) => {
  try {
    const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
    const entryMatch = buildStockEntryMatch(undefined, startDate, endDate);
    if (entryMatch === null) {
      return res.status(400).json({ message: 'Invalid supplier id' });
    }
    const entryMatchStage = Object.keys(entryMatch).length ? [{ $match: entryMatch }] : [];

    const StockEntry = req.app.get('mongoose')?.model('StockEntry') || require('../models/StockEntry').default;
    const rows = await StockEntry.aggregate([
      ...entryMatchStage,
      {
        $lookup: {
          from: 'stockitems',
          localField: '_id',
          foreignField: 'stockEntry',
          as: 'items',
        },
      },
      {
        $lookup: {
          from: 'bills',
          localField: 'items.soldInBill',
          foreignField: '_id',
          as: 'soldBills',
        },
      },
      {
        $project: {
          supplier: 1,
          quantity: 1,
          incomingPrice: 1,
          items: 1,
          soldBills: 1,
        },
      },
      ...profitSoldMetricsStages,
      {
        $group: {
          _id: '$supplier',
          batchCount: { $sum: 1 },
          unitsPurchased: { $sum: '$qtyPurchased' },
          unitsSold: { $sum: '$qtySold' },
          totalInvestment: { $sum: '$totalInvestment' },
          soldRevenue: { $sum: '$soldRevenue' },
          soldDiscount: { $sum: '$soldDiscount' },
          soldCost: { $sum: '$soldCost' },
          realizedProfit: { $sum: '$realizedProfit' },
        },
      },
      {
        $lookup: {
          from: 'suppliers',
          localField: '_id',
          foreignField: '_id',
          as: 'supplierDoc',
        },
      },
      {
        $project: {
          supplierId: '$_id',
          supplierName: { $ifNull: [{ $arrayElemAt: ['$supplierDoc.name', 0] }, 'Unknown'] },
          batchCount: 1,
          unitsPurchased: 1,
          unitsSold: 1,
          totalInvestment: 1,
          soldRevenue: 1,
          soldDiscount: 1,
          realizedProfit: 1,
          profitMargin: {
            $cond: [
              { $gt: ['$soldRevenue', 0] },
              { $multiply: [{ $divide: ['$realizedProfit', '$soldRevenue'] }, 100] },
              0,
            ],
          },
        },
      },
      { $sort: { totalInvestment: -1, supplierName: 1 } },
    ]);
    res.json({ data: rows });
  } catch (err: any) {
    console.error('❌ /profit/supplier-summary error:', err?.message || err);
    res.status(500).json({ message: 'Failed to load supplier purchase summary', error: err?.message });
  }
});

router.get('/profit', requirePermission('canViewReports'), async (req, res: Response) => {
  try {
  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
  const skip = (page - 1) * limit;
  const sortMode = String(req.query.sort || 'entryDate');
  const { supplier: supplierQuery, startDate, endDate, search: searchRaw } = req.query as {
    supplier?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
  };
  const entryMatch = buildStockEntryMatch(supplierQuery, startDate, endDate);
  if (entryMatch === null) {
    return res.status(400).json({ message: 'Invalid supplier id' });
  }
  const searchTrimmed = String(searchRaw || '').trim();
  if (searchTrimmed) {
    const regex = new RegExp(searchTrimmed, 'i');
    (entryMatch as any).$or = [
      { productName: regex },
      { size: regex },
      { notes: regex },
      { $expr: { $regexMatch: { input: { $toString: '$_id' }, regex: searchTrimmed, options: 'i' } } }
    ];
  }

  const StockEntry = req.app.get('mongoose')?.model('StockEntry') || require('../models/StockEntry').default;
  const entryMatchStage = Object.keys(entryMatch).length ? [{ $match: entryMatch }] : [];

  // Common lookup stages
  const lookupStages: any[] = [
    {
      $lookup: {
        from: 'stockitems',
        localField: '_id',
        foreignField: 'stockEntry',
        as: 'items'
      }
    },
    {
      $lookup: {
        from: 'bills',
        localField: 'items.soldInBill',
        foreignField: '_id',
        as: 'soldBills'
      }
    },
    {
      $lookup: {
        from: 'suppliers',
        localField: 'supplier',
        foreignField: '_id',
        as: 'supplierDoc'
      }
    },
    {
      $lookup: {
        from: 'billingcategories',
        localField: 'category',
        foreignField: '_id',
        as: 'categoryDoc'
      }
    },
  ];

  const projectStage = {
    $project: {
      entryDate: 1,
      productName: 1,
      size: { $ifNull: ['$size', ''] },
      supplierName: { $arrayElemAt: ['$supplierDoc.name', 0] },
      categoryName: { $arrayElemAt: ['$categoryDoc.name', 0] },
      quantity: 1,
      incomingPrice: 1,
      sellingPrice: 1,
      totalInvestment: { $multiply: ['$quantity', '$incomingPrice'] },
      totalPotentialRevenue: { $multiply: ['$quantity', '$sellingPrice'] },
      items: 1,
      soldBills: 1,
      lastSoldDate: { $max: '$soldBills.createdAt' },
      qtySold: {
        $size: {
          $filter: {
            input: '$items',
            as: 'item',
            cond: { $eq: ['$$item.status', 'sold'] }
          }
        }
      },
    }
  };

  const computeStages: any[] = [
    {
      $addFields: {
        soldItems: {
          $filter: {
            input: '$items',
            as: 'item',
            cond: { $eq: ['$$item.status', 'sold'] }
          }
        },
        billItemRows: {
          $reduce: {
            input: '$soldBills',
            initialValue: [],
            in: {
              $concatArrays: [
                '$$value',
                {
                  $map: {
                    input: { $ifNull: ['$$this.items', []] },
                    as: 'billItem',
                    in: billItemRowFields
                  }
                }
              ]
            }
          }
        }
      }
    },
    {
      $addFields: {
        soldRevenue: {
          $sum: {
            $map: {
              input: '$soldItems',
              as: 'soldItem',
              in: {
                $let: {
                  vars: {
                    matchedBillItem: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: '$billItemRows',
                            as: 'billItem',
                            cond: { $eq: ['$$billItem.barcode', '$$soldItem.barcode'] }
                          }
                        },
                        0
                      ]
                    }
                  },
                  in: profitLineRevenueExpr
                }
              }
            }
          }
        },
        soldDiscount: {
          $sum: {
            $map: {
              input: '$soldItems',
              as: 'soldItem',
              in: {
                $let: {
                  vars: {
                    matchedBillItem: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: '$billItemRows',
                            as: 'billItem',
                            cond: { $eq: ['$$billItem.barcode', '$$soldItem.barcode'] }
                          }
                        },
                        0
                      ]
                    }
                  },
                  in: { $ifNull: ['$$matchedBillItem.itemDiscountAmount', 0] }
                }
              }
            }
          }
        },
        soldCost: { $multiply: ['$qtySold', '$incomingPrice'] }
      }
    },
    {
      $addFields: {
        realizedProfit: { $subtract: ['$soldRevenue', '$soldCost'] }
      }
    }
  ];

  let pipeline: any[];

  if (sortMode === 'recentSales') {
    // For recent sales sort: lookup first, then sort by lastSoldDate, then paginate
    pipeline = [
      ...entryMatchStage,
      ...lookupStages,
      projectStage,
      { $sort: { lastSoldDate: -1, entryDate: -1, createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      ...computeStages,
    ];
  } else {
    // Default: sort by entry date first (efficient — paginate before lookups)
    pipeline = [
      ...entryMatchStage,
      { $sort: { entryDate: -1, createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      ...lookupStages,
      projectStage,
      ...computeStages,
    ];
  }

  const data = await StockEntry.aggregate(pipeline);
  const total = await StockEntry.countDocuments(entryMatch);
  
  const overallPipeline: any[] = [
    ...entryMatchStage,
    {
      $lookup: {
        from: 'stockitems',
        localField: '_id',
        foreignField: 'stockEntry',
        as: 'items'
      }
    },
    {
      $lookup: {
        from: 'bills',
        localField: 'items.soldInBill',
        foreignField: '_id',
        as: 'soldBills'
      }
    },
    {
      $project: {
        totalInvestment: { $multiply: ['$quantity', '$incomingPrice'] },
        qtyPurchased: '$quantity',
        qtySold: {
          $size: {
             $filter: {
               input: '$items',
               as: 'item',
               cond: { $eq: ['$$item.status', 'sold'] }
             }
          }
        },
        soldRevenue: {
          $sum: {
            $map: {
              input: {
                $filter: {
                  input: '$items',
                  as: 'item',
                  cond: { $eq: ['$$item.status', 'sold'] }
                }
              },
              as: 'soldItem',
              in: {
                $let: {
                  vars: {
                    billRows: {
                      $reduce: {
                        input: '$soldBills',
                        initialValue: [],
                        in: {
                          $concatArrays: [
                            '$$value',
                            {
                              $map: {
                                input: { $ifNull: ['$$this.items', []] },
                                as: 'billItem',
                                in: billItemRowFields
                              }
                            }
                          ]
                        }
                      }
                    }
                  },
                  in: {
                    $let: {
                      vars: {
                        matchedBillItem: {
                          $arrayElemAt: [
                            {
                              $filter: {
                                input: '$$billRows',
                                as: 'billItem',
                                cond: { $eq: ['$$billItem.barcode', '$$soldItem.barcode'] }
                              }
                            },
                            0
                          ]
                        }
                      },
                      in: profitLineRevenueExpr
                    }
                  }
                }
              }
            }
          }
        },
        soldDiscount: {
          $sum: {
            $map: {
              input: {
                $filter: {
                  input: '$items',
                  as: 'item',
                  cond: { $eq: ['$$item.status', 'sold'] }
                }
              },
              as: 'soldItem',
              in: {
                $let: {
                  vars: {
                    billRows: {
                      $reduce: {
                        input: '$soldBills',
                        initialValue: [],
                        in: {
                          $concatArrays: [
                            '$$value',
                            {
                              $map: {
                                input: { $ifNull: ['$$this.items', []] },
                                as: 'billItem',
                                in: billItemRowFields
                              }
                            }
                          ]
                        }
                      }
                    }
                  },
                  in: {
                    $let: {
                      vars: {
                        matchedBillItem: {
                          $arrayElemAt: [
                            {
                              $filter: {
                                input: '$$billRows',
                                as: 'billItem',
                                cond: { $eq: ['$$billItem.barcode', '$$soldItem.barcode'] }
                              }
                            },
                            0
                          ]
                        }
                      },
                      in: { $ifNull: ['$$matchedBillItem.itemDiscountAmount', 0] }
                    }
                  }
                }
              }
            }
          }
        },
        sellingPrice: 1,
        incomingPrice: 1
      }
    },
    {
      $group: {
        _id: null,
        overallPurchased: { $sum: '$qtyPurchased' },
        overallSold: { $sum: '$qtySold' },
        overallInvestment: { $sum: '$totalInvestment' },
        overallSoldRevenue: { $sum: '$soldRevenue' },
        overallSoldCost: { $sum: { $multiply: ['$qtySold', '$incomingPrice'] } },
        overallSoldDiscount: { $sum: '$soldDiscount' },
      }
    }
  ];
  
  const overallRows = await StockEntry.aggregate(overallPipeline);
  const overall = overallRows[0] || { overallPurchased: 0, overallSold: 0, overallInvestment: 0, overallSoldRevenue: 0, overallSoldCost: 0, overallSoldDiscount: 0 };
  const overallRealizedProfit = (overall.overallSoldRevenue || 0) - (overall.overallSoldCost || 0);

  res.json({
    data,
    total,
    page,
    limit,
    summary: {
      overallPurchased: overall.overallPurchased || 0,
      overallSold: overall.overallSold || 0,
      totalInvestment: overall.overallInvestment || 0,
      totalSoldRevenue: overall.overallSoldRevenue || 0,
      totalSoldDiscount: overall.overallSoldDiscount || 0,
      totalRealizedProfit: overallRealizedProfit || 0,
      profitMargin: overall.overallSoldRevenue ? (overallRealizedProfit / overall.overallSoldRevenue) * 100 : 0
    }
  });
  } catch (err: any) {
    console.error('❌ /profit error:', err?.message || err);
    res.status(500).json({ message: 'Failed to load profit data', error: err?.message });
  }
});

router.get('/profit/export', requirePermission('canViewReports'), async (req, res: Response) => {
  const { supplier: supplierQuery, startDate, endDate } = req.query as {
    supplier?: string;
    startDate?: string;
    endDate?: string;
  };
  const entryMatch = buildStockEntryMatch(supplierQuery, startDate, endDate);
  if (entryMatch === null) {
    return res.status(400).json({ message: 'Invalid supplier id' });
  }
  const entryMatchStage = Object.keys(entryMatch).length ? [{ $match: entryMatch }] : [];

  const StockEntry = req.app.get('mongoose')?.model('StockEntry') || require('../models/StockEntry').default;
  const data = await StockEntry.aggregate([
    ...entryMatchStage,
    { $sort: { entryDate: -1, createdAt: -1 } },
    { $lookup: { from: 'stockitems', localField: '_id', foreignField: 'stockEntry', as: 'items' } },
    { $lookup: { from: 'bills', localField: 'items.soldInBill', foreignField: '_id', as: 'soldBills' } },
    { $lookup: { from: 'suppliers', localField: 'supplier', foreignField: '_id', as: 'supplierDoc' } },
    { $lookup: { from: 'billingcategories', localField: 'category', foreignField: '_id', as: 'categoryDoc' } },
    {
      $project: {
        entryDate: 1,
        productName: 1,
        supplierName: { $arrayElemAt: ['$supplierDoc.name', 0] },
        categoryName: { $arrayElemAt: ['$categoryDoc.name', 0] },
        quantity: 1,
        incomingPrice: 1,
        sellingPrice: 1,
        items: 1,
        soldBills: 1,
        qtySold: {
          $size: {
            $filter: { input: '$items', as: 'item', cond: { $eq: ['$$item.status', 'sold'] } }
          }
        },
        soldRevenue: {
          $sum: {
            $map: {
              input: {
                $filter: { input: '$items', as: 'item', cond: { $eq: ['$$item.status', 'sold'] } }
              },
              as: 'soldItem',
              in: {
                $let: {
                  vars: {
                    billRows: {
                      $reduce: {
                        input: '$soldBills',
                        initialValue: [],
                        in: {
                          $concatArrays: [
                            '$$value',
                            {
                              $map: {
                                input: { $ifNull: ['$$this.items', []] },
                                as: 'billItem',
                                in: billItemRowFields
                              }
                            }
                          ]
                        }
                      }
                    }
                  },
                  in: {
                    $let: {
                      vars: {
                        matchedBillItem: {
                          $arrayElemAt: [
                            {
                              $filter: {
                                input: '$$billRows',
                                as: 'billItem',
                                cond: { $eq: ['$$billItem.barcode', '$$soldItem.barcode'] }
                              }
                            },
                            0
                          ]
                        }
                      },
                      in: profitLineRevenueExpr
                    }
                  }
                }
              }
            }
          }
        },
        soldDiscount: {
          $sum: {
            $map: {
              input: {
                $filter: { input: '$items', as: 'item', cond: { $eq: ['$$item.status', 'sold'] } }
              },
              as: 'soldItem',
              in: {
                $let: {
                  vars: {
                    billRows: {
                      $reduce: {
                        input: '$soldBills',
                        initialValue: [],
                        in: {
                          $concatArrays: [
                            '$$value',
                            {
                              $map: {
                                input: { $ifNull: ['$$this.items', []] },
                                as: 'billItem',
                                in: billItemRowFields
                              }
                            }
                          ]
                        }
                      }
                    }
                  },
                  in: {
                    $let: {
                      vars: {
                        matchedBillItem: {
                          $arrayElemAt: [
                            {
                              $filter: {
                                input: '$$billRows',
                                as: 'billItem',
                                cond: { $eq: ['$$billItem.barcode', '$$soldItem.barcode'] }
                              }
                            },
                            0
                          ]
                        }
                      },
                      in: { $ifNull: ['$$matchedBillItem.itemDiscountAmount', 0] }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  ]);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Batch Profit Report');
  
  sheet.columns = [
    { header: 'Batch / Entry Date', key: 'entryDate', width: 20 },
    { header: 'Product Name', key: 'productName', width: 25 },
    { header: 'Supplier', key: 'supplier', width: 20 },
    { header: 'Category', key: 'category', width: 15 },
    { header: 'Qty Purchased', key: 'qtyPurchased', width: 15 },
    { header: 'Cost Price', key: 'costPrice', width: 15 },
    { header: 'Total Invested', key: 'invested', width: 15 },
    { header: 'Selling Price', key: 'sellingPrice', width: 15 },
    { header: 'Qty Sold', key: 'qtySold', width: 12 },
    { header: 'Discount', key: 'discount', width: 15 },
    { header: 'Est. Revenue', key: 'revenue', width: 15 },
    { header: 'Realized Profit', key: 'profit', width: 15 },
  ];

  data.forEach((row: any) => {
    const invested = row.quantity * row.incomingPrice;
    const revenue = Number(row.soldRevenue || 0);
    const discount = Number(row.soldDiscount || 0);
    const costOfGoodsSold = row.qtySold * row.incomingPrice;
    const profit = revenue - costOfGoodsSold;
    
    sheet.addRow({
      entryDate: row.entryDate ? new Date(row.entryDate).toLocaleDateString() : '',
      productName: row.productName || 'Unnamed',
      supplier: row.supplierName || '-',
      category: row.categoryName || '-',
      qtyPurchased: row.quantity || 0,
      costPrice: row.incomingPrice || 0,
      invested,
      sellingPrice: row.sellingPrice || 0,
      qtySold: row.qtySold || 0,
      discount,
      revenue,
      profit,
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=profit-report-${Date.now()}.xlsx`);
  return res.send(Buffer.from(buffer));
});

export default router;
