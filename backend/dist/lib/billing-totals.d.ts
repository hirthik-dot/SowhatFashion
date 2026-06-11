/** GST is 5% on amount after item discounts; customer discount applies to (after item discount + GST). */
export declare const BILLING_GST_RATE = 0.05;
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
export declare const itemDiscountPerUnit: (mrp: number, type: string, value: number) => number;
export declare const computeBillTotals: (items: RawItem[], billDiscountType: string, billDiscountValue: number, pointsDiscountAmount?: number) => BillTotalsResult;
export declare const gstOnAfterItemDiscount: (subtotal: number, totalItemDiscount?: number) => {
    taxableAmount: number;
    gstAmount: number;
    cgst: number;
    sgst: number;
};
export declare const billGrossWithGst: (subtotal: number, totalItemDiscount?: number) => number;
export {};
//# sourceMappingURL=billing-totals.d.ts.map