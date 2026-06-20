export declare const PENDING_BILL_STATUSES: string[];
export declare const getCustomerPendingBalance: (phone: string) => Promise<number>;
export declare const getPendingBalancesByPhones: (phones: string[]) => Promise<Map<string, number>>;
export declare const findPendingBillsForPhone: (phone: string) => Promise<(import("mongoose").FlattenMaps<import("../models/Bill").IBill> & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
})[]>;
//# sourceMappingURL=billing-pending.d.ts.map