import express, { Response } from 'express';
import ExcelJS from 'exceljs';
import Bill from '../models/Bill';
import BillingReturn from '../models/Return';
import { requireAdmin, requirePermission } from '../middleware/billingRoleMiddleware';

const router = express.Router();
router.use(requireAdmin);
router.use(requirePermission('canViewReports'));
const FINALIZED_STATUSES = ['completed', 'replaced', 'partial_replaced', 'returned', 'partial_return'];

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

  const totalRevenue = bills.reduce((sum, bill) => sum + Number(bill.totalAmount || 0), 0);
  const totalBills = bills.length;
  const totalItems = bills.reduce((sum, bill) => sum + (bill.items || []).reduce((x: number, i: any) => x + Number(i.quantity || 0), 0), 0);
  const totalDiscount = bills.reduce((sum, bill) => sum + Number(bill.totalItemDiscount || 0) + Number(bill.billDiscountAmount || 0), 0);
  const totalGst = bills.reduce((sum, bill) => sum + Number(bill.gstAmount || 0), 0);
  const avgBillValue = totalBills ? totalRevenue / totalBills : 0;

  const paymentMethodBreakdown = bills.reduce((acc: any, bill: any) => {
    const method = bill.paymentMethod || 'unknown';
    acc[method] = (acc[method] || 0) + Number(bill.totalAmount || 0);
    return acc;
  }, {});

  const categoryBreakdown = bills.reduce((acc: any, bill: any) => {
    (bill.items || []).forEach((item: any) => {
      const key = item.category || 'Uncategorized';
      acc[key] = (acc[key] || 0) + Number(item.lineTotal || 0);
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
    acc[salesmanId].totalRevenue += Number(bill.totalAmount || 0);
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
    acc[dayStr] = (acc[dayStr] || 0) + Number(bill.totalAmount || 0);
    return acc;
  }, {});
  
  const dailyRevenue = Object.entries(dailyRevenueMap)
    .map(([day, value]) => ({ day, value }))
    .sort((a: any, b: any) => a.day.localeCompare(b.day));

  return res.json({
    totalRevenue,
    totalBills,
    totalItems,
    totalReturns: returnsCount,
    totalDiscount,
    totalGst,
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
  const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
  const query = getDateFilter(startDate, endDate);
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
      })),
    })),
    total,
    page,
    limit,
  });
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
        totalSpent: { $sum: '$totalAmount' },
        totalDiscount: { $sum: { $add: ['$totalItemDiscount', '$billDiscountAmount'] } },
        lastVisit: { $max: '$createdAt' },
        firstVisit: { $min: '$createdAt' },
        avgBillValue: { $avg: '$totalAmount' },
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
        totalSpent: { $sum: '$totalAmount' },
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
        totalSpent: { $sum: '$totalAmount' },
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

  res.json({
    data,
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
  const [bills, returns] = await Promise.all([
    Bill.find(billQuery).populate('salesman', 'name phone').sort({ createdAt: -1 }).lean(),
    BillingReturn.find({ 'customer.phone': phone }).sort({ createdAt: -1 }).lean(),
  ]);

  if (!bills.length && !returns.length) return res.status(404).json({ message: 'Customer not found' });

  const billMetrics = bills.reduce(
    (acc: any, bill: any) => {
      acc.totalSpent += Number(bill.totalAmount || 0);
      acc.totalDiscount += Number(bill.totalItemDiscount || 0) + Number(bill.billDiscountAmount || 0);
      acc.payments[bill.paymentMethod || 'unknown'] = (acc.payments[bill.paymentMethod || 'unknown'] || 0) + 1;
      (bill.items || []).forEach((item: any) => {
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
    },
    bills,
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
  ];
  bills.forEach((bill: any) => {
    (bill.items || []).forEach((item: any) => {
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
    acc[key].revenue += Number(bill.totalAmount || 0);
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

router.get('/profit', requirePermission('canViewReports'), async (req, res: Response) => {
  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
  const skip = (page - 1) * limit;

  const StockEntry = req.app.get('mongoose')?.model('StockEntry') || require('../models/StockEntry').default;

  const pipeline: any[] = [
    { $sort: { entryDate: -1, createdAt: -1 } },
    { $skip: skip },
    { $limit: limit },
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
    {
      $project: {
        entryDate: 1,
        productName: 1,
        supplierName: { $arrayElemAt: ['$supplierDoc.name', 0] },
        categoryName: { $arrayElemAt: ['$categoryDoc.name', 0] },
        quantity: 1,
        incomingPrice: 1,
        sellingPrice: 1,
        totalInvestment: { $multiply: ['$quantity', '$incomingPrice'] },
        totalPotentialRevenue: { $multiply: ['$quantity', '$sellingPrice'] },
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
    },
    {
      $addFields: {
        soldRevenue: { $multiply: ['$qtySold', '$sellingPrice'] },
        soldCost: { $multiply: ['$qtySold', '$incomingPrice'] }
      }
    },
    {
      $addFields: {
        realizedProfit: { $subtract: ['$soldRevenue', '$soldCost'] }
      }
    }
  ];

  const data = await StockEntry.aggregate(pipeline);
  const total = await StockEntry.countDocuments();
  
  const overallPipeline: any[] = [
    {
      $lookup: {
        from: 'stockitems',
        localField: '_id',
        foreignField: 'stockEntry',
        as: 'items'
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
        overallSoldRevenue: { $sum: { $multiply: ['$qtySold', '$sellingPrice'] } },
        overallSoldCost: { $sum: { $multiply: ['$qtySold', '$incomingPrice'] } },
      }
    }
  ];
  
  const overallRows = await StockEntry.aggregate(overallPipeline);
  const overall = overallRows[0] || { overallPurchased: 0, overallSold: 0, overallInvestment: 0, overallSoldRevenue: 0, overallSoldCost: 0 };
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
      totalRealizedProfit: overallRealizedProfit || 0,
      profitMargin: overall.overallSoldRevenue ? (overallRealizedProfit / overall.overallSoldRevenue) * 100 : 0
    }
  });
});

router.get('/profit/export', requirePermission('canViewReports'), async (req, res: Response) => {
  const StockEntry = req.app.get('mongoose')?.model('StockEntry') || require('../models/StockEntry').default;
  const data = await StockEntry.aggregate([
    { $sort: { entryDate: -1, createdAt: -1 } },
    { $lookup: { from: 'stockitems', localField: '_id', foreignField: 'stockEntry', as: 'items' } },
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
        qtySold: {
          $size: {
            $filter: { input: '$items', as: 'item', cond: { $eq: ['$$item.status', 'sold'] } }
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
    { header: 'Est. Revenue', key: 'revenue', width: 15 },
    { header: 'Realized Profit', key: 'profit', width: 15 },
  ];

  data.forEach((row: any) => {
    const invested = row.quantity * row.incomingPrice;
    const revenue = row.qtySold * row.sellingPrice;
    const costOfGoodsSold = row.qtySold * row.incomingPrice;
    const profit = revenue - costOfGoodsSold;
    
    sheet.addRow({
      entryDate: row.entryDate ? new Date(row.entryDate).toLocaleDateString() : '',
      productName: row.productName || 'Unnamed',
      supplier: row.supplierName || '-',
      category: row.categoryName || '-',
      qtyPurchased: row.quantity || 0,
      costPrice: row.incomingPrice || 0,
      invested: invested || 0,
      sellingPrice: row.sellingPrice || 0,
      qtySold: row.qtySold || 0,
      revenue: revenue || 0,
      profit: profit || 0,
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=profit-report-${Date.now()}.xlsx`);
  return res.send(Buffer.from(buffer));
});

export default router;
