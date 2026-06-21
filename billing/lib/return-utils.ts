/** Bill lines still eligible for return (excludes swapped-out originals and replacement lines). */
export const returnableBillItems = (items: any[] | undefined) =>
  (items || []).filter((item) => !item.replacedOut && !item.isReplacement);

const lineBarcodesForActive = (item: any): string[] => {
  if (Array.isArray(item?.barcodes) && item.barcodes.length > 0) {
    return item.barcodes.map((b: string) => String(b || "").trim()).filter(Boolean);
  }
  const single = String(item?.barcode || "").trim();
  return single ? [single] : [];
};

/** Current sold lines on a bill (excludes returned-out originals; includes replacements). */
export const activeBillItems = (items: any[] | undefined, returns?: any[]) => {
  let list = [...(items || [])];
  const hasReplacementOnBill = list.some((item) => item.isReplacement && !item.replacedOut);

  if (!hasReplacementOnBill && (returns || []).length > 0) {
    const returned = new Set<string>();
    const replacementLines: any[] = [];
    for (const ret of returns || []) {
      for (const row of ret.returnedItems || []) {
        const code = String(row.barcode || "").trim();
        if (code) returned.add(code);
      }
      for (const rep of ret.replacementItems || []) {
        const barcode = String(rep.barcode || "").trim();
        const qty = Math.max(1, Number(rep.quantity || 1));
        replacementLines.push({
          ...rep,
          barcode,
          barcodes: barcode ? [barcode] : [],
          quantity: qty,
          isReplacement: true,
          replacedOut: false,
        });
      }
    }
    list = list.map((item) => {
      const barcodes = lineBarcodesForActive(item);
      if (barcodes.some((code) => returned.has(code))) {
        return { ...item, replacedOut: true };
      }
      return item;
    });
    list.push(...replacementLines);
  }

  return list.filter((item) => !item.replacedOut);
};

export const activeBillItemCount = (items: any[] | undefined, returns?: any[]) =>
  activeBillItems(items, returns).reduce((sum, item) => sum + Math.max(1, Number(item.quantity || 1)), 0);

const lineBarcodes = (item: any): string[] => {
  if (Array.isArray(item.barcodes) && item.barcodes.length > 0) {
    return item.barcodes.map((b: string) => String(b || "").trim()).filter(Boolean);
  }
  const single = String(item.barcode || "").trim();
  return single ? [single] : [];
};

/** One API row per physical barcode when processing a return. */
export const expandSelectedToReturnedItems = (items: Array<{ reason?: string } & Record<string, any>>) =>
  items.flatMap((item) => {
    const qty = Math.max(1, Number(item.quantity || 1));
    const codes = lineBarcodes(item).slice(0, qty);
    const unitPrice =
      Number(item.sellingPrice || 0) > 0
        ? Number(item.sellingPrice)
        : Number(item.lineTotal || 0) / qty || Number(item.mrp || 0);
    const reason = item.reason || "Other";

    if (codes.length === 0) {
      const barcode = String(item.barcode || "").trim();
      if (!barcode) return [];
      return [
        {
          product: item.product,
          barcode,
          name: item.name,
          size: item.size,
          quantity: 1,
          sellingPrice: unitPrice,
          reason,
        },
      ];
    }

    return codes.map((barcode) => ({
      product: item.product,
      barcode,
      name: item.name,
      size: item.size,
      quantity: 1,
      sellingPrice: unitPrice,
      reason,
    }));
  });
