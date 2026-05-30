"use client";

import { useMemo, useRef, useState } from "react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import BillingShell from "@/components/layout/BillingShell";
import BarcodeScanner from "@/components/billing/BarcodeScanner";
import { billingApi } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import ReplacementReceipt, { type ReturnDocument } from "@/components/returns/ReplacementReceipt";
import { useRole } from "@/hooks/useRole";

export default function ReturnsPage() {
  const router = useRouter();
  const { can } = useRole();
  const canAccess = can("canReturn");
  const [step, setStep] = useState(1);
  const [billNumber, setBillNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [soldBarcode, setSoldBarcode] = useState("");
  const [bill, setBill] = useState<any>(null);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [reasons, setReasons] = useState<Record<number, string>>({});
  const [returnType, setReturnType] = useState<"replacement" | "partial">("replacement");
  const [replacementItems, setReplacementItems] = useState<any[]>([]);
  const [toast, setToast] = useState("");
  const [result, setResult] = useState<any>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<ReturnDocument | null>(null);
  const [flashError, setFlashError] = useState(false);
  const scannerRef = useRef<HTMLInputElement>(null);
  const user = useAuthStore((s) => s.user);

  const playSuccess = () => new Audio("/sounds/beep.mp3").play().catch(() => undefined);
  const playError = () => new Audio("/sounds/error.mp3").play().catch(() => undefined);

  useEffect(() => {
    if (!canAccess) router.push("/billing");
  }, [canAccess, router]);

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

  const replacementBarcodes = useMemo(
    () => replacementItems.map((item) => item.barcode).filter(Boolean),
    [replacementItems]
  );

  const returnedTotal = useMemo(
    () =>
      selectedItems.reduce(
        (sum: number, item: any) =>
          sum + Number(item.sellingPrice || item.lineTotal / item.quantity || item.mrp || 0) * Number(item.quantity || 1),
        0
      ),
    [selectedItems]
  );

  const replacementTotal = useMemo(
    () => replacementItems.reduce((sum, item) => sum + Number(item.sellingPrice || 0) * Number(item.quantity || 1), 0),
    [replacementItems]
  );

  const priceDifference = replacementTotal - returnedTotal;

  useEffect(() => {
    if (step === 3) scannerRef.current?.focus();
  }, [step]);

  const addReplacementItem = async (product: any) => {
    const barcode = String(product.barcode || "").trim();
    if (!barcode) throw new Error("No barcode available for this item");
    if (replacementBarcodes.includes(barcode)) {
      throw new Error("This barcode is already in the replacement list");
    }
    setError("");
    setReplacementItems((prev) => [
      ...prev,
      {
        product: product._id || product.productId,
        barcode,
        name: product.name,
        size: product.size,
        quantity: 1,
        sellingPrice: product.mrp,
      },
    ]);
  };

  const updateReplacementQuantity = (index: number, delta: number) => {
    setReplacementItems((prev) =>
      prev
        .map((item, i) => (i === index ? { ...item, quantity: Math.max(1, Number(item.quantity || 1) + delta) } : item))
        .filter((item) => item.quantity > 0)
    );
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

  if (!canAccess) return null;

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
      {step === 3 ? (
        <div className="space-y-3 pb-20 md:pb-0">
          {toast ? <div className="pos-card p-2 text-sm">{toast}</div> : null}
          {error ? <div className="pos-card p-2 text-sm text-[var(--error)]">{error}</div> : null}
          <BarcodeScanner
            inputRef={scannerRef}
            flashError={flashError}
            usedBarcodes={replacementBarcodes}
            onScanBarcode={(barcode) => billingApi.scanBarcode(barcode)}
            onAdd={async (product) => {
              try {
                await addReplacementItem(product);
              } catch (err: any) {
                playError();
                setFlashError(true);
                setTimeout(() => setFlashError(false), 350);
                throw err;
              }
            }}
            onToast={setToast}
            playSuccess={playSuccess}
            playError={playError}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            <div className="pos-card p-3 xl:col-span-2">
              <h2 className="font-semibold mb-3">Replacement Items</h2>
              <div className="space-y-2">
                {replacementItems.length === 0 ? (
                  <p className="text-sm text-[var(--text-secondary)]">No replacement items scanned yet.</p>
                ) : (
                  replacementItems.map((item, index) => {
                    const qty = Number(item.quantity || 1);
                    const price = Number(item.sellingPrice || 0);
                    const total = price * qty;
                    return (
                      <div key={`${item.barcode}-${index}`} className="grid grid-cols-2 md:grid-cols-12 gap-2 items-center bg-[var(--surface-2)] rounded p-2 text-sm">
                        <div className="col-span-2 md:col-span-1 text-[var(--text-secondary)] md:text-inherit">#{index + 1}</div>
                        <div className="col-span-2 md:col-span-4">
                          {item.name} {item.size ? `(${item.size})` : ""}
                          <div className="text-xs text-[var(--text-secondary)] truncate">{item.barcode}</div>
                        </div>
                        <div className="col-span-1 md:col-span-2">₹{price.toFixed(2)}</div>
                        <div className="col-span-1 md:col-span-2 flex items-center gap-1">
                          <button type="button" className="h-9 w-9 rounded border border-[var(--border)]" onClick={() => updateReplacementQuantity(index, -1)}>-</button>
                          <span className="w-8 text-center">{qty}</span>
                          <button type="button" className="h-9 w-9 rounded border border-[var(--border)]" onClick={() => updateReplacementQuantity(index, 1)}>+</button>
                        </div>
                        <div className="col-span-1 md:col-span-2 font-semibold">₹{total.toFixed(2)}</div>
                        <button
                          className="col-span-1 md:col-span-1 text-[var(--error)] justify-self-end md:justify-self-start"
                          onClick={() => setReplacementItems((prev) => prev.filter((_, i) => i !== index))}
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
            <div className="pos-card p-3 space-y-2">
              <h2 className="font-semibold">Return Summary</h2>
              <div className="text-sm space-y-1">
                <div className="flex justify-between"><span>Bill</span><span>{bill?.billNumber || "-"}</span></div>
                <div className="flex justify-between"><span>Customer</span><span>{bill?.customer?.name || "-"}</span></div>
                <div className="flex justify-between"><span>Type</span><span className="capitalize">{returnType}</span></div>
              </div>
              <div className="border-t border-[var(--border)] pt-2 text-sm space-y-1">
                <p className="text-[var(--text-secondary)]">RETURNED ITEMS</p>
                {selectedItems.map((item: any, index: number) => (
                  <div key={`${item.barcode}-${index}`} className="flex justify-between gap-2">
                    <span className="truncate">{item.name} ({item.size || "-"}) x{item.quantity || 1}</span>
                    <span className="shrink-0">
                      ₹{(Number(item.sellingPrice || item.lineTotal / item.quantity || item.mrp || 0) * Number(item.quantity || 1)).toFixed(2)}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between font-medium border-t border-[var(--border)] pt-1 mt-1">
                  <span>Returned Value</span><span>₹{returnedTotal.toFixed(2)}</span>
                </div>
              </div>
              <div className="border-t border-[var(--border)] pt-2 text-sm space-y-1">
                <div className="flex justify-between"><span>Replacement Value</span><span>₹{replacementTotal.toFixed(2)}</span></div>
                <div className="flex justify-between font-medium">
                  <span>Price Difference</span>
                  <span className={priceDifference > 0 ? "text-[var(--gold)]" : priceDifference < 0 ? "text-[var(--success)]" : ""}>
                    {priceDifference > 0 ? "+" : ""}₹{priceDifference.toFixed(2)}
                  </span>
                </div>
                {priceDifference > 0 ? (
                  <p className="text-xs text-[var(--text-secondary)]">Customer pays the difference</p>
                ) : priceDifference < 0 ? (
                  <p className="text-xs text-[var(--text-secondary)]">Refund due to customer</p>
                ) : (
                  <p className="text-xs text-[var(--text-secondary)]">Even exchange — no payment due</p>
                )}
              </div>
              <div className="flex justify-between text-2xl font-bold text-[var(--gold)] border-t border-[var(--border)] pt-2">
                <span>DIFFERENCE</span>
                <span>{priceDifference > 0 ? "+" : ""}₹{priceDifference.toFixed(2)}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button className="h-11 rounded border border-[var(--border)]" onClick={() => setStep(2)}>BACK</button>
                <button className="h-11 rounded border border-[var(--border)]" onClick={() => setReplacementItems([])}>CLEAR</button>
                <button
                  className="h-11 rounded bg-[var(--gold)] text-black font-semibold disabled:opacity-50"
                  disabled={replacementItems.length === 0}
                  onClick={processReturn}
                >
                  PROCESS RETURN
                </button>
              </div>
              {result ? <p className="text-[var(--success)] text-sm">Replacement processed: {result.returnNumber}</p> : null}
            </div>
          </div>
          <button
            className="md:hidden fixed bottom-3 left-3 right-3 h-12 rounded bg-[var(--gold)] text-black font-semibold disabled:opacity-50"
            disabled={replacementItems.length === 0}
            onClick={processReturn}
          >
            PROCESS RETURN
          </button>
        </div>
      ) : (
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
      </div>
      )}
    </BillingShell>
  );
}
