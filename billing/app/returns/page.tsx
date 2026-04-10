"use client";

import { useMemo, useState } from "react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import BillingShell from "@/components/layout/BillingShell";
import { billingApi } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import ReplacementReceipt, { type ReturnDocument } from "@/components/returns/ReplacementReceipt";
import { useRole } from "@/hooks/useRole";

export default function ReturnsPage() {
  const router = useRouter();
  const { isAdmin } = useRole();
  const [step, setStep] = useState(1);
  const [billNumber, setBillNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [soldBarcode, setSoldBarcode] = useState("");
  const [bill, setBill] = useState<any>(null);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [reasons, setReasons] = useState<Record<number, string>>({});
  const [returnType, setReturnType] = useState<"replacement" | "partial">("replacement");
  const [replacementBarcode, setReplacementBarcode] = useState("");
  const [replacementItems, setReplacementItems] = useState<any[]>([]);
  const [result, setResult] = useState<any>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<ReturnDocument | null>(null);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!isAdmin) router.push("/billing");
  }, [isAdmin, router]);

  const selectedItems = useMemo(
    () =>
      (bill?.items || [])
        .map((item: any, index: number) => ({ item, index }))
        .filter(({ index }: any) => selected[index])
        .map(({ item, index }: any) => ({ ...item, reason: reasons[index] || "Other" })),
    [bill, selected, reasons]
  );

  const findBill = async () => {
    setError("");
    try {
      if (soldBarcode.trim()) {
        const value = await billingApi.returnScan(soldBarcode.trim());
        setBill(value);
        setStep(2);
        return;
      }
      if (billNumber.trim()) {
        const value = await billingApi.billByNumber(billNumber.trim());
        setBill(value);
        setStep(2);
        return;
      }
      if (phone.trim()) {
        const values = await billingApi.bills(`customerPhone=${encodeURIComponent(phone.trim())}&limit=1`);
        if (values.data?.[0]) {
          setBill(values.data[0]);
          setStep(2);
          return;
        }
        setError("No bill found for this phone number");
        return;
      }
      setError("Enter sold item barcode, bill number, or phone number");
    } catch (err: any) {
      setError(err.message || "Unable to find bill");
    }
  };

  const scanReplacement = async () => {
    const barcode = replacementBarcode.trim();
    if (!barcode) {
      setError("Enter a replacement barcode");
      return;
    }

    setError("");
    try {
      const item = await billingApi.scanBarcode(barcode);
      setReplacementItems((prev) => [
        ...prev,
        { product: item._id, barcode: item.barcode, name: item.name, size: item.size, quantity: 1, sellingPrice: item.mrp },
      ]);
      setReplacementBarcode("");
    } catch (err: any) {
      setError(err?.message || "Unable to scan replacement item");
    }
  };

  const processReturn = async () => {
    setError("");
    try {
      const returnedItems = selectedItems.map((item: any) => ({
        product: item.product,
        barcode: item.barcode,
        name: item.name,
        size: item.size,
        quantity: item.quantity,
        sellingPrice: item.sellingPrice || item.lineTotal / item.quantity || item.mrp,
        reason: item.reason,
      }));
      if (replacementItems.length === 0) {
        setError("Scan at least one replacement item");
        return;
      }
      const response = await billingApi.returns({
        billId: bill._id,
        returnType,
        returnedItems,
        replacementItems,
      });
      setResult(response);
      setReceiptData({
        ...(response || {}),
        billNumber: response?.billNumber || bill?.billNumber,
        customer: response?.customer || bill?.customer,
        processedByName: user?.name || response?.processedByName || "-",
      });
      setReceiptOpen(true);
    } catch (err: any) {
      setError(err?.message || "Return processing failed");
    }
  };

  if (!isAdmin) return null;

  return (
    <BillingShell title="Returns">
      {receiptOpen && receiptData ? (
        <ReplacementReceipt
          returnData={receiptData}
          onClose={() => {
            setReceiptOpen(false);
          }}
        />
      ) : null}
      <div className="pos-card p-4 space-y-3">
        <h2 className="font-semibold">Return / Replacement</h2>
        {step === 1 ? (
          <div className="space-y-2">
            <div className="flex gap-2">
              <input className="pos-input flex-1" placeholder="Scan sold item barcode (SW...)" value={soldBarcode} onChange={(e) => setSoldBarcode(e.target.value)} onKeyDown={(e) => e.key === "Enter" && findBill()} />
              <button className="h-11 px-3 rounded bg-[var(--gold)] text-black" onClick={findBill}>SCAN FIND</button>
            </div>
            <p className="text-xs text-[var(--text-secondary)]">Tip: You can find return bill directly by scanning sold product barcode.</p>
            <div className="flex gap-2">
              <input className="pos-input flex-1" placeholder="Bill number (SW-2025-0001)" value={billNumber} onChange={(e) => setBillNumber(e.target.value)} />
              <button className="h-11 px-3 rounded bg-[var(--gold)] text-black" onClick={findBill}>FIND</button>
            </div>
            <div className="flex gap-2">
              <input className="pos-input flex-1" placeholder="Customer phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
              <button className="h-11 px-3 rounded border border-[var(--border)]" onClick={findBill}>SEARCH</button>
            </div>
            {error ? <p className="text-sm text-[var(--error)]">{error}</p> : null}
          </div>
        ) : null}
        {step === 2 && bill ? (
          <div className="space-y-2">
            <p className="text-sm text-[var(--text-secondary)]">Bill: {bill.billNumber} · Customer: {bill.customer?.name} · Total: ₹{bill.totalAmount}</p>
            {(bill.items || []).map((item: any, index: number) => (
              <div key={`${item.barcode}-${index}`} className="bg-[var(--surface-2)] rounded p-2 flex items-center justify-between gap-2">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={Boolean(selected[index])} onChange={(e) => setSelected((prev) => ({ ...prev, [index]: e.target.checked }))} />
                  <span>{item.name} ({item.size || "-"})</span>
                </label>
                <select className="pos-input h-9 min-h-0" value={reasons[index] || "Size Issue"} onChange={(e) => setReasons((prev) => ({ ...prev, [index]: e.target.value }))}>
                  <option>Size Issue</option><option>Color Issue</option><option>Defective</option><option>Changed Mind</option><option>Wrong Item</option><option>Other</option>
                </select>
              </div>
            ))}
            <div className="flex gap-4">
              {["replacement", "partial"].map((type) => (
                <label key={type} className="flex items-center gap-2">
                  <input type="radio" checked={returnType === type} onChange={() => setReturnType(type as any)} />
                  <span className="capitalize">{type}</span>
                </label>
              ))}
            </div>
            <button className="h-11 px-3 rounded bg-[var(--gold)] text-black" onClick={() => setStep(3)}>NEXT</button>
          </div>
        ) : null}
        {step === 3 ? (
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                className="pos-input flex-1"
                placeholder="Scan replacement item barcode"
                value={replacementBarcode}
                onChange={(e) => setReplacementBarcode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && scanReplacement()}
              />
              <button className="h-11 px-3 rounded border border-[var(--border)]" onClick={scanReplacement}>
                Scan
              </button>
            </div>
            <div className="pos-card p-3">
              <p className="font-semibold mb-2">Replacement Items</p>
              {replacementItems.length === 0 ? (
                <p className="text-sm text-[var(--text-secondary)]">No replacement items scanned yet.</p>
              ) : (
                <div className="space-y-1 text-sm">
                  {replacementItems.map((item, index) => (
                    <div key={`${item.barcode}-${index}`} className="flex justify-between">
                      <span>{item.name} ({item.size || "-"})</span>
                      <span>{item.barcode}</span>
                      <button className="text-[var(--error)]" onClick={() => setReplacementItems((prev) => prev.filter((_, i) => i !== index))}>✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button className="h-11 px-3 rounded bg-[var(--gold)] text-black" onClick={processReturn}>PROCESS RETURN</button>
            {result ? <p className="text-[var(--success)]">Replacement processed: {result.returnNumber}</p> : null}
            {error ? <p className="text-sm text-[var(--error)]">{error}</p> : null}
          </div>
        ) : null}
      </div>
    </BillingShell>
  );
}
