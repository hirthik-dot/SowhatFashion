import type { IBill } from '../models/Bill';
import { BILLING_GST_RATE } from './billing-totals';

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

/** GST-inclusive amount the customer paid for a bill line (after item + bill discounts). */
export const lineCustomerValueInclusive = (item: any, gstRate = BILLING_GST_RATE) => {
  const netLine = Number(item?.netLineTotal || item?.lineTotal || 0);
  if (netLine > 0) return Number((netLine * (1 + gstRate)).toFixed(2));
  const qty = Math.max(1, Number(item?.quantity || 1));
  const unit =
    Number(item?.sellingPrice || 0) > 0
      ? Number(item.sellingPrice)
      : Math.max(0, Number(item?.mrp || 0) - Number(item?.itemDiscountAmount || 0));
  return Number((unit * qty * (1 + gstRate)).toFixed(2));
};

export const unitCustomerValueInclusive = (item: any, gstRate = BILLING_GST_RATE) => {
  const qty = Math.max(1, Number(item?.quantity || 1));
  return lineCustomerValueInclusive(item, gstRate) / qty;
};

export const findBillLineForBarcode = (bill: any, barcode: string) => {
  const code = String(barcode || '').trim();
  if (!code) return null;
  for (const item of bill?.items || []) {
    if (itemBarcodes(item).includes(code)) return item;
  }
  return null;
};

export const replacementLineCustomerValueInclusive = (item: any, gstRate = BILLING_GST_RATE) => {
  const netLine = Number(item?.netLineTotal || item?.lineTotal || 0);
  if (netLine > 0) return Number((netLine * (1 + gstRate)).toFixed(2));
  const qty = Math.max(1, Number(item?.quantity || 1));
  const selling = Number(item?.sellingPrice || 0);
  if (selling > 0) return Number((selling * qty * (1 + gstRate)).toFixed(2));
  const mrp = Number(item?.mrp || 0);
  const disc = Number(item?.itemDiscountAmount || 0) * qty;
  const billDisc = Number(item?.billDiscountShare || 0);
  const lineGross = Math.max(0, mrp * qty - disc) * (1 + gstRate);
  return Number(Math.max(0, lineGross - billDisc).toFixed(2));
};

/** Recompute bill header totals from active (non returned-out) lines. */
export const recalculateBillTotalsFromActiveItems = (bill: any, returns: any[] = []) => {
  const activeItems = activeBillItems(bill, returns);
  if (activeItems.length === 0) return null;

  const subtotal = activeItems.reduce(
    (sum: number, item: any) => sum + Number(item.mrp || 0) * Math.max(1, Number(item.quantity || 1)),
    0
  );
  const totalItemDiscount = activeItems.reduce(
    (sum: number, item: any) =>
      sum + Number(item.itemDiscountAmount || 0) * Math.max(1, Number(item.quantity || 1)),
    0
  );
  const afterItemDiscount = Math.max(0, subtotal - totalItemDiscount);
  const billDiscountAmount = activeItems.reduce(
    (sum: number, item: any) => sum + Number(item.billDiscountShare || 0),
    0
  );
  const taxableAmount = afterItemDiscount;
  const gstAmount = taxableAmount * BILLING_GST_RATE;
  const grossWithGst = afterItemDiscount + gstAmount;
  const prePointsRaw = activeItems.reduce(
    (sum: number, item: any) => sum + lineCustomerValueInclusive(item),
    0
  );
  const pointsDiscountAmount = Math.min(
    Math.max(0, Number(bill?.pointsDiscountAmount || 0)),
    Math.round(prePointsRaw)
  );
  const rawTotal = Math.max(0, prePointsRaw - pointsDiscountAmount);
  const roundOff = Math.round(rawTotal) - rawTotal;
  const totalAmount = Math.round(rawTotal);

  return {
    subtotal,
    totalItemDiscount,
    billDiscountAmount,
    taxableAmount,
    gstAmount,
    cgst: gstAmount / 2,
    sgst: gstAmount / 2,
    grossWithGst,
    roundOff,
    totalAmount,
  };
};

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
    const lineAfterItem = Math.max(0, mrp * qty - itemDiscountAmount * qty);
    const lineGross = lineAfterItem * 1.05;
    const netLine =
      Number(rep.netLineTotal || 0) > 0
        ? Number(rep.netLineTotal)
        : Number(rep.lineTotal || 0) > 0
          ? Number(rep.lineTotal)
          : Math.max(0, (lineGross - billDiscountShare) / 1.05);
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
  const hasReplacementOnBill = items.some((item: any) => item.isReplacement && !item.replacedOut);

  if (!hasReplacementOnBill && returns.length > 0) {
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
        const netLineTotal = Number(rep.netLineTotal || rep.lineTotal || 0) || sellingPrice * qty;
        replacementLines.push({
          product: rep.product,
          barcode,
          barcodes: barcode ? [barcode] : [],
          name: rep.name,
          size: rep.size,
          mrp,
          itemDiscountType: rep.itemDiscountType || 'none',
          itemDiscountValue: Number(rep.itemDiscountValue || 0),
          itemDiscountAmount: Number(rep.itemDiscountAmount || 0),
          billDiscountShare: Number(rep.billDiscountShare || 0),
          sellingPrice,
          quantity: qty,
          lineTotal: netLineTotal,
          netLineTotal,
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

  return items.filter((item: any) => !item.replacedOut);
};

export const billWithActiveItems = (bill: any, returns: any[] = []) => ({
  ...bill,
  items: activeBillItems(bill, returns),
});
