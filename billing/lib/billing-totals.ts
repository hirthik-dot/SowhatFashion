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
  prePointsTotalAmount: number;
  pointsDiscountAmount: number;
  totalAmount: number;
};

export const itemDiscountPerUnit = (mrp: number, type: string, value: number): number => {
  if (type === "percent") return (mrp * Number(value || 0)) / 100;
  if (type === "amount") return Number(value || 0);
  return 0;
};

export const computeBillTotals = (
  items: RawItem[],
  billDiscountType: string,
  billDiscountValue: number,
  pointsDiscountAmount = 0
): BillTotalsResult => {
  const subtotal = (items || []).reduce((sum, item) => sum + Number(item.mrp ?? item.price ?? 0) * Math.max(1, Number(item.quantity || 1)), 0);
  const totalItemDiscount = (items || []).reduce((sum, item) => {
    const mrp = Number(item.mrp ?? item.price ?? 0);
    const qty = Math.max(1, Number(item.quantity || 1));
    const type = String(item.itemDiscountType || "none");
    const value = Number(item.itemDiscountValue || 0);
    return sum + itemDiscountPerUnit(mrp, type, value) * qty;
  }, 0);
  const afterItemDiscount = Math.max(0, subtotal - totalItemDiscount);
  const taxableAmount = afterItemDiscount;
  const gstAmount = taxableAmount * BILLING_GST_RATE;
  const grossWithGst = afterItemDiscount + gstAmount;

  const safeBillDiscountValue = Number(billDiscountValue || 0);
  const billDiscountRaw =
    billDiscountType === "percent"
      ? (grossWithGst * safeBillDiscountValue) / 100
      : billDiscountType === "amount"
      ? safeBillDiscountValue
      : 0;
  const billDiscountAmount = Math.min(Math.max(0, billDiscountRaw), Math.max(0, grossWithGst));

  const netInclusive = Math.max(0, grossWithGst - billDiscountAmount);
  const prePointsRaw = netInclusive;
  const prePointsTotalAmount = Math.round(prePointsRaw);
  const safePointsDiscount = Math.min(Math.max(0, pointsDiscountAmount), prePointsTotalAmount);
  const raw = Math.max(0, prePointsRaw - safePointsDiscount);
  const roundOff = Math.round(raw) - raw;
  const totalAmount = Math.round(raw);

  return {
    subtotal,
    totalItemDiscount,
    afterItemDiscount,
    billDiscountAmount,
    grossWithGst,
    netInclusive,
    taxableAmount,
    gstAmount,
    cgst: gstAmount / 2,
    sgst: gstAmount / 2,
    roundOff,
    prePointsTotalAmount,
    pointsDiscountAmount: safePointsDiscount,
    totalAmount,
  };
};

export const billGrossWithGst = (subtotal: number, totalItemDiscount = 0) => {
  const afterItemDiscount = Math.max(0, Number(subtotal || 0) - Number(totalItemDiscount || 0));
  return afterItemDiscount * (1 + BILLING_GST_RATE);
};
