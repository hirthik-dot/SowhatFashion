"use client";

import { useEffect, useMemo, useState } from "react";
import { billingApi, searchProducts } from "@/lib/api";

type DiscountType = "percent" | "amount" | "none";
type PaymentMethod = "cash" | "gpay" | "upi" | "card" | "partial";

type BillItem = {
  product?: string;
  productId?: string;
  barcode: string;
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

const normalizeItem = (item: any): BillItem => ({
  product: String(item.product || item.productId || ""),
  productId: String(item.productId || item.product || ""),
  barcode: String(item.barcode || ""),
  name: String(item.name || "Item"),
  category: String(item.category || ""),
  size: String(item.size || ""),
  mrp: Number(item.mrp || item.price || 0),
  quantity: Math.max(1, Number(item.quantity || 1)),
  itemDiscountType: (item.itemDiscountType || "none") as DiscountType,
  itemDiscountValue: Number(item.itemDiscountValue || 0),
  lineTotal: Number(item.lineTotal || 0),
});

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
  const taxableAmount = Math.max(0, afterItemDiscount - Math.max(0, billDiscountAmount));
  const gstAmount = taxableAmount * 0.05;
  const totalAmount = Math.round(taxableAmount + gstAmount);
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
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !bill) return;
    setCustomerName(bill.customer?.name || "");
    setCustomerPhone(bill.customer?.phone || "");
    setSalesmanId(String(bill.salesman?._id || bill.salesman || ""));
    setPaymentMethod((bill.paymentMethod || "cash") as PaymentMethod);
    setSplitCash(
      Number(
        (bill.paymentBreakdown || [])
          .filter((entry: any) => String(entry?.method || "") === "cash")
          .reduce((sum: number, entry: any) => sum + Number(entry?.amount || 0), 0)
      )
    );
    setSplitGpay(
      Number(
        (bill.paymentBreakdown || [])
          .filter((entry: any) => String(entry?.method || "") === "gpay")
          .reduce((sum: number, entry: any) => sum + Number(entry?.amount || 0), 0)
      )
    );
    setItems((bill.items || []).map((item: any) => normalizeItem(item)));
    setBillDiscountType((bill.billDiscountType || "none") as DiscountType);
    setBillDiscountValue(Number(bill.billDiscountValue || 0));
    setCashReceived(Number(bill.cashReceived || 0));
    setEditReason(REASON_OPTIONS[2]);
    setCustomReason("");
    setScanInput("");
    setSearchInput("");
    setSearchResults([]);
    setError("");
  }, [open, bill]);

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
        items: items.map((item) => ({
          product: item.product || item.productId,
          productId: item.productId || item.product,
          barcode: item.barcode,
          name: item.name,
          category: item.category,
          size: item.size,
          mrp: Number(item.mrp || 0),
          quantity: 1,
          itemDiscountType: item.itemDiscountType,
          itemDiscountValue: Number(item.itemDiscountValue || 0),
        })),
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
                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto_auto] gap-2 items-center">
                  <div>
                    <div className="font-medium">
                      {item.name} ({item.size || "-"})
                    </div>
                    <div className="text-xs text-[var(--text-secondary)]">{item.barcode}</div>
                  </div>
                  <div>₹{Number(item.mrp || 0).toLocaleString("en-IN")}</div>
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
                  </span>
                  <span className="text-sm text-[var(--text-secondary)]">₹{Number(result.price || result.mrp || 0)}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[auto_1fr_auto_auto] gap-2 items-center">
          <div className="font-medium">Bill Discount</div>
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
          <button className="h-11 px-4 rounded bg-[var(--gold)] text-black font-semibold" disabled={saving} onClick={onSave}>
            {saving ? "SAVING..." : "SAVE CHANGES & REPRINT"}
          </button>
        </div>
      </div>
    </div>
  );
}
