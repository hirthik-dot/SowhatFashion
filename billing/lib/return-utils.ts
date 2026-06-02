/** Bill lines still eligible for return (excludes swapped-out originals and replacement lines). */
export const returnableBillItems = (items: any[] | undefined) =>
  (items || []).filter((item) => !item.replacedOut && !item.isReplacement);

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
