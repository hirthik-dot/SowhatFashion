"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.billRevenueExGst = exports.activeBillLineItems = exports.unitLineDiscountTotal = exports.lineRevenueExGstPerUnit = exports.lineRevenueExGst = exports.lineItemDiscountTotal = exports.lineMrpTotal = exports.BILLING_GST_RATE = void 0;
/** GST is 5% on amount after item discounts; customer discount applies to (after item discount + GST). */
exports.BILLING_GST_RATE = 0.05;
const lineMrpTotal = (item) => {
    const qty = Math.max(1, Number(item?.quantity || 1));
    return Number(item?.mrp ?? item?.sellingPrice ?? 0) * qty;
};
exports.lineMrpTotal = lineMrpTotal;
const lineItemDiscountTotal = (item) => {
    const qty = Math.max(1, Number(item?.quantity || 1));
    return Number(item?.itemDiscountAmount || 0) * qty;
};
exports.lineItemDiscountTotal = lineItemDiscountTotal;
/** Revenue for profit/purchase batches and ex-GST reports.
 *  Revenue = selling price after item discounts (ex-GST).
 *  Customer/bill discounts do NOT reduce revenue — they are reflected in cash collected. */
const lineRevenueExGst = (item, _gstRate = exports.BILLING_GST_RATE) => {
    return Math.max(0, (0, exports.lineMrpTotal)(item) - (0, exports.lineItemDiscountTotal)(item));
};
exports.lineRevenueExGst = lineRevenueExGst;
/** One physical unit's share of line revenue (purchase-batch profit uses per-barcode rows). */
const lineRevenueExGstPerUnit = (item, gstRate = exports.BILLING_GST_RATE) => {
    const qty = Math.max(1, Number(item?.quantity || 1));
    return (0, exports.lineRevenueExGst)(item, gstRate) / qty;
};
exports.lineRevenueExGstPerUnit = lineRevenueExGstPerUnit;
const unitLineDiscountTotal = (item) => {
    return Number(item?.itemDiscountAmount || 0);
};
exports.unitLineDiscountTotal = unitLineDiscountTotal;
/** Bill lines that still count toward revenue (excludes returned-out originals). */
const activeBillLineItems = (bill) => (bill?.items || []).filter((item) => !item.replacedOut);
exports.activeBillLineItems = activeBillLineItems;
const billRevenueExGst = (bill, gstRate = exports.BILLING_GST_RATE) => {
    const items = (0, exports.activeBillLineItems)(bill);
    if (items.length) {
        return items.reduce((sum, item) => sum + (0, exports.lineRevenueExGst)(item, gstRate), 0);
    }
    const subtotal = Math.max(0, Number(bill?.subtotal || 0));
    return Math.max(0, subtotal - Number(bill?.totalItemDiscount || 0));
};
exports.billRevenueExGst = billRevenueExGst;
//# sourceMappingURL=billing-revenue.js.map