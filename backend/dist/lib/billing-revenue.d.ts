/** GST rate shown on customer bills (5% on MRP subtotal). */
export declare const BILLING_GST_RATE = 0.05;
export declare const lineDiscountTotal: (item: any) => number;
export declare const lineMrpTotal: (item: any) => number;
/**
 * Revenue for profit/purchase batches and ex-GST reports.
 * Shop discounts apply to (MRP + GST) on the bill; for internal batches,
 * discount is applied to the GST portion first, then any remainder to MRP.
 */
export declare const lineRevenueExGst: (item: any, gstRate?: number) => number;
export declare const billRevenueExGst: (bill: any, gstRate?: number) => any;
//# sourceMappingURL=billing-revenue.d.ts.map