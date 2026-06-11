/** GST is 5% on amount after item discounts; customer discount applies to (after item discount + GST). */
export const BILLING_GST_RATE = 0.05;

export const lineMrpTotal = (item: any) => {
  const qty = Math.max(1, Number(item?.quantity || 1));
  return Number(item?.mrp ?? item?.sellingPrice ?? 0) * qty;
};

export const lineItemDiscountTotal = (item: any) => {
  const qty = Math.max(1, Number(item?.quantity || 1));
  return Number(item?.itemDiscountAmount || 0) * qty;
};

/** Revenue for profit/purchase batches and ex-GST reports.
 *  Revenue = selling price after item discounts (ex-GST).
 *  Customer/bill discounts do NOT reduce revenue — they are reflected in cash collected. */
export const lineRevenueExGst = (item: any, _gstRate = BILLING_GST_RATE) => {
  return Math.max(0, lineMrpTotal(item) - lineItemDiscountTotal(item));
};

/** One physical unit's share of line revenue (purchase-batch profit uses per-barcode rows). */
export const lineRevenueExGstPerUnit = (item: any, gstRate = BILLING_GST_RATE) => {
  const qty = Math.max(1, Number(item?.quantity || 1));
  return lineRevenueExGst(item, gstRate) / qty;
};

export const unitLineDiscountTotal = (item: any) => {
  return Number(item?.itemDiscountAmount || 0);
};

/** Bill lines that still count toward revenue (excludes returned-out originals). */
export const activeBillLineItems = (bill: any) =>
  (bill?.items || []).filter((item: any) => !item.replacedOut);

export const billRevenueExGst = (bill: any, gstRate = BILLING_GST_RATE) => {
  const items = activeBillLineItems(bill);
  if (items.length) {
    return items.reduce((sum: number, item: any) => sum + lineRevenueExGst(item, gstRate), 0);
  }
  const subtotal = Math.max(0, Number(bill?.subtotal || 0));
  return Math.max(0, subtotal - Number(bill?.totalItemDiscount || 0));
};
