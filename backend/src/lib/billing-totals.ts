/** GST is 5% on amount after item discounts; customer discount applies to (after item discount + GST). */
export const BILLING_GST_RATE = 0.05;

type RawItem = {
  mrp?: number;
  price?: number;
  quantity?: number;
  itemDiscountType?: string;
  itemDiscountValue?: number;
  [key: string]: unknown;
};

export type BillTotalsResult = {
  normalizedItems: any[];
  subtotal: number;
  totalItemDiscount: number;
  afterItemDiscount: number;
  billDiscountAmount: number;
  grossWithGst: number;
  netInclusive: number;
  taxableAmount: number;
  gstAmount: number;
  cgst: number;
  sgst: number;
  roundOff: number;
  prePointsTotal: number;
  pointsDiscountAmount: number;
  totalAmount: number;
};

export const itemDiscountPerUnit = (mrp: number, type: string, value: number): number => {
  if (type === 'percent') return (mrp * Number(value || 0)) / 100;
  if (type === 'amount') return Number(value || 0);
  return 0;
};

export const computeBillTotals = (
  items: RawItem[],
  billDiscountType: string,
  billDiscountValue: number,
  pointsDiscountAmount = 0
): BillTotalsResult => {
  const normalizedItems = (items || []).map((item) => {
    const mrp = Number(item.mrp ?? item.price ?? 0);
    const quantity = Math.max(1, Number(item.quantity || 1));
    const discountType = String(item.itemDiscountType || 'none');
    const discountValue = Number(item.itemDiscountValue || 0);
    const itemDiscountAmount = itemDiscountPerUnit(mrp, discountType, discountValue);
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
  const totalItemDiscount = normalizedItems.reduce(
    (sum, item) => sum + item.itemDiscountAmount * item.quantity,
    0
  );
  const afterItemDiscount = Math.max(0, subtotal - totalItemDiscount);
  const taxableAmount = afterItemDiscount;
  const gstAmount = taxableAmount * BILLING_GST_RATE;
  const grossWithGst = afterItemDiscount + gstAmount;

  const safeBillDiscountValue = Number(billDiscountValue || 0);
  const billDiscountRaw =
    billDiscountType === 'percent'
      ? (grossWithGst * safeBillDiscountValue) / 100
      : billDiscountType === 'amount'
      ? safeBillDiscountValue
      : 0;
  const effectiveBillDiscount = Math.min(Math.max(0, billDiscountRaw), Math.max(0, grossWithGst));

  const withBillDiscount = normalizedItems.map((item) => ({ ...item }));
  if (withBillDiscount.length > 0 && effectiveBillDiscount > 0 && grossWithGst > 0) {
    let assigned = 0;
    withBillDiscount.forEach((item, index) => {
      const lineGross = item.lineTotal * (1 + BILLING_GST_RATE);
      const proportionalShare =
        index === withBillDiscount.length - 1
          ? effectiveBillDiscount - assigned
          : Number(((lineGross / grossWithGst) * effectiveBillDiscount).toFixed(2));
      const safeShare = Math.max(0, Math.min(lineGross, proportionalShare));
      item.billDiscountShare = safeShare;
      const netLineGross = Math.max(0, lineGross - safeShare);
      item.netLineTotal = Number((netLineGross / (1 + BILLING_GST_RATE)).toFixed(2));
      assigned += safeShare;
    });
  }

  const netInclusive = Math.max(0, grossWithGst - effectiveBillDiscount);
  const prePointsRaw = netInclusive;
  const prePointsTotal = Math.round(prePointsRaw);
  const safePointsDiscount = Math.min(Math.max(0, pointsDiscountAmount), prePointsTotal);
  const rawTotal = Math.max(0, prePointsRaw - safePointsDiscount);
  const roundOff = Math.round(rawTotal) - rawTotal;
  const totalAmount = Math.round(rawTotal);

  return {
    normalizedItems: withBillDiscount,
    subtotal,
    totalItemDiscount,
    afterItemDiscount,
    billDiscountAmount: effectiveBillDiscount,
    grossWithGst,
    netInclusive,
    taxableAmount,
    gstAmount,
    cgst: gstAmount / 2,
    sgst: gstAmount / 2,
    roundOff,
    prePointsTotal,
    pointsDiscountAmount: safePointsDiscount,
    totalAmount,
  };
};

export const gstOnAfterItemDiscount = (subtotal: number, totalItemDiscount = 0) => {
  const taxableAmount = Math.max(0, Number(subtotal || 0) - Number(totalItemDiscount || 0));
  const gstAmount = taxableAmount * BILLING_GST_RATE;
  return { taxableAmount, gstAmount, cgst: gstAmount / 2, sgst: gstAmount / 2 };
};

export const billGrossWithGst = (subtotal: number, totalItemDiscount = 0) => {
  const { taxableAmount, gstAmount } = gstOnAfterItemDiscount(subtotal, totalItemDiscount);
  return taxableAmount + gstAmount;
};
