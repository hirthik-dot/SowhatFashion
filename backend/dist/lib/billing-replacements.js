"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.billWithActiveItems = exports.activeBillItems = exports.applyReplacementToBill = void 0;
const returnedBarcodeSet = (returnedItems) => new Set(returnedItems
    .map((item) => String(item.barcode || '').trim())
    .filter(Boolean));
const itemBarcodes = (item) => {
    if (Array.isArray(item.barcodes) && item.barcodes.length > 0) {
        return item.barcodes.map((b) => String(b || '').trim()).filter(Boolean);
    }
    const single = String(item.barcode || '').trim();
    return single ? [single] : [];
};
/** Mark returned lines and append replacement lines on the bill (for profit & discounts). */
const applyReplacementToBill = (bill, returnedItems, replacementItems) => {
    const returned = returnedBarcodeSet(returnedItems);
    const items = Array.isArray(bill.items) ? [...bill.items] : [];
    const updated = items.map((item) => {
        const barcodes = itemBarcodes(item);
        if (barcodes.some((code) => returned.has(code))) {
            return { ...item, replacedOut: true };
        }
        return item;
    });
    for (const rep of replacementItems) {
        const barcode = String(rep.barcode || '').trim();
        const qty = Math.max(1, Number(rep.quantity || 1));
        const mrp = Number(rep.mrp ?? rep.sellingPrice ?? 0);
        const itemDiscountAmount = Number(rep.itemDiscountAmount || 0);
        const billDiscountShare = Number(rep.billDiscountShare || 0);
        const netLine = Number(rep.netLineTotal || 0) > 0
            ? Number(rep.netLineTotal)
            : Number(rep.lineTotal || 0) > 0
                ? Number(rep.lineTotal)
                : Math.max(0, mrp * qty - itemDiscountAmount * qty - billDiscountShare);
        const sellingPrice = Number(rep.sellingPrice || 0) > 0 ? Number(rep.sellingPrice) : netLine / qty;
        updated.push({
            product: rep.product || rep.productId,
            barcode,
            barcodes: barcode ? [barcode] : [],
            name: String(rep.name || '').trim(),
            size: String(rep.size || '').trim(),
            mrp,
            itemDiscountType: rep.itemDiscountType || 'none',
            itemDiscountValue: Number(rep.itemDiscountValue || 0),
            itemDiscountAmount,
            billDiscountShare,
            sellingPrice,
            quantity: qty,
            gstPercent: 5,
            lineTotal: netLine,
            netLineTotal: netLine,
            isReplacement: true,
            replacedOut: false,
        });
    }
    bill.items = updated;
    bill.markModified?.('items');
};
exports.applyReplacementToBill = applyReplacementToBill;
/** Active bill lines for revenue/profit (excludes returned-out originals). */
const activeBillItems = (bill, returns = []) => {
    let items = Array.isArray(bill?.items) ? [...bill.items] : [];
    const hasReplacementLines = items.some((item) => item.isReplacement);
    const hasReplacedOut = items.some((item) => item.replacedOut);
    if (!hasReplacementLines && !hasReplacedOut && returns.length > 0) {
        const returned = new Set();
        const replacementLines = [];
        for (const ret of returns) {
            for (const row of ret.returnedItems || []) {
                const code = String(row.barcode || '').trim();
                if (code)
                    returned.add(code);
            }
            for (const rep of ret.replacementItems || []) {
                const barcode = String(rep.barcode || '').trim();
                const qty = Math.max(1, Number(rep.quantity || 1));
                const mrp = Number(rep.mrp ?? rep.sellingPrice ?? 0);
                const sellingPrice = Number(rep.sellingPrice || 0);
                const lineTotal = sellingPrice * qty;
                replacementLines.push({
                    product: rep.product,
                    barcode,
                    barcodes: barcode ? [barcode] : [],
                    name: rep.name,
                    size: rep.size,
                    mrp,
                    itemDiscountAmount: Number(rep.itemDiscountAmount || 0),
                    billDiscountShare: Number(rep.billDiscountShare || 0),
                    sellingPrice,
                    quantity: qty,
                    lineTotal,
                    netLineTotal: lineTotal,
                    isReplacement: true,
                    replacedOut: false,
                });
            }
        }
        items = items.map((item) => {
            const barcodes = itemBarcodes(item);
            if (barcodes.some((code) => returned.has(code))) {
                return { ...item, replacedOut: true };
            }
            return item;
        });
        items.push(...replacementLines);
    }
    return items.filter((item) => !item.replacedOut);
};
exports.activeBillItems = activeBillItems;
const billWithActiveItems = (bill, returns = []) => ({
    ...bill,
    items: (0, exports.activeBillItems)(bill, returns),
});
exports.billWithActiveItems = billWithActiveItems;
//# sourceMappingURL=billing-replacements.js.map