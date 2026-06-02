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
/** Mark returned lines and append replacement lines on the bill (for profit & discounts). */
export declare const applyReplacementToBill: (bill: IBill, returnedItems: ReplacementLinePayload[], replacementItems: ReplacementLinePayload[]) => void;
/** Active bill lines for revenue/profit (excludes returned-out originals). */
export declare const activeBillItems: (bill: any, returns?: any[]) => any[];
export declare const billWithActiveItems: (bill: any, returns?: any[]) => any;
//# sourceMappingURL=billing-replacements.d.ts.map