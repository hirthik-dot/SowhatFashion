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

const returnedBarcodeSet = (returnedItems: ReplacementLinePayload[]) =>
  new Set(
    returnedItems
      .map((item) => String(item.barcode || '').trim())
      .filter(Boolean)
  );

export const itemBarcodes = (item: any): string[] => {
  if (Array.isArray(item.barcodes) && item.barcodes.length > 0) {
    return item.barcodes.map((b: string) => String(b || '').trim()).filter(Boolean);
  }
  const single = String(item.barcode || '').trim();
  return single ? [single] : [];
};

/** Bill lines still eligible for return (excludes swapped-out originals and replacement lines). */
export const returnableBillItems = (bill: any) => {
  const items = Array.isArray(bill?.items) ? bill.items : [];
  return items.filter((item: any) => !item.replacedOut && !item.isReplacement);
};

/** One returned row per physical barcode (fixes multi-qty lines and inventory). */
export const expandReturnedLineItems = (items: ReplacementLinePayload[]) => {
  const expanded: ReplacementLinePayload[] = [];
  for (const item of items || []) {
    const qty = Math.max(1, Number(item.quantity || 1));
    const codes = itemBarcodes(item).slice(0, qty);
    const unitPrice =
      Number(item.sellingPrice || 0) > 0
        ? Number(item.sellingPrice)
        : Number((item as any).lineTotal || 0) / qty || Number(item.mrp || 0);

    if (codes.length === 0) {
      const barcode = String(item.barcode || '').trim();
      if (barcode) expanded.push({ ...item, barcode, quantity: 1, sellingPrice: unitPrice });
      continue;
    }

    for (const barcode of codes) {
      expanded.push({
        ...item,
        barcode,
        quantity: 1,
        sellingPrice: unitPrice,
      });
    }
  }
  return expanded;
};

export const billForReturn = (bill: any) => ({
  ...(typeof bill?.toObject === 'function' ? bill.toObject() : bill),
  items: returnableBillItems(bill),
});

/** Mark returned lines and append replacement lines on the bill (for profit & discounts). */
export const applyReplacementToBill = (
  bill: IBill,
  returnedItems: ReplacementLinePayload[],
  replacementItems: ReplacementLinePayload[]
) => {
  const returned = returnedBarcodeSet(returnedItems);
  const items = Array.isArray(bill.items) ? [...bill.items] : [];

  const updated = items.flatMap((item: any) => {
    const barcodes = itemBarcodes(item);
    const returnedOnLine = barcodes.filter((code) => returned.has(code));
    if (returnedOnLine.length === 0) return [item];
    if (returnedOnLine.length >= barcodes.length) {
      return [{ ...item, replacedOut: true }];
    }
    const remaining = barcodes.filter((code) => !returned.has(code));
    const qty = Math.max(1, Number(item.quantity || 1));
    const unitSelling =
      Number(item.sellingPrice || 0) > 0
        ? Number(item.sellingPrice)
        : Number(item.lineTotal || 0) / qty || Number(item.mrp || 0);
    const unitLine = Number(item.lineTotal || 0) / qty || unitSelling;
    return [
      {
        ...item,
        quantity: returnedOnLine.length,
        barcodes: returnedOnLine,
        barcode: returnedOnLine[0],
        sellingPrice: unitSelling,
        lineTotal: unitLine * returnedOnLine.length,
        netLineTotal: unitLine * returnedOnLine.length,
        replacedOut: true,
      },
      {
        ...item,
        quantity: remaining.length,
        barcodes: remaining,
        barcode: remaining[0],
        sellingPrice: unitSelling,
        lineTotal: unitLine * remaining.length,
        netLineTotal: unitLine * remaining.length,
        replacedOut: false,
      },
    ];
  });

  for (const rep of replacementItems) {
    const barcode = String(rep.barcode || '').trim();
    const qty = Math.max(1, Number(rep.quantity || 1));
    const mrp = Number(rep.mrp ?? rep.sellingPrice ?? 0);
    const itemDiscountAmount = Number(rep.itemDiscountAmount || 0);
    const billDiscountShare = Number(rep.billDiscountShare || 0);
    const netLine =
      Number(rep.netLineTotal || 0) > 0
        ? Number(rep.netLineTotal)
        : Number(rep.lineTotal || 0) > 0
          ? Number(rep.lineTotal)
          : Math.max(0, mrp * qty - itemDiscountAmount * qty - billDiscountShare);
    const sellingPrice =
      Number(rep.sellingPrice || 0) > 0 ? Number(rep.sellingPrice) : netLine / qty;

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
    } as any);
  }

  bill.items = updated as any;
  (bill as any).markModified?.('items');
};

/** Active bill lines for revenue/profit (excludes returned-out originals). */
export const activeBillItems = (bill: any, returns: any[] = []) => {
  let items = Array.isArray(bill?.items) ? [...bill.items] : [];
  const hasReplacementLines = items.some((item: any) => item.isReplacement);
  const hasReplacedOut = items.some((item: any) => item.replacedOut);

  if (!hasReplacementLines && !hasReplacedOut && returns.length > 0) {
    const returned = new Set<string>();
    const replacementLines: any[] = [];
    for (const ret of returns) {
      for (const row of ret.returnedItems || []) {
        const code = String(row.barcode || '').trim();
        if (code) returned.add(code);
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
    items = items.map((item: any) => {
      const barcodes = itemBarcodes(item);
      if (barcodes.some((code) => returned.has(code))) {
        return { ...item, replacedOut: true };
      }
      return item;
    });
    items.push(...replacementLines);
  }

  return items.filter((item: any) => !item.replacedOut && !item.isReplacement);
};

export const billWithActiveItems = (bill: any, returns: any[] = []) => ({
  ...bill,
  items: activeBillItems(bill, returns),
});
