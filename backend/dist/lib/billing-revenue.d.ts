/** GST is 5% on amount after item discounts; customer discount applies to (after item discount + GST). */
export declare const BILLING_GST_RATE = 0.05;
export declare const lineMrpTotal: (item: any) => number;
export declare const lineItemDiscountTotal: (item: any) => number;
/** Revenue for profit/purchase batches and ex-GST reports.
 *  Revenue = selling price after item discounts (ex-GST).
 *  Customer/bill discounts do NOT reduce revenue — they are reflected in cash collected. */
export declare const lineRevenueExGst: (item: any, _gstRate?: number) => number;
/** One physical unit's share of line revenue (purchase-batch profit uses per-barcode rows). */
export declare const lineRevenueExGstPerUnit: (item: any, gstRate?: number) => number;
export declare const unitLineDiscountTotal: (item: any) => number;
/** Bill lines that still count toward revenue (excludes returned-out originals). */
export declare const activeBillLineItems: (bill: any) => any;
export declare const billRevenueExGst: (bill: any, gstRate?: number) => any;
//# sourceMappingURL=billing-revenue.d.ts.map