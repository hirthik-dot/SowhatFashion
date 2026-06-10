/** Loyalty points rules — earn on pre-points bill total; redeem before payment. */
export declare const EARN_RUPEES_PER_POINT = 10;
export declare const REDEEM_RUPEES_PER_POINT = 0.25;
export declare const MIN_REDEEM_POINTS = 100;
export type PointsMode = 'earn' | 'redeem' | 'none';
export declare const normalizeBillingPhone: (phone: string) => string;
export declare const calcPointsEarned: (prePointsTotalRupees: number) => number;
export declare const calcPointsDiscountRupees: (pointsRedeemed: number) => number;
export declare const maxRedeemablePoints: (prePointsTotalRupees: number, balance: number) => number;
export declare const validatePointsForBill: (params: {
    pointsMode: PointsMode;
    awardPoints: boolean;
    pointsToRedeem: number;
    prePointsTotal: number;
    balance: number;
    phone: string;
}) => {
    pointsEarned: number;
    pointsRedeemed: number;
    pointsDiscountAmount: number;
    error?: string;
};
export declare const getOrCreatePointsAccount: (phone: string, customerName: string, BillingPointsAccount: {
    findOne: (q: object) => {
        lean: () => Promise<any>;
    };
    create: (d: object) => Promise<any>;
}) => Promise<{
    account: any;
    normalized: string;
}>;
export declare const applyPointsLedger: (params: {
    phone: string;
    customerName: string;
    pointsEarned: number;
    pointsRedeemed: number;
    pointsDiscountAmount: number;
    billId: unknown;
    billNumber: string;
    createdBy?: unknown;
    BillingPointsAccount: any;
    BillingPointsLedger: any;
}) => Promise<number>;
export declare const clawbackPointsOnReturn: (params: {
    phone: string;
    refundAmount: number;
    originalPointsEarned: number;
    billId: unknown;
    billNumber: string;
    createdBy?: unknown;
    BillingPointsAccount: any;
    BillingPointsLedger: any;
}) => Promise<void>;
//# sourceMappingURL=billing-points.d.ts.map