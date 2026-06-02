"use client";

import { useEffect, useMemo, useState } from "react";
import { billingApi, searchProducts } from "@/lib/api";

type DiscountType = "percent" | "amount" | "none";
type PaymentMethod = "cash" | "gpay" | "upi" | "card" | "partial";

type BillItem = {
  product?: string;
  productId?: string;
  barcode: string;
  barcodes?: string[];
  name: string;
  category?: string;
  size?: string;
  mrp: number;
  quantity: number;
  itemDiscountType: DiscountType;
  itemDiscountValue: number;
  lineTotal?: number;
};

const REASON_OPTIONS = [
  "Wrong item scanned",
  "Price correction",
  "Customer request",
  "Discount adjustment",
  "Other",
];

const deriveItemDiscount = (
  item: any
): { itemDiscountType: DiscountType; itemDiscountValue: number } => {
  const mrp = Number(item.mrp || item.price || 0);
  let itemDiscountType = (item.itemDiscountType || "none") as DiscountType;
  let itemDiscountValue = Number(item.itemDiscountValue ?? 0);
  const amountPerUnit = Number(item.itemDiscountAmount || 0);

  if (itemDiscountType === "none" && itemDiscountValue <= 0 && amountPerUnit > 0 && mrp > 0) {
    const asPercent = (amountPerUnit / mrp) * 100;
    const roundedPercent = Math.round(asPercent * 100) / 100;
    if (Math.abs(roundedPercent - Math.round(roundedPercent)) < 0.01) {
      return { itemDiscountType: "percent", itemDiscountValue: Math.round(roundedPercent) };
    }
    return { itemDiscountType: "amount", itemDiscountValue: amountPerUnit };
  }

  if (itemDiscountValue <= 0 && amountPerUnit > 0) {
    if (itemDiscountType === "percent" && mrp > 0) {
      itemDiscountValue = Math.round((amountPerUnit / mrp) * 100);
    } else if (itemDiscountType === "amount") {
      itemDiscountValue = amountPerUnit;
    }
  }

  return { itemDiscountType, itemDiscountValue };
};

const deriveBillDiscount = (bill: any): { billDiscountType: DiscountType; billDiscountValue: number } => {
  let billDiscountType = (bill.billDiscountType || "none") as DiscountType;
  let billDiscountValue = Number(bill.billDiscountValue || 0);
  const billDiscountAmount = Number(bill.billDiscountAmount || 0);

  if (billDiscountAmount <= 0) {
    return { billDiscountType, billDiscountValue };
  }

  if (billDiscountType === "none" || billDiscountValue <= 0) {
    const subtotal = Number(bill.subtotal || 0);
    const totalItemDiscount = Number(bill.totalItemDiscount || 0);
    const afterItemDiscount = Math.max(0, subtotal - totalItemDiscount);

    if (billDiscountType === "percent" && afterItemDiscount > 0) {
      billDiscountValue = Math.round((billDiscountAmount / afterItemDiscount) * 100);
    } else if (afterItemDiscount > 0) {
      const asPercent = (billDiscountAmount / afterItemDiscount) * 100;
      const roundedPercent = Math.round(asPercent * 100) / 100;
      if (Math.abs(roundedPercent - Math.round(roundedPercent)) < 0.01) {
        billDiscountType = "percent";
        billDiscountValue = Math.round(roundedPercent);
      } else {
        billDiscountType = "amount";
        billDiscountValue = billDiscountAmount;
      }
    } else {
      billDiscountType = "amount";
      billDiscountValue = billDiscountAmount;
    }
  }

  return { billDiscountType, billDiscountValue };
};

const deriveCashReceived = (bill: any): number => {
  const stored = Number(bill.cashReceived || 0);
  if (stored > 0) return stored;

  const totalAmount = Number(bill.totalAmount || 0);
  const changeReturned = Number(bill.changeReturned || 0);
  const paymentMethod = String(bill.paymentMethod || "cash");

  if (paymentMethod === "cash") {
    return totalAmount + changeReturned;
  }

  if (paymentMethod === "partial") {
    const cashPortion = (bill.paymentBreakdown || [])
      .filter((entry: any) => String(entry?.method || "") === "cash")
      .reduce((sum: number, entry: any) => sum + Number(entry?.amount || 0), 0);
    if (cashPortion > 0) return cashPortion + changeReturned;
  }

  return stored;
};

const normalizeItem = (item: any): BillItem => {
  const barcodes =
    Array.isArray(item.barcodes) && item.barcodes.length > 0
      ? item.barcodes.map((code: string) => String(code).trim()).filter(Boolean)
      : [];
  const quantity = Math.max(1, Number(item.quantity || barcodes.length || 1));
  const { itemDiscountType, itemDiscountValue } = deriveItemDiscount(item);

  const unitBarcodes =
    barcodes.length > 0
      ? barcodes.slice(0, quantity)
      : [String(item.barcode || "").trim()].filter(Boolean);

  return {
    product: String(item.product || item.productId || ""),
    productId: String(item.productId || item.product || ""),
    barcode: String(item.barcode || unitBarcodes[0] || ""),
    barcodes: unitBarcodes,
    name: String(item.name || "Item"),
    category: String(item.category || ""),
    size: String(item.size || ""),
    mrp: Number(item.mrp || item.price || 0),
    quantity,
    itemDiscountType,
    itemDiscountValue,
    lineTotal: Number(item.lineTotal || 0),
  };
};

const computeTotals = (items: BillItem[], billDiscountType: DiscountType, billDiscountValue: number) => {
  const subtotal = items.reduce((sum, item) => sum + item.mrp * item.quantity, 0);
  const totalItemDiscount = items.reduce((sum, item) => {
    if (item.itemDiscountType === "percent") {
      return sum + (item.mrp * item.itemDiscountValue * item.quantity) / 100;
    }
    if (item.itemDiscountType === "amount") {
      return sum + item.itemDiscountValue * item.quantity;
    }
    return sum;
  }, 0);
  const afterItemDiscount = Math.max(0, subtotal - totalItemDiscount);
  const billDiscountAmount =
    billDiscountType === "percent"
      ? (afterItemDiscount * Number(billDiscountValue || 0)) / 100
      : billDiscountType === "amount"
      ? Number(billDiscountValue || 0)
      : 0;
  const grossWithGst = Math.max(0, subtotal) * 1.05;
  const totalAmount = Math.round(Math.max(0, grossWithGst - totalItemDiscount - Math.max(0, billDiscountAmount)));
  return { totalAmount };
};

export default function EditBillModal({
  open,
  bill,
  salesmen,
  onClose,
  onSaved,
}: {
  open: boolean;
  bill: any;
  salesmen: any[];
  onClose: () => void;
  onSaved: (updated: any) => void;
}) {
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [salesmanId, setSalesmanId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [splitCash, setSplitCash] = useState(0);
  const [splitGpay, setSplitGpay] = useState(0);
  const [items, setItems] = useState<BillItem[]>([]);
  const [billDiscountType, setBillDiscountType] = useState<DiscountType>("none");
  const [billDiscountValue, setBillDiscountValue] = useState(0);
  const [cashReceived, setCashReceived] = useState(0);
  const [editReason, setEditReason] = useState(REASON_OPTIONS[2]);
  const [customReason, setCustomReason] = useState("");
  const [scanInput, setScanInput] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const applyBillToForm = (source: any) => {
    const billDiscount = deriveBillDiscount(source);
    setCustomerName(source.customer?.name || "");
    setCustomerPhone(source.customer?.phone || "");
    setSalesmanId(String(source.salesman?._id || source.salesman || ""));
    setPaymentMethod((source.paymentMethod || "cash") as PaymentMethod);
    setSplitCash(
      Number(
        (source.paymentBreakdown || [])
          .filter((entry: any) => String(entry?.method || "") === "cash")
          .reduce((sum: number, entry: any) => sum + Number(entry?.amount || 0), 0)
      )
    );
    setSplitGpay(
      Number(
        (source.paymentBreakdown || [])
          .filter((entry: any) => String(entry?.method || "") === "gpay")
          .reduce((sum: number, entry: any) => sum + Number(entry?.amount || 0), 0)
      )
    );
    setItems((source.items || []).map((item: any) => normalizeItem(item)));
    setBillDiscountType(billDiscount.billDiscountType);
    setBillDiscountValue(billDiscount.billDiscountValue);
    setCashReceived(deriveCashReceived(source));
    setEditReason(REASON_OPTIONS[2]);
    setCustomReason("");
    setScanInput("");
    setSearchInput("");
    setSearchResults([]);
    setError("");
  };

  useEffect(() => {
    if (!open || !bill?._id) return;
    applyBillToForm(bill);

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const fullBill = await billingApi.billById(String(bill._id));
        if (!cancelled) applyBillToForm(fullBill);
      } catch {
        // Keep values from list row if full fetch fails
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load().catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [open, bill?._id]);

  const totals = useMemo(
    () => computeTotals(items, billDiscountType, billDiscountValue),
    [items, billDiscountType, billDiscountValue]
  );

  const addFoundItem = (product: any) => {
    if (!product?.barcode) return;
    const barcode = String(product.barcode).trim();
    if (items.some((item) => item.barcode === barcode)) {
      setError(`Barcode already added: ${barcode}`);
      return;
    }
    const next: BillItem = normalizeItem({
      product: product.productId || product._id,
      productId: product.productId || product._id,
      barcode,
      barcodes: [barcode],
      name: product.name,
      category: product.category,
      size: product.size,
      mrp: Number(product.mrp || product.price || 0),
      quantity: 1,
      itemDiscountType: "none",
      itemDiscountValue: 0,
    });
    setItems((prev) => [...prev, next]);
    setError("");
  };

  const scanAndAdd = async () => {
    const code = scanInput.trim();
    if (!code) return;
    try {
      const found = await billingApi.scanBarcode(code);
      addFoundItem(found);
      setScanInput("");
    } catch (e: any) {
      setError(e.message || "Unable to scan item");
    }
  };

  const doSearch = async () => {
    const q = searchInput.trim();
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      const rows = await searchProducts(q);
      setSearchResults(Array.isArray(rows) ? rows : []);
    } catch {
      setSearchResults([]);
    }
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateItemDiscount = (index: number, field: "itemDiscountType" | "itemDiscountValue", value: string | number) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        if (field === "itemDiscountType") {
          return { ...item, itemDiscountType: value as DiscountType };
        }
        return { ...item, itemDiscountValue: Math.max(0, Number(value || 0)) };
      })
    );
  };

  const updateItemQuantity = (index: number, value: number) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const quantity = Math.max(1, Number(value || 1));
        const codes =
          item.barcodes && item.barcodes.length > 0
            ? item.barcodes.slice(0, quantity)
            : item.barcode
            ? [item.barcode]
            : [];
        return {
          ...item,
          quantity,
          barcodes: codes,
          barcode: codes[0] || item.barcode,
        };
      })
    );
  };

  const onSave = async () => {
    if (!bill?._id) return;
    if (!customerName.trim()) return setError("Customer name is required");
    if (!salesmanId) return setError("Salesman is required");
    if (items.length === 0) return setError("At least one bill item is required");
    if (paymentMethod === "partial" && Math.round(splitCash + splitGpay) !== totals.totalAmount) {
      return setError("Split payment must equal new total");
    }
    const reasonText = editReason === "Other" ? customReason.trim() : editReason;
    if (!reasonText) return setError("Edit reason is required");

    setSaving(true);
    setError("");
    try {
      const updated = await billingApi.editBill(bill._id, {
        customer: { name: customerName.trim(), phone: customerPhone.trim() },
        salesmanId,
        paymentMethod,
        paymentBreakdown:
          paymentMethod === "partial"
            ? [
                ...(Number(splitCash || 0) > 0 ? [{ method: "cash", amount: Number(splitCash || 0) }] : []),
                ...(Number(splitGpay || 0) > 0 ? [{ method: "gpay", amount: Number(splitGpay || 0) }] : []),
              ]
            : [],
        items: items.map((item) => {
          const quantity = Math.max(1, Number(item.quantity || 1));
          const barcodes =
            item.barcodes && item.barcodes.length > 0
              ? item.barcodes.slice(0, quantity)
              : item.barcode
              ? [item.barcode]
              : [];
          return {
            product: item.product || item.productId,
            productId: item.productId || item.product,
            barcode: barcodes[0] || item.barcode,
            barcodes,
            name: item.name,
            category: item.category,
            size: item.size,
            mrp: Number(item.mrp || 0),
            quantity,
            itemDiscountType: item.itemDiscountType,
            itemDiscountValue: Number(item.itemDiscountValue || 0),
          };
        }),
        billDiscountType,
        billDiscountValue: Number(billDiscountValue || 0),
        cashReceived: Number(cashReceived || 0),
        editReason: reasonText,
      });
      onSaved(updated);
    } catch (e: any) {
      setError(e.message || "Failed to save bill changes");
    } finally {
      setSaving(false);
    }
  };

  if (!open || !bill) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 grid place-items-center p-4">
      <div className="w-full max-w-5xl pos-card p-4 space-y-3 max-h-[92vh] overflow-auto">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
          <h3 className="font-semibold text-lg">EDIT BILL: {bill.billNumber}</h3>
          <button className="text-sm text-[var(--text-secondary)] hover:text-white" onClick={onClose}>
            Cancel
          </button>
        </div>

        <div className="text-sm text-[var(--warning)]">Editing will update inventory and reports.</div>
        {loading ? <div className="text-sm text-[var(--text-secondary)]">Loading bill details...</div> : null}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <input className="pos-input" placeholder="Customer name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
          <input className="pos-input" placeholder="Phone" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
          <select className="pos-input" value={salesmanId} onChange={(e) => setSalesmanId(e.target.value)}>
            <option value="">Select salesman</option>
            {salesmen.map((salesman) => (
              <option key={salesman._id} value={salesman._id}>
                {salesman.name}
              </option>
            ))}
          </select>
          <select className="pos-input" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}>
            <option value="cash">Cash</option>
            <option value="gpay">GPay</option>
            <option value="upi">UPI</option>
            <option value="card">Card</option>
            <option value="partial">Partial</option>
          </select>
        </div>

        {paymentMethod === "partial" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <input className="pos-input" type="number" value={splitCash} onChange={(e) => setSplitCash(Number(e.target.value || 0))} placeholder="Split cash" />
            <input className="pos-input" type="number" value={splitGpay} onChange={(e) => setSplitGpay(Number(e.target.value || 0))} placeholder="Split gpay" />
          </div>
        ) : null}

        <div className="border-y border-[var(--border)] py-3 space-y-2">
          <h4 className="font-semibold">ITEMS</h4>
          <div className="space-y-2">
            {items.map((item, index) => (
              <div key={`${item.barcode}-${index}`} className="bg-[var(--surface-2)] rounded p-2">
                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto_auto_auto] gap-2 items-center">
                  <div>
                    <div className="font-medium">
                      {item.name} ({item.size || "-"})
                    </div>
                    <div className="text-xs text-[var(--text-secondary)]">{item.barcode}</div>
                  </div>
                  <div>₹{Number(item.mrp || 0).toLocaleString("en-IN")}</div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-[var(--text-secondary)]">Qty</span>
                    <input
                      className="pos-input h-9 min-h-0 w-20"
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => updateItemQuantity(index, Number(e.target.value || 1))}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      className="pos-input h-9 min-h-0"
                      value={item.itemDiscountType}
                      onChange={(e) => updateItemDiscount(index, "itemDiscountType", e.target.value)}
                    >
                      <option value="none">No Discount</option>
                      <option value="percent">%</option>
                      <option value="amount">₹</option>
                    </select>
                    <input
                      className="pos-input h-9 min-h-0 w-24"
                      type="number"
                      value={item.itemDiscountValue}
                      onChange={(e) => updateItemDiscount(index, "itemDiscountValue", e.target.value)}
                    />
                  </div>
                  <button className="h-9 px-3 rounded border border-[var(--border)] text-[var(--error)]" onClick={() => removeItem(index)}>
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2">
            <div className="flex gap-2">
              <input
                className="pos-input flex-1"
                placeholder="Add item via barcode scan"
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && scanAndAdd()}
              />
              <button className="h-11 px-3 rounded border border-[var(--border)]" onClick={scanAndAdd}>
                Scan Add
              </button>
            </div>
            <div className="flex gap-2">
              <input
                className="pos-input flex-1"
                placeholder="Search by product name"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && doSearch()}
              />
              <button className="h-11 px-3 rounded border border-[var(--border)]" onClick={doSearch}>
                Search
              </button>
            </div>
          </div>

          {searchResults.length > 0 ? (
            <div className="bg-[var(--surface-2)] rounded p-2 max-h-48 overflow-auto space-y-1">
              {searchResults.map((result: any) => (
                <button
                  key={`${result.barcode}-${result.size}`}
                  className="w-full text-left flex items-center justify-between p-2 rounded hover:bg-black/20"
                  onClick={() => addFoundItem(result)}
                >
                  <span>
                    {result.name} ({result.size || "-"})
                    {result.supplier ? (
                      <span className="text-[var(--text-secondary)]"> · {result.supplier}</span>
                    ) : null}
                  </span>
                  <span className="text-sm text-[var(--text-secondary)]">₹{Number(result.price || result.mrp || 0)}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[auto_1fr_auto_auto] gap-2 items-center">
          <div className="font-medium">Customer Discount</div>
          <div className="flex gap-2">
            <select className="pos-input h-10 min-h-0" value={billDiscountType} onChange={(e) => setBillDiscountType(e.target.value as DiscountType)}>
              <option value="none">None</option>
              <option value="percent">%</option>
              <option value="amount">₹</option>
            </select>
            <input className="pos-input h-10 min-h-0" type="number" value={billDiscountValue} onChange={(e) => setBillDiscountValue(Number(e.target.value || 0))} />
          </div>
          <div>Cash Received</div>
          <input className="pos-input h-10 min-h-0" type="number" value={cashReceived} onChange={(e) => setCashReceived(Number(e.target.value || 0))} />
        </div>

        <div className="text-xl font-bold text-[var(--gold)]">NEW TOTAL: ₹{totals.totalAmount.toLocaleString("en-IN")}</div>

        <div className="space-y-2 border-t border-[var(--border)] pt-3">
          <label className="block text-sm font-medium">Edit Reason (required)</label>
          <select className="pos-input" value={editReason} onChange={(e) => setEditReason(e.target.value)}>
            {REASON_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {editReason === "Other" ? (
            <input
              className="pos-input"
              placeholder="Enter custom reason"
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
            />
          ) : null}
        </div>

        {error ? <div className="text-sm text-[var(--error)]">{error}</div> : null}

        <div className="flex justify-end gap-2">
          <button className="h-11 px-4 rounded border border-[var(--border)]" onClick={onClose}>
            CANCEL
          </button>
          <button className="h-11 px-4 rounded bg-[var(--gold)] text-black font-semibold" disabled={saving || loading} onClick={onSave}>
            {saving ? "SAVING..." : "SAVE CHANGES & REPRINT"}
          </button>
        </div>
      </div>
    </div>
  );
}
