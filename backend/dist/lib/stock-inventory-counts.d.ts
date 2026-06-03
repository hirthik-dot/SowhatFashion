import mongoose from 'mongoose';
/** Units physically in the shop (sellable, returned awaiting restock, or damaged). */
export declare const IN_SHOP_STATUSES: readonly ["available", "returned", "damaged"];
/** Units that can be scanned and sold at billing (returned items are resellable). */
export declare const BILLABLE_STATUSES: readonly ["available", "returned"];
export declare const compareSizes: (a: string, b: string) => number;
export type SizeStockInShopRow = {
    size: string;
    stock: number;
    available: number;
    returned: number;
    damaged: number;
};
export type ProductInShopCounts = {
    stockInShop: number;
    sizeStockInShop: SizeStockInShopRow[];
};
export type ProductStockBreakdown = {
    totalInShop: number;
    totalUnits: number;
    sizes: Array<{
        size: string;
        available: number;
        returned: number;
        damaged: number;
        sold: number;
        inShop: number;
    }>;
};
export declare const buildBreakdownFromAggregateRows: (rows: Array<{
    _id?: {
        size?: string;
        status?: string;
    };
    count?: number;
}>) => ProductStockBreakdown;
export declare const breakdownToProductCounts: (breakdown: ProductStockBreakdown) => ProductInShopCounts;
export declare function getProductStockBreakdown(productId: mongoose.Types.ObjectId | string): Promise<ProductStockBreakdown>;
export declare function getInShopCountsByProducts(productIds: Array<mongoose.Types.ObjectId | string>): Promise<Map<string, ProductInShopCounts>>;
export declare function getBillingInShopSummary(): Promise<{
    totalProducts: number;
    totalUnits: number;
    totalRetailValue: number;
    totalCostValue: number;
    lowStock: number;
    outOfStock: number;
}>;
//# sourceMappingURL=stock-inventory-counts.d.ts.map