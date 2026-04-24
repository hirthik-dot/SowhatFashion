"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import BillingShell from "@/components/layout/BillingShell";
import { billingApi } from "@/lib/api";
import { useBillStore } from "@/lib/bill-store";
import BillTabsBar from "@/components/billing/BillTabsBar";
import BillItemRow from "@/components/billing/BillItemRow";
import HeldBillsDrawer from "@/components/billing/HeldBillsDrawer";
import ReceiptPrintModal from "@/components/billing/ReceiptPrintModal";
import BarcodeScanner from "@/components/billing/BarcodeScanner";
import PaymentSummary from "@/components/billing/PaymentSummary";
import { useRole } from "@/hooks/useRole";

export default function BillingPage() {
  const { can, maxDiscount, isSuperAdmin } = useRole();
  const scannerRef = useRef<HTMLInputElement>(null);
  const [salesmen, setSalesmen] = useState<any[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [toast, setToast] = useState<string>("");
  const [receiptBill, setReceiptBill] = useState<any>(null);
  const [flashError, setFlashError] = useState(false);
  const tabs = useBillStore((s) => s.tabs);
  const activeTabId = useBillStore((s) => s.activeTabId || s.tabs[0]?.id);
  const createTab = useBillStore((s) => s.createTab);
  const closeTab = useBillStore((s) => s.closeTab);
  const setActiveTab = useBillStore((s) => s.setActiveTab);
  const addItem = useBillStore((s) => s.addItem);
  const removeItem = useBillStore((s) => s.removeItem);
  const updateItemDiscount = useBillStore((s) => s.updateItemDiscount);
  const updateQuantity = useBillStore((s) => s.updateQuantity);
  const setCustomer = useBillStore((s) => s.setCustomer);
  const setSalesman = useBillStore((s) => s.setSalesman);
  const setPaymentMethod = useBillStore((s) => s.setPaymentMethod);
  const setBillDiscount = useBillStore((s) => s.setBillDiscount);
  const setCashReceived = useBillStore((s) => s.setCashReceived);
  const addPaymentSplit = useBillStore((s) => s.addPaymentSplit);
  const removePaymentSplit = useBillStore((s) => s.removePaymentSplit);
  const updatePaymentSplit = useBillStore((s) => s.updatePaymentSplit);
  const totalPaid = useBillStore((s) => s.totalPaid);
  const remainingAmount = useBillStore((s) => s.remainingAmount);
  const holdBill = useBillStore((s) => s.holdBill);
  const clearTab = useBillStore((s) => s.clearTab);
  const computedTotals = useBillStore((s) => s.computedTotals);
  const heldBills = useBillStore((s) => s.heldBills);
  const fetchHeldBills = useBillStore((s) => s.fetchHeldBills);
  const resumeHeldBill = useBillStore((s) => s.resumeHeldBill);
  const discardHeldBill = useBillStore((s) => s.discardHeldBill);
  const activeTab = tabs.find((tab) => tab.id === activeTabId) || tabs[0];
  const totals = useMemo(() => computedTotals(activeTab?.id || ""), [computedTotals, activeTab, tabs]);
  const paidAmount = useMemo(() => (activeTab ? totalPaid(activeTab.id) : 0), [activeTab, tabs, totalPaid]);
  const pendingAmount = useMemo(() => (activeTab ? remainingAmount(activeTab.id) : 0), [activeTab, tabs, remainingAmount]);
  const hasInvalidPartialSplit = useMemo(
    () => (activeTab?.paymentBreakdown || []).some((entry) => Number(entry.amount || 0) <= 0),
    [activeTab?.paymentBreakdown]
  );
  const canComplete = Boolean(
    activeTab &&
      activeTab.customer.name.trim() &&
      activeTab.salesmanId &&
      (activeTab.paymentMethod !== "partial"
        ? true
        : Math.round(paidAmount) === totals.totalAmount && !hasInvalidPartialSplit && (activeTab.paymentBreakdown || []).length > 0)
  );
  const itemDiscountRows = useMemo(() => {
    return (activeTab?.items || [])
      .map((item) => {
        let discountPerUnit = 0;
        if (item.itemDiscountType === "percent") {
          discountPerUnit = (item.mrp * item.itemDiscountValue) / 100;
        } else if (item.itemDiscountType === "amount") {
          discountPerUnit = item.itemDiscountValue;
        }
        return {
          name: item.name,
          label: item.itemDiscountType === "percent" ? `-${item.itemDiscountValue}%` : item.itemDiscountType === "amount" ? `-₹${item.itemDiscountValue}` : "-",
          amount: discountPerUnit * item.quantity,
        };
      })
      .filter((row) => row.amount > 0);
  }, [activeTab?.items]);

  const playSuccess = () => new Audio("/sounds/beep.mp3").play().catch(() => undefined);
  const playError = () => new Audio("/sounds/error.mp3").play().catch(() => undefined);

  const scan = async (manual: string) => {
    const value = (manual ?? "").trim();
    if (!value || !activeTab) return;
    try {
      const product = await billingApi.scanBarcode(value);
      addItem(activeTab.id, product);
      playSuccess();
      setToast(`${product.name} added`);
    } catch (error: any) {
      playError();
      setFlashError(true);
      setTimeout(() => setFlashError(false), 350);
      setToast(error.message || "Scan failed");
    }
  };

  useEffect(() => {
    scannerRef.current?.focus();
    fetchHeldBills().catch(() => undefined);
    billingApi.salesmen().then(setSalesmen).catch(() => setSalesmen([]));
  }, [fetchHeldBills]);

  useEffect(() => {
    const handler = async (event: KeyboardEvent) => {
      if (event.key === "F2") {
        event.preventDefault();
        scannerRef.current?.focus();
      } else if (event.key === "F4") {
        event.preventDefault();
        createTab();
      } else if (event.key === "F9" && activeTab) {
        event.preventDefault();
        await onHold();
      } else if (event.key === "F12" && activeTab) {
        event.preventDefault();
        await onComplete();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  const onCloseTab = (tabId: string) => {
    const tab = tabs.find((item) => item.id === tabId);
    if (tab && tab.items.length > 0) {
      const confirmed = window.confirm(`This bill has ${tab.items.length} items. Close anyway?`);
      if (!confirmed) return;
    }
    closeTab(tabId);
  };

  const onHold = async () => {
    if (!activeTab) return;
    await holdBill(activeTab.id);
    await fetchHeldBills();
    setToast("Bill held. Resume from Held Bills.");
  };

  const onComplete = async () => {
    if (!activeTab) return;
    if (!activeTab.customer.name.trim()) return setToast("Customer name is required");
    if (!activeTab.salesmanId) return setToast("Salesman is required");
    if (activeTab.paymentMethod === "partial") {
      if ((activeTab.paymentBreakdown || []).length === 0) return setToast("Add at least one payment split");
      if ((activeTab.paymentBreakdown || []).some((entry) => Number(entry.amount || 0) <= 0)) {
        return setToast("Each payment split must be greater than 0");
      }
      if (Math.round(paidAmount) !== totals.totalAmount) {
        return setToast(`Payment must match total. ₹${Math.max(0, pendingAmount).toLocaleString("en-IN")} remaining`);
      }
    }
    const maxAllowedDiscount = isSuperAdmin ? 100 : maxDiscount;
    if (activeTab.billDiscountType === "percent" && Number(activeTab.billDiscountValue || 0) > maxAllowedDiscount) {
      return setToast(`Discount cannot exceed ${maxAllowedDiscount}%`);
    }
    const ok = window.confirm(`Complete bill for ₹${totals.totalAmount}?`);
    if (!ok) return;
    const completed = await billingApi.completeBill({
      customer: activeTab.customer,
      salesman: activeTab.salesmanId,
      paymentMethod: activeTab.paymentMethod,
      paymentBreakdown: activeTab.paymentBreakdown,
      items: activeTab.items,
      billDiscountType: activeTab.billDiscountType,
      billDiscountValue: activeTab.billDiscountValue,
      cashReceived: activeTab.cashReceived,
    });
    const selectedSalesman = salesmen.find((s) => s._id === activeTab.salesmanId);
    setReceiptBill({ ...completed, salesmanName: selectedSalesman?.name || "" });
    clearTab(activeTab.id);
    setToast(`Bill completed: ${completed.billNumber}`);
  };

  return (
    <BillingShell title="Billing">
      <div className="space-y-3 pb-20 md:pb-0">
        {toast ? <div className="pos-card p-2 text-sm">{toast}</div> : null}
        <BillTabsBar
          tabs={tabs}
          activeTabId={activeTab?.id || ""}
          onNewTab={createTab}
          onSetActive={setActiveTab}
          onClose={onCloseTab}
          heldCount={heldBills.length}
          onOpenHeld={() => setDrawerOpen(true)}
        />
        <BarcodeScanner
          inputRef={scannerRef}
          flashError={flashError}
          onScanBarcode={(barcode) => billingApi.scanBarcode(barcode)}
          onAdd={async (product) => {
            if (!activeTab) return;
            addItem(activeTab.id, product);
          }}
          onToast={setToast}
          playSuccess={playSuccess}
          playError={playError}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          <div className="pos-card p-3 xl:col-span-2">
            <h2 className="font-semibold mb-3">Bill Items</h2>
            <div className="space-y-2">
              {(activeTab?.items || []).map((item, index) => (
                <BillItemRow
                  key={`${item.barcode}-${index}`}
                  item={item}
                  index={index}
                  onDiscountType={(type) => updateItemDiscount(activeTab.id, index, type, item.itemDiscountValue)}
                  onDiscountValue={(value) => updateItemDiscount(activeTab.id, index, item.itemDiscountType === "none" ? "percent" : item.itemDiscountType, value)}
                  onQty={(qty) => updateQuantity(activeTab.id, index, qty)}
                  onRemove={() => removeItem(activeTab.id, index)}
                />
              ))}
            </div>
          </div>
          <div className="pos-card p-3 space-y-2">
            <h2 className="font-semibold">Customer & Payment</h2>
            <input className="pos-input w-full" placeholder="Name" value={activeTab?.customer.name || ""} onChange={(e) => activeTab && setCustomer(activeTab.id, e.target.value, activeTab.customer.phone)} />
            <input className="pos-input w-full" placeholder="Phone" inputMode="numeric" value={activeTab?.customer.phone || ""} onChange={(e) => activeTab && setCustomer(activeTab.id, activeTab.customer.name, e.target.value)} />
            <select className="pos-input w-full" value={activeTab?.salesmanId || ""} onChange={(e) => activeTab && setSalesman(activeTab.id, e.target.value)}>
              <option value="">Select salesman</option>
              {salesmen.map((salesman) => <option key={salesman._id} value={salesman._id}>{salesman.name}</option>)}
            </select>
            {activeTab ? (
              <PaymentSummary
                tab={activeTab}
                totals={totals}
                setPaymentMethod={setPaymentMethod}
                setCashReceived={setCashReceived}
                addPaymentSplit={addPaymentSplit}
                removePaymentSplit={removePaymentSplit}
                updatePaymentSplit={updatePaymentSplit}
                totalPaid={paidAmount}
                remainingAmount={pendingAmount}
              />
            ) : null}
            <div className="border-t border-[var(--border)] pt-2 text-sm space-y-1">
              <div className="flex justify-between"><span>Subtotal</span><span>₹{totals.subtotal.toFixed(2)}</span></div>
              <div className="mt-2">
                <p className="text-[var(--text-secondary)]">ITEM DISCOUNTS</p>
                {itemDiscountRows.map((row, index) => (
                  <div key={`${row.name}-${index}`} className="flex justify-between">
                    <span>{row.name} {row.label}</span>
                    <span>-₹{row.amount.toFixed(2)}</span>
                  </div>
                ))}
                <div className="flex justify-between border-t border-[var(--border)] mt-1 pt-1">
                  <span>Total Item Disc</span><span>-₹{totals.totalItemDiscount.toFixed(2)}</span>
                </div>
              </div>
              <div className="flex justify-between"><span>After Item Disc</span><span>₹{totals.afterItemDiscount.toFixed(2)}</span></div>
              <p className="text-[var(--text-secondary)] mt-2">BILL DISCOUNT</p>
              <div className="flex items-center gap-2">
                <button
                  className="h-9 w-9 rounded border border-[var(--border)] disabled:opacity-50"
                  disabled={!can("canDiscount")}
                  onClick={() => activeTab && setBillDiscount(activeTab.id, activeTab.billDiscountType === "percent" ? "amount" : "percent", activeTab.billDiscountValue)}
                >
                  {activeTab?.billDiscountType === "percent" ? "%" : "₹"}
                </button>
                <input
                  className="pos-input h-9 min-h-0 flex-1"
                  type="number"
                  inputMode="decimal"
                  max={isSuperAdmin ? 100 : maxDiscount}
                  disabled={!can("canDiscount")}
                  value={activeTab?.billDiscountValue || 0}
                  onChange={(e) => activeTab && setBillDiscount(activeTab.id, activeTab.billDiscountType === "none" ? "percent" : activeTab.billDiscountType, Number(e.target.value || 0))}
                />
                <span>-₹{totals.billDiscountAmount.toFixed(2)}</span>
              </div>
              {!isSuperAdmin && can("canDiscount") ? (
                <p className="text-xs text-[var(--text-secondary)]">Max allowed discount: {maxDiscount}%</p>
              ) : null}
              <div className="flex justify-between"><span>Taxable</span><span>₹{totals.taxableAmount.toFixed(2)}</span></div>
              <div className="flex justify-between"><span>GST 5%</span><span>₹{totals.gstAmount.toFixed(2)}</span></div>
              <div className="flex justify-between"><span>Round Off</span><span>{totals.roundOff.toFixed(2)}</span></div>
              <div className="flex justify-between text-2xl font-bold text-[var(--gold)]"><span>TOTAL</span><span>₹{totals.totalAmount.toFixed(2)}</span></div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button className="h-11 rounded border border-[var(--border)]" onClick={onHold}>HOLD BILL</button>
              <button className="h-11 rounded border border-[var(--border)]" onClick={() => activeTab && clearTab(activeTab.id)}>CLEAR</button>
              <button className="h-11 rounded bg-[var(--gold)] text-black font-semibold disabled:opacity-50" disabled={!canComplete} onClick={onComplete}>COMPLETE & PRINT</button>
            </div>
          </div>
        </div>
        <div className="text-xs text-[var(--text-secondary)]">F2 Scanner · F4 New Bill · F9 Hold · F12 Complete</div>
        <button className="md:hidden fixed bottom-3 left-3 right-3 h-12 rounded bg-[var(--gold)] text-black font-semibold disabled:opacity-50" disabled={!canComplete} onClick={onComplete}>COMPLETE & PRINT</button>
      </div>
      <HeldBillsDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        bills={heldBills}
        onResume={async (bill) => {
          resumeHeldBill(bill);
          await discardHeldBill(bill._id);
          setDrawerOpen(false);
        }}
        onDiscard={async (id) => {
          await discardHeldBill(id);
          await fetchHeldBills();
        }}
      />
      <ReceiptPrintModal open={Boolean(receiptBill)} bill={receiptBill} onClose={() => setReceiptBill(null)} />
    </BillingShell>
  );
}
