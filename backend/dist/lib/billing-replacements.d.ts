import type { IBill } from '../models/Bill';
export type ReplacementLinePayload = {
    product?: unknown;
    productId?: unknown;
    barcode?: string;
    name?: string;
    size?: string;
    quantity?: number;
    mrp?: number;
    sellingPrice?: number;
    itemDiscountType?: string;
    itemDiscountValue?: number;
    itemDiscountAmount?: number;
    billDiscountShare?: number;
    lineTotal?: number;
    netLineTotal?: number;
};
export declare const itemBarcodes: (item: any) => string[];
/** Bill lines still eligible for return (excludes swapped-out originals and replacement lines). */
export declare const returnableBillItems: (bill: any) => any;
/** One returned row per physical barcode (fixes multi-qty lines and inventory). */
export declare const expandReturnedLineItems: (items: ReplacementLinePayload[]) => ReplacementLinePayload[];
export declare const billForReturn: (bill: any) => any;
/** Mark returned lines and append replacement lines on the bill (for profit & discounts). */
export declare const applyReplacementToBill: (bill: IBill, returnedItems: ReplacementLinePayload[], replacementItems: ReplacementLinePayload[]) => void;
/** Active bill lines for revenue/profit (excludes returned-out originals). */
export declare const activeBillItems: (bill: any, returns?: any[]) => any[];
export declare const billWithActiveItems: (bill: any, returns?: any[]) => any;
//# sourceMappingURL=billing-replacements.d.ts.map