/** GST rate shown on customer bills (5% on MRP subtotal). */
export const BILLING_GST_RATE = 0.05;

export const lineDiscountTotal = (item: any) => {
  const qty = Math.max(1, Number(item?.quantity || 1));
  return Number(item?.itemDiscountAmount || 0) * qty + Number(item?.billDiscountShare || 0);
};

export const lineMrpTotal = (item: any) => {
  const qty = Math.max(1, Number(item?.quantity || 1));
  return Number(item?.mrp ?? item?.sellingPrice ?? 0) * qty;
};

/**
 * Revenue for profit/purchase batches and ex-GST reports.
 * Shop discounts apply to (MRP + GST) on the bill; for internal batches,
 * discount is applied to the GST portion first, then any remainder to MRP.
 */
export const lineRevenueExGst = (item: any, gstRate = BILLING_GST_RATE) => {
  const lineMrp = lineMrpTotal(item);
  const lineDiscount = lineDiscountTotal(item);
  const lineGst = lineMrp * gstRate;
  const mrpDiscount = Math.max(0, lineDiscount - lineGst);
  return Math.max(0, lineMrp - mrpDiscount);
};

/** One physical unit's share of line revenue (purchase-batch profit uses per-barcode rows). */
export const lineRevenueExGstPerUnit = (item: any, gstRate = BILLING_GST_RATE) => {
  const qty = Math.max(1, Number(item?.quantity || 1));
  return lineRevenueExGst(item, gstRate) / qty;
};

export const unitLineDiscountTotal = (item: any) => {
  const qty = Math.max(1, Number(item?.quantity || 1));
  return (
    Number(item?.itemDiscountAmount || 0) + Number(item?.billDiscountShare || 0) / qty
  );
};

export const billRevenueExGst = (bill: any, gstRate = BILLING_GST_RATE) => {
  const items = bill?.items || [];
  if (items.length) {
    return items.reduce((sum: number, item: any) => sum + lineRevenueExGst(item, gstRate), 0);
  }
  const subtotal = Math.max(0, Number(bill?.subtotal || 0));
  const totalDiscount = Number(bill?.totalItemDiscount || 0) + Number(bill?.billDiscountAmount || 0);
  const billGst = subtotal * gstRate;
  const mrpDiscount = Math.max(0, totalDiscount - billGst);
  return Math.max(0, subtotal - mrpDiscount);
};
