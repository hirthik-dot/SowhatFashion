import { activeBillItems } from "./return-utils";

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

export const lineRevenueExGst = (item: any, gstRate = BILLING_GST_RATE) => {
  const lineMrp = lineMrpTotal(item);
  const lineDiscount = lineDiscountTotal(item);
  const lineGst = lineMrp * gstRate;
  const mrpDiscount = Math.max(0, lineDiscount - lineGst);
  return Math.max(0, lineMrp - mrpDiscount);
};

export const billRevenueExGst = (bill: any, gstRate = BILLING_GST_RATE) => {
  const items = activeBillItems(bill?.items);
  if (items.length) {
    return items.reduce((sum, item) => sum + lineRevenueExGst(item, gstRate), 0);
  }
  const subtotal = Math.max(0, Number(bill?.subtotal || 0));
  const totalDiscount = Number(bill?.totalItemDiscount || 0) + Number(bill?.billDiscountAmount || 0);
  const billGst = subtotal * gstRate;
  const mrpDiscount = Math.max(0, totalDiscount - billGst);
  return Math.max(0, subtotal - mrpDiscount);
};
