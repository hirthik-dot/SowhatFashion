"use client";

import { BillTab, BillTotals, PaymentMethod, PaymentSplitMethod } from "@/lib/bill-store";

const PAYMENT_METHOD_OPTIONS: Array<{ value: PaymentMethod; label: string }> = [
  { value: "cash", label: "Cash" },
  { value: "gpay", label: "GPay" },
  { value: "upi", label: "UPI" },
  { value: "card", label: "Card" },
  { value: "partial", label: "Partial" },
  { value: "pending", label: "Pending (Pay Later)" },
];

const SPLIT_METHOD_OPTIONS: Array<{ value: PaymentSplitMethod; label: string }> = [
  { value: "cash", label: "Cash" },
  { value: "gpay", label: "GPay" },
  { value: "upi", label: "UPI" },
  { value: "card", label: "Card" },
];

const formatMoney = (amount: number) => `₹${Number(amount || 0).toLocaleString("en-IN")}`;

type Props = {
  tab: BillTab;
  totals: BillTotals;
  setPaymentMethod: (tabId: string, method: PaymentMethod) => void;
  setCashReceived: (tabId: string, amount: number) => void;
  addPaymentSplit: (tabId: string, method: PaymentSplitMethod, amount: number) => void;
  removePaymentSplit: (tabId: string, index: number) => void;
  updatePaymentSplit: (tabId: string, index: number, amount: number) => void;
  updatePaymentSplitMethod: (tabId: string, index: number, method: PaymentSplitMethod) => void;
  setCompleteWithPending: (tabId: string, value: boolean) => void;
  totalPaid: number;
  remainingAmount: number;
};

export default function PaymentSummary({
  tab,
  totals,
  setPaymentMethod,
  setCashReceived,
  addPaymentSplit,
  removePaymentSplit,
  updatePaymentSplit,
  updatePaymentSplitMethod,
  setCompleteWithPending,
  totalPaid,
  remainingAmount,
}: Props) {
  const roundedRemaining = Math.round(remainingAmount);
  const isBalanced = roundedRemaining === 0;
  const isPendingMethod = tab.paymentMethod === "pending";
  const canKeepPending = tab.paymentMethod === "partial" && roundedRemaining > 0;
  const effectivePending = isPendingMethod ? totals.totalAmount : tab.completeWithPending ? Math.max(0, roundedRemaining) : 0;
  const hasInvalidSplitAmount = (tab.paymentBreakdown || []).some((entry) => Number(entry.amount || 0) <= 0);
  const selectedMethods = new Set((tab.paymentBreakdown || []).map((entry) => entry.method));
  const availableMethods = SPLIT_METHOD_OPTIONS.filter((entry) => !selectedMethods.has(entry.value));
  const cashSplitAmount = (tab.paymentBreakdown || [])
    .filter((entry) => entry.method === "cash")
    .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
  const cashChange = Math.max(0, Number(tab.cashReceived || 0) - cashSplitAmount);
  const phoneDigits = String(tab.customer.phone || "").replace(/\D/g, "");
  const hasPhone = phoneDigits.length >= 10;

  return (
    <div className="space-y-2">
      <select
        className="pos-input w-full"
        value={tab.paymentMethod}
        onChange={(e) => setPaymentMethod(tab.id, e.target.value as PaymentMethod)}
      >
        {PAYMENT_METHOD_OPTIONS.map((entry) => (
          <option key={entry.value} value={entry.value}>
            {entry.label}
          </option>
        ))}
      </select>

      {isPendingMethod ? (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">⏳</span>
            <p className="font-semibold text-amber-200">Full amount on pending</p>
          </div>
          <p className="text-sm text-amber-100/90">
            Customer will pay {formatMoney(totals.totalAmount)} later. Bill completes without payment now.
          </p>
          {!hasPhone ? (
            <p className="text-sm text-red-400">Customer phone is required to track pending balance.</p>
          ) : null}
        </div>
      ) : null}

      {tab.paymentMethod === "partial" ? (
        <div className="rounded border border-[var(--border)] p-2 space-y-2">
          <p className="font-medium text-sm">Split Payment</p>
          {(tab.paymentBreakdown || []).map((entry, index) => (
            <div key={`${entry.method}-${index}`} className="grid grid-cols-[1fr_1fr_auto] gap-2">
              <select
                className="pos-input h-9 min-h-0"
                value={entry.method}
                onChange={(e) => updatePaymentSplitMethod(tab.id, index, e.target.value as PaymentSplitMethod)}
              >
                {SPLIT_METHOD_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value} disabled={selectedMethods.has(option.value) && option.value !== entry.method}>
                    {option.label}
                  </option>
                ))}
              </select>
              <input
                className="pos-input h-9 min-h-0"
                type="number"
                inputMode="decimal"
                min={0}
                value={entry.amount}
                onChange={(e) => updatePaymentSplit(tab.id, index, Number(e.target.value || 0))}
              />
              <button
                className="h-9 w-9 rounded border border-[var(--border)]"
                onClick={() => removePaymentSplit(tab.id, index)}
                type="button"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            className="h-9 px-3 rounded border border-[var(--border)] text-sm disabled:opacity-50"
            type="button"
            disabled={availableMethods.length === 0}
            onClick={() => addPaymentSplit(tab.id, availableMethods[0].value, 0)}
          >
            + Add Payment Method
          </button>

          <div className="text-sm space-y-1">
            <div className="flex justify-between">
              <span>Total Paid</span>
              <span>{formatMoney(totalPaid)}</span>
            </div>
            <div className="flex justify-between">
              <span>Remaining</span>
              <span className={isBalanced ? "text-green-500" : "text-red-500"}>
                {formatMoney(Math.max(0, remainingAmount))}
              </span>
            </div>
            {cashSplitAmount > 0 ? (
              <>
                <input
                  className="pos-input w-full mt-1"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  placeholder="Cash Received"
                  value={tab.cashReceived}
                  onChange={(e) => setCashReceived(tab.id, Number(e.target.value || 0))}
                />
                <div className="flex justify-between">
                  <span>Change</span>
                  <span>{formatMoney(cashChange)}</span>
                </div>
              </>
            ) : null}
            {hasInvalidSplitAmount ? (
              <p className="text-red-500">Each split amount must be greater than 0.</p>
            ) : null}
            {isBalanced ? (
              <p className="text-green-500">✓ Balanced</p>
            ) : null}
          </div>

          {canKeepPending ? (
            <label className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-2.5 cursor-pointer">
              <input
                type="checkbox"
                className="mt-1 accent-[var(--gold)]"
                checked={tab.completeWithPending}
                onChange={(e) => setCompleteWithPending(tab.id, e.target.checked)}
              />
              <span className="text-sm">
                <span className="font-medium text-amber-200 block">Keep {formatMoney(roundedRemaining)} as pending</span>
                <span className="text-amber-100/80">Customer pays the rest later. Phone number required.</span>
              </span>
            </label>
          ) : !isBalanced && !tab.completeWithPending ? (
            <p className="text-xs text-[var(--warning)]">Total paid must equal bill total, or mark remaining as pending.</p>
          ) : null}

          {tab.completeWithPending && !hasPhone ? (
            <p className="text-sm text-red-400">Customer phone is required to track pending balance.</p>
          ) : null}
        </div>
      ) : tab.paymentMethod === "cash" ? (
        <>
          <input
            className="pos-input w-full"
            type="number"
            inputMode="decimal"
            min={0}
            placeholder="Cash Received"
            value={tab.cashReceived}
            onChange={(e) => setCashReceived(tab.id, Number(e.target.value || 0))}
          />
          <div className="flex justify-between text-sm">
            <span>Change</span>
            <span>{formatMoney(totals.changeReturned)}</span>
          </div>
        </>
      ) : null}

      {effectivePending > 0 ? (
        <div className="rounded-lg border border-amber-500/50 bg-gradient-to-r from-amber-500/15 to-orange-500/10 px-3 py-2">
          <div className="flex justify-between items-center text-sm">
            <span className="font-medium text-amber-200">Pending on this bill</span>
            <span className="font-bold text-amber-300 text-base">{formatMoney(effectivePending)}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
