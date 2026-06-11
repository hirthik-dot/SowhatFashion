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
/** Revenue for profit/purchase batches and ex-GST reports. */
const lineRevenueExGst = (item, gstRate = exports.BILLING_GST_RATE) => {
    const lineAfterItem = Math.max(0, (0, exports.lineMrpTotal)(item) - (0, exports.lineItemDiscountTotal)(item));
    const lineGross = lineAfterItem * (1 + gstRate);
    const billShare = Number(item?.billDiscountShare || 0);
    return Math.max(0, (lineGross - billShare) / (1 + gstRate));
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
    return Number(item?.itemDiscountAmount || 0) + Number(item?.billDiscountShare || 0) / qty;
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
    const afterItemDiscount = Math.max(0, subtotal - Number(bill?.totalItemDiscount || 0));
    const grossWithGst = afterItemDiscount * (1 + gstRate);
    return Math.max(0, (grossWithGst - Number(bill?.billDiscountAmount || 0)) / (1 + gstRate));
};
exports.billRevenueExGst = billRevenueExGst;
//# sourceMappingURL=billing-revenue.js.map