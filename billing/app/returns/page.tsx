"use client";

import { useMemo, useRef, useState } from "react";
import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import BillingShell from "@/components/layout/BillingShell";
import BarcodeScanner from "@/components/billing/BarcodeScanner";
import BillItemRow from "@/components/billing/BillItemRow";
import { billingApi } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import ReplacementReceipt, { type ReturnDocument } from "@/components/returns/ReplacementReceipt";
import { useRole } from "@/hooks/useRole";
import type { BillItem, DiscountType } from "@/lib/bill-store";
import { expandSelectedToReturnedItems, returnableBillItems } from "@/lib/return-utils";
import { BILLING_GST_RATE, itemDiscountPerUnit, lineCustomerValueInclusive } from "@/lib/billing-totals";

const computeReplacementTotals = (
  items: BillItem[],
  billDiscountType: DiscountType,
  billDiscountValue: number
) => {
  const lines = items.map((item) => {
    const discountPerUnit = itemDiscountPerUnit(item.mrp, item.itemDiscountType, item.itemDiscountValue);
    const sellingPrice = Math.max(0, item.mrp - discountPerUnit);
    const lineTotal = sellingPrice * item.quantity;
    return { item, sellingPrice, lineTotal };
  });
  const subtotal = items.reduce((sum, item) => sum + item.mrp * item.quantity, 0);
  const totalItemDiscount = items.reduce(
    (sum, item) => sum + itemDiscountPerUnit(item.mrp, item.itemDiscountType, item.itemDiscountValue) * item.quantity,
    0
  );
  const afterItemDiscount = lines.reduce((sum, line) => sum + line.lineTotal, 0);
  const grossWithGst = afterItemDiscount * (1 + BILLING_GST_RATE);
  let billDiscountAmount = 0;
  if (billDiscountType === "percent") billDiscountAmount = (grossWithGst * billDiscountValue) / 100;
  else if (billDiscountType === "amount") billDiscountAmount = billDiscountValue;
  billDiscountAmount = Math.min(grossWithGst, Math.max(0, billDiscountAmount));
  const replacementTotal = grossWithGst - billDiscountAmount;
  const apiItems = lines.map(({ item, lineTotal }) => {
    const lineGross = lineTotal * (1 + BILLING_GST_RATE);
    const share = grossWithGst > 0 ? (lineGross / grossWithGst) * billDiscountAmount : 0;
    const netLineGross = Math.max(0, lineGross - share);
    const netLine = Number((netLineGross / (1 + BILLING_GST_RATE)).toFixed(2));
    const sellingPrice = netLine / Math.max(1, item.quantity);
    const discountPerUnit = itemDiscountPerUnit(item.mrp, item.itemDiscountType, item.itemDiscountValue);
    return {
      product: item.product,
      barcode: item.barcode,
      name: item.name,
      size: item.size,
      quantity: item.quantity,
      mrp: item.mrp,
      itemDiscountType: item.itemDiscountType,
      itemDiscountValue: item.itemDiscountValue,
      itemDiscountAmount: discountPerUnit,
      billDiscountShare: share,
      sellingPrice,
      lineTotal: netLine,
      netLineTotal: netLine,
    };
  });
  return { subtotal, totalItemDiscount, afterItemDiscount, billDiscountAmount, replacementTotal, apiItems };
};

export default function ReturnsPage() {
  const router = useRouter();
  const { can, maxDiscount, isSuperAdmin } = useRole();
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
  const [replacementItems, setReplacementItems] = useState<BillItem[]>([]);
  const [billDiscountType, setBillDiscountType] = useState<DiscountType>("none");
  const [billDiscountValue, setBillDiscountValue] = useState(0);
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

  const billItemsForReturn = useMemo(() => returnableBillItems(bill?.items), [bill?.items]);

  const selectedItems = useMemo(
    () =>
      billItemsForReturn
        .map((item: any, index: number) => ({ item, index }))
        .filter(({ index }: any) => selected[index])
        .map(({ item, index }: any) => ({ ...item, reason: reasons[index] || "Other" })),
    [billItemsForReturn, selected, reasons]
  );

  const findBill = async () => {
    setError("");
    try {
      if (soldBarcode.trim()) {
        const value = await billingApi.returnScan(soldBarcode.trim());
        const eligible = returnableBillItems(value.items);
        if (eligible.length === 0) {
          setError("No returnable items on this bill");
          return;
        }
        setBill({ ...value, items: eligible });
        setStep(2);
        return;
      }
      if (billNumber.trim()) {
        const value = await billingApi.billByNumber(billNumber.trim());
        const eligible = returnableBillItems(value.items);
        if (eligible.length === 0) {
          setError("No returnable items on this bill (all items already replaced)");
          return;
        }
        setBill({ ...value, items: eligible });
        setStep(2);
        return;
      }
      if (phone.trim()) {
        const values = await billingApi.bills(`customerPhone=${encodeURIComponent(phone.trim())}&limit=10`);
        const match =
          (values.data || []).find((row: any) => returnableBillItems(row.items).length > 0) || values.data?.[0];
        if (match) {
          const eligible = returnableBillItems(match.items);
          if (eligible.length === 0) {
            setError("No returnable items found for this customer (all items already replaced)");
            return;
          }
          setBill({ ...match, items: eligible });
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
    () => selectedItems.reduce((sum: number, item: any) => sum + lineCustomerValueInclusive(item), 0),
    [selectedItems]
  );

  const replacementTotals = useMemo(
    () => computeReplacementTotals(replacementItems, billDiscountType, billDiscountValue),
    [replacementItems, billDiscountType, billDiscountValue]
  );
  const replacementTotal = replacementTotals.replacementTotal;

  const priceDifference = replacementTotal - returnedTotal;

  const itemDiscountRows = useMemo(
    () =>
      replacementItems
        .map((item) => {
          const discountPerUnit = itemDiscountPerUnit(item.mrp, item.itemDiscountType, item.itemDiscountValue);
          return {
            name: item.name,
            label:
              item.itemDiscountType === "percent"
                ? `-${item.itemDiscountValue}%`
                : item.itemDiscountType === "amount"
                ? `-₹${item.itemDiscountValue}`
                : "-",
            amount: discountPerUnit * item.quantity,
          };
        })
        .filter((row) => row.amount > 0),
    [replacementItems]
  );

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
        barcodes: [barcode],
        name: product.name,
        size: product.size,
        mrp: Number(product.mrp || 0),
        quantity: 1,
        itemDiscountType: "none",
        itemDiscountValue: 0,
      },
    ]);
  };

  const updateReplacementItemDiscount = (
    index: number,
    updates: Partial<Pick<BillItem, "itemDiscountType" | "itemDiscountValue">>
  ) => {
    setReplacementItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        return {
          ...item,
          ...(updates.itemDiscountType !== undefined ? { itemDiscountType: updates.itemDiscountType } : {}),
          ...(updates.itemDiscountValue !== undefined
            ? { itemDiscountValue: Math.max(0, Number(updates.itemDiscountValue || 0)) }
            : {}),
        };
      })
    );
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
      const maxAllowedDiscount = isSuperAdmin ? 100 : maxDiscount;
      if (billDiscountType === "percent" && Number(billDiscountValue || 0) > maxAllowedDiscount) {
        setError(`Discount cannot exceed ${maxAllowedDiscount}%`);
        return;
      }
      const returnedItems = expandSelectedToReturnedItems(selectedItems);
      if (replacementItems.length === 0) {
        setError("Scan at least one replacement item");
        return;
      }
      const totals = computeReplacementTotals(replacementItems, billDiscountType, billDiscountValue);
      const response = await billingApi.returns({
        billId: bill._id,
        returnType,
        returnedItems,
        replacementItems: totals.apiItems,
        replacementSubtotal: totals.subtotal,
        replacementItemDiscount: totals.totalItemDiscount,
        replacementBillDiscount: totals.billDiscountAmount,
      });
      setResult(response);
      setReceiptData({
        ...(response || {}),
        billNumber: response?.billNumber || bill?.billNumber,
        customer: response?.customer || bill?.customer,
        processedByName: user?.name || response?.processedByName || "-",
        returnedTotal,
        replacementTotal: replacementTotal,
        priceDifference,
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
                  replacementItems.map((item, index) => (
                    <BillItemRow
                      key={`${item.barcode}-${index}`}
                      item={item}
                      index={index}
                      onDiscountType={(type) => updateReplacementItemDiscount(index, { itemDiscountType: type })}
                      onDiscountValue={(value) =>
                        updateReplacementItemDiscount(index, {
                          itemDiscountType: item.itemDiscountType === "none" ? "percent" : item.itemDiscountType,
                          itemDiscountValue: value,
                        })
                      }
                      onIncrement={() => updateReplacementQuantity(index, 1)}
                      onDecrement={() => updateReplacementQuantity(index, -1)}
                      onRemove={() => setReplacementItems((prev) => prev.filter((_, i) => i !== index))}
                    />
                  ))
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
                    <span className="shrink-0">₹{lineCustomerValueInclusive(item).toFixed(2)}</span>
                  </div>
                ))}
                <div className="flex justify-between font-medium border-t border-[var(--border)] pt-1 mt-1">
                  <span>Returned Value</span><span>₹{returnedTotal.toFixed(2)}</span>
                </div>
              </div>
              <div className="border-t border-[var(--border)] pt-2 text-sm space-y-1">
                <div className="flex justify-between"><span>Replacement Subtotal (MRP)</span><span>₹{replacementTotals.subtotal.toFixed(2)}</span></div>
                {itemDiscountRows.length > 0 ? (
                  <div className="mt-1">
                    <p className="text-[var(--text-secondary)]">ITEM DISCOUNTS</p>
                    {itemDiscountRows.map((row, index) => (
                      <div key={`${row.name}-${index}`} className="flex justify-between font-bold text-[var(--text-primary)]">
                        <span>{row.name} {row.label}</span>
                        <span>-₹{row.amount.toFixed(2)}</span>
                      </div>
                    ))}
                    {replacementTotals.totalItemDiscount > 0 ? (
                      <div className="flex justify-between border-t border-[var(--border)] mt-1 pt-1 font-bold text-[var(--text-primary)]">
                        <span>Total Item Disc</span><span>-₹{replacementTotals.totalItemDiscount.toFixed(2)}</span>
                      </div>
                    ) : null}
                  </div>
                ) : null}
                <div className="flex justify-between"><span>After Item Disc</span><span>₹{replacementTotals.afterItemDiscount.toFixed(2)}</span></div>
                <p className="text-[var(--text-secondary)] mt-2">CUSTOMER DISCOUNT</p>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    className="h-9 w-9 rounded border border-[var(--border)] disabled:opacity-50"
                    disabled={!can("canDiscount")}
                    onClick={() =>
                      setBillDiscountType((prev) => (prev === "percent" ? "amount" : "percent"))
                    }
                  >
                    {billDiscountType === "percent" ? "%" : "₹"}
                  </button>
                  <input
                    className={`pos-input h-9 min-h-0 flex-1 ${replacementTotals.billDiscountAmount > 0 ? "font-bold text-[var(--text-primary)]" : ""}`}
                    type="number"
                    inputMode="decimal"
                    max={isSuperAdmin ? 100 : maxDiscount}
                    disabled={!can("canDiscount")}
                    value={billDiscountValue || 0}
                    onChange={(e) => {
                      const value = Number(e.target.value || 0);
                      setBillDiscountValue(value);
                      if (billDiscountType === "none") setBillDiscountType("percent");
                    }}
                  />
                  <span className={replacementTotals.billDiscountAmount > 0 ? "font-bold text-[var(--text-primary)]" : ""}>
                    -₹{replacementTotals.billDiscountAmount.toFixed(2)}
                  </span>
                </div>
                {!isSuperAdmin && can("canDiscount") ? (
                  <p className="text-xs text-[var(--text-secondary)]">Max allowed discount: {maxDiscount}%</p>
                ) : null}
                <div className="flex justify-between font-medium border-t border-[var(--border)] pt-1 mt-1">
                  <span>Replacement Value</span><span>₹{replacementTotal.toFixed(2)}</span>
                </div>
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
                <button
                  className="h-11 rounded border border-[var(--border)]"
                  onClick={() => {
                    setReplacementItems([]);
                    setBillDiscountType("none");
                    setBillDiscountValue(0);
                  }}
                >
                  CLEAR
                </button>
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
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">Return / Replacement</h2>
          <Link href="/returns/history" className="text-sm underline text-[var(--gold)]">
            View returns history
          </Link>
        </div>
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
            {(billItemsForReturn || []).map((item: any, index: number) => (
              <div key={`${item.barcode}-${index}`} className="bg-[var(--surface-2)] rounded p-2 flex items-center justify-between gap-2">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={Boolean(selected[index])} onChange={(e) => setSelected((prev) => ({ ...prev, [index]: e.target.checked }))} />
                  <span>
                    {item.name} ({item.size || "-"})
                    {Number(item.quantity || 1) > 1 ? ` ×${item.quantity}` : ""}
                  </span>
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
