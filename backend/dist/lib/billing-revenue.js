"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.billRevenueExGst = exports.unitLineDiscountTotal = exports.lineRevenueExGstPerUnit = exports.lineRevenueExGst = exports.lineMrpTotal = exports.lineDiscountTotal = exports.BILLING_GST_RATE = void 0;
/** GST rate shown on customer bills (5% on MRP subtotal). */
exports.BILLING_GST_RATE = 0.05;
const lineDiscountTotal = (item) => {
    const qty = Math.max(1, Number(item?.quantity || 1));
    return Number(item?.itemDiscountAmount || 0) * qty + Number(item?.billDiscountShare || 0);
};
exports.lineDiscountTotal = lineDiscountTotal;
const lineMrpTotal = (item) => {
    const qty = Math.max(1, Number(item?.quantity || 1));
    return Number(item?.mrp ?? item?.sellingPrice ?? 0) * qty;
};
exports.lineMrpTotal = lineMrpTotal;
/**
 * Revenue for profit/purchase batches and ex-GST reports.
 * Shop discounts apply to (MRP + GST) on the bill; for internal batches,
 * discount is applied to the GST portion first, then any remainder to MRP.
 */
const lineRevenueExGst = (item, gstRate = exports.BILLING_GST_RATE) => {
    const lineMrp = (0, exports.lineMrpTotal)(item);
    const lineDiscount = (0, exports.lineDiscountTotal)(item);
    const lineGst = lineMrp * gstRate;
    const mrpDiscount = Math.max(0, lineDiscount - lineGst);
    return Math.max(0, lineMrp - mrpDiscount);
};
exports.lineRevenueExGst = lineRevenueExGst;
/** One physical unit's share of line revenue (purchase-batch profit uses per-barcode rows). */
const lineRevenueExGstPerUnit = (item, gstRate = exports.BILLING_GST_RATE) => {
    const qty = Math.max(1, Number(item?.quantity || 1));
    return (0, exports.lineRevenueExGst)(item, gstRate) / qty;
};
exports.lineRevenueExGstPerUnit = lineRevenueExGstPerUnit;
const unitLineDiscountTotal = (item) => {
    const qty = Math.max(1, Number(item?.quantity || 1));
    return (Number(item?.itemDiscountAmount || 0) + Number(item?.billDiscountShare || 0) / qty);
};
exports.unitLineDiscountTotal = unitLineDiscountTotal;
const billRevenueExGst = (bill, gstRate = exports.BILLING_GST_RATE) => {
    const items = bill?.items || [];
    if (items.length) {
        return items.reduce((sum, item) => sum + (0, exports.lineRevenueExGst)(item, gstRate), 0);
    }
    const subtotal = Math.max(0, Number(bill?.subtotal || 0));
    const totalDiscount = Number(bill?.totalItemDiscount || 0) + Number(bill?.billDiscountAmount || 0);
    const billGst = subtotal * gstRate;
    const mrpDiscount = Math.max(0, totalDiscount - billGst);
    return Math.max(0, subtotal - mrpDiscount);
};
exports.billRevenueExGst = billRevenueExGst;
//# sourceMappingURL=billing-revenue.js.map