"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import BillingShell from "@/components/layout/BillingShell";
import { billingApi } from "@/lib/api";

type PendingCustomer = {
  name: string;
  phone: string;
  normalizedPhone: string;
  totalPending: number;
  billCount: number;
  oldestPending?: string;
  latestPending?: string;
};

type PendingBill = {
  _id: string;
  billNumber: string;
  totalAmount: number;
  pendingAmount: number;
  paymentMethod?: string;
  completedAt?: string;
};

type Settlement = {
  _id: string;
  amount: number;
  paymentMethod: string;
  note?: string;
  createdAt: string;
  createdBy?: { name?: string };
  allocations?: Array<{ billNumber: string; amount: number }>;
};

const formatMoney = (amount: number) => `₹${Number(amount || 0).toLocaleString("en-IN")}`;

const formatDate = (value?: string) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const PAYMENT_OPTIONS = [
  { value: "cash", label: "Cash" },
  { value: "gpay", label: "GPay" },
  { value: "upi", label: "UPI" },
  { value: "card", label: "Card" },
];

export default function PendingPage() {
  const [customers, setCustomers] = useState<PendingCustomer[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [customerCount, setCustomerCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailBills, setDetailBills] = useState<PendingBill[]>([]);
  const [detailSettlements, setDetailSettlements] = useState<Settlement[]>([]);
  const [detailName, setDetailName] = useState("");
  const [detailTotal, setDetailTotal] = useState(0);
  const [settleOpen, setSettleOpen] = useState(false);
  const [settleAmount, setSettleAmount] = useState("");
  const [settleMethod, setSettleMethod] = useState("cash");
  const [settleNote, setSettleNote] = useState("");
  const [settling, setSettling] = useState(false);
  const [toast, setToast] = useState("");

  const loadSummary = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await billingApi.pendingSummary();
      setCustomers(Array.isArray(data?.customers) ? data.customers : []);
      setTotalAmount(Number(data?.totalAmount || 0));
      setCustomerCount(Number(data?.customerCount || 0));
    } catch (err: any) {
      setError(err.message || "Failed to load pending customers");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCustomerDetail = useCallback(async (phone: string) => {
    setDetailLoading(true);
    try {
      const data = await billingApi.pendingCustomer(phone);
      setDetailName(String(data?.customerName || "Customer"));
      setDetailTotal(Number(data?.totalPending || 0));
      setDetailBills(Array.isArray(data?.bills) ? data.bills : []);
      setDetailSettlements(Array.isArray(data?.settlements) ? data.settlements : []);
    } catch (err: any) {
      setToast(err.message || "Failed to load customer details");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSummary().catch(() => undefined);
  }, [loadSummary]);

  useEffect(() => {
    if (!selectedPhone) return;
    loadCustomerDetail(selectedPhone).catch(() => undefined);
  }, [selectedPhone, loadCustomerDetail]);

  const filteredCustomers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.normalizedPhone.includes(q.replace(/\D/g, ""))
    );
  }, [customers, search]);

  const selectedCustomer = customers.find((c) => c.normalizedPhone === selectedPhone || c.phone === selectedPhone);

  const openSettle = () => {
    setSettleAmount(String(detailTotal || selectedCustomer?.totalPending || ""));
    setSettleMethod("cash");
    setSettleNote("");
    setSettleOpen(true);
  };

  const onSettle = async () => {
    if (!selectedPhone) return;
    const amount = Math.round(Number(settleAmount || 0));
    if (amount <= 0) return setToast("Enter a valid settlement amount");
    if (amount > detailTotal) return setToast(`Amount cannot exceed ${formatMoney(detailTotal)}`);

    setSettling(true);
    try {
      const result = await billingApi.settlePending({
        phone: selectedPhone,
        amount,
        paymentMethod: settleMethod,
        note: settleNote.trim(),
        customerName: detailName || selectedCustomer?.name,
      });
      setToast(`Settled ${formatMoney(amount)}. New balance: ${formatMoney(Number(result?.newBalance || 0))}`);
      setSettleOpen(false);
      await loadSummary();
      await loadCustomerDetail(selectedPhone);
      if (Number(result?.newBalance || 0) <= 0) {
        setSelectedPhone(null);
      }
    } catch (err: any) {
      setToast(err.message || "Settlement failed");
    } finally {
      setSettling(false);
    }
  };

  return (
    <BillingShell title="Pending Payments">
      <div className="space-y-4">
        {toast ? (
          <div className="pos-card p-3 text-sm flex justify-between items-center">
            <span>{toast}</span>
            <button type="button" onClick={() => setToast("")} className="text-[var(--text-secondary)]">
              ✕
            </button>
          </div>
        ) : null}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="pos-card p-4 border-l-4 border-l-amber-500">
            <p className="text-sm text-[var(--text-secondary)]">Total Pending</p>
            <p className="text-3xl font-bold text-amber-300 mt-1">{formatMoney(totalAmount)}</p>
          </div>
          <div className="pos-card p-4 border-l-4 border-l-orange-500">
            <p className="text-sm text-[var(--text-secondary)]">Customers with Pending</p>
            <p className="text-3xl font-bold text-orange-300 mt-1">{customerCount}</p>
          </div>
          <div className="pos-card p-4 border-l-4 border-l-[var(--gold)]">
            <p className="text-sm text-[var(--text-secondary)]">Quick Action</p>
            <Link href="/billing" className="inline-block mt-2 text-sm font-medium text-[var(--gold)] hover:underline">
              Go to Billing →
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_1.1fr] gap-4">
          <div className="pos-card p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold text-lg">Customers with Pending Balance</h2>
              <button type="button" className="text-sm text-[var(--gold)]" onClick={() => loadSummary()}>
                Refresh
              </button>
            </div>
            <input
              className="pos-input w-full"
              placeholder="Search by name or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            {loading ? (
              <p className="text-sm text-[var(--text-secondary)] py-8 text-center">Loading...</p>
            ) : error ? (
              <p className="text-sm text-red-400 py-8 text-center">{error}</p>
            ) : filteredCustomers.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-4xl mb-2">✓</p>
                <p className="font-medium">No pending balances</p>
                <p className="text-sm text-[var(--text-secondary)] mt-1">All customers are fully paid up.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[65vh] overflow-y-auto pr-1">
                {filteredCustomers.map((customer) => {
                  const isSelected =
                    selectedPhone === customer.normalizedPhone || selectedPhone === customer.phone;
                  return (
                    <button
                      key={customer.normalizedPhone}
                      type="button"
                      onClick={() => setSelectedPhone(customer.normalizedPhone)}
                      className={[
                        "w-full text-left rounded-xl border p-3 transition-all",
                        isSelected
                          ? "border-amber-500/70 bg-amber-500/15 shadow-[0_0_16px_rgba(245,158,11,0.12)]"
                          : "border-[var(--border)] hover:border-amber-500/40 hover:bg-amber-500/5",
                      ].join(" ")}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold truncate">{customer.name}</p>
                          <p className="text-sm text-[var(--text-secondary)]">{customer.phone}</p>
                          <p className="text-xs text-[var(--text-secondary)] mt-1">
                            {customer.billCount} bill{customer.billCount === 1 ? "" : "s"} · Latest {formatDate(customer.latestPending)}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xl font-bold text-amber-300">{formatMoney(customer.totalPending)}</p>
                          <p className="text-xs text-amber-200/70 mt-0.5">pending</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pos-card p-4 space-y-4 min-h-[420px]">
            {!selectedPhone ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-16">
                <span className="text-5xl mb-3">⏳</span>
                <p className="font-medium">Select a customer</p>
                <p className="text-sm text-[var(--text-secondary)] mt-1 max-w-xs">
                  View pending bill history and record settlement payments.
                </p>
              </div>
            ) : detailLoading ? (
              <p className="text-sm text-[var(--text-secondary)] py-16 text-center">Loading details...</p>
            ) : (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold">{detailName}</h2>
                    <p className="text-sm text-[var(--text-secondary)]">{selectedCustomer?.phone || selectedPhone}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-[var(--text-secondary)]">Outstanding</p>
                    <p className="text-3xl font-bold text-amber-300">{formatMoney(detailTotal)}</p>
                  </div>
                </div>

                {detailTotal > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="h-10 px-4 rounded bg-[var(--gold)] text-black font-semibold"
                      onClick={openSettle}
                    >
                      Record Settlement
                    </button>
                    <Link
                      href="/billing"
                      className="h-10 px-4 rounded border border-[var(--border)] inline-flex items-center text-sm"
                    >
                      New Bill for Customer
                    </Link>
                  </div>
                ) : null}

                <div>
                  <h3 className="font-semibold mb-2">Pending Bills</h3>
                  {detailBills.length === 0 ? (
                    <p className="text-sm text-[var(--text-secondary)]">No open pending bills.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-[var(--text-secondary)] border-b border-[var(--border)]">
                            <th className="py-2 pr-2">Bill</th>
                            <th className="py-2 pr-2">Date</th>
                            <th className="py-2 pr-2">Total</th>
                            <th className="py-2">Pending</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detailBills.map((bill) => (
                            <tr key={bill._id} className="border-b border-[var(--border)]/50">
                              <td className="py-2 pr-2 font-medium">{bill.billNumber}</td>
                              <td className="py-2 pr-2">{formatDate(bill.completedAt)}</td>
                              <td className="py-2 pr-2">{formatMoney(bill.totalAmount)}</td>
                              <td className="py-2 font-semibold text-amber-300">{formatMoney(bill.pendingAmount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Settlement History</h3>
                  {detailSettlements.length === 0 ? (
                    <p className="text-sm text-[var(--text-secondary)]">No settlements recorded yet.</p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {detailSettlements.map((entry) => (
                        <div key={entry._id} className="rounded border border-[var(--border)] p-2.5 text-sm">
                          <div className="flex justify-between gap-2">
                            <span className="font-medium text-green-400">{formatMoney(entry.amount)}</span>
                            <span className="text-[var(--text-secondary)]">{formatDate(entry.createdAt)}</span>
                          </div>
                          <p className="text-xs text-[var(--text-secondary)] mt-1">
                            via {String(entry.paymentMethod || "").toUpperCase()}
                            {entry.createdBy?.name ? ` · ${entry.createdBy.name}` : ""}
                          </p>
                          {entry.note ? <p className="text-xs mt-1">{entry.note}</p> : null}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {settleOpen ? (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="pos-card w-full max-w-md p-4 space-y-3">
            <h3 className="font-semibold text-lg">Record Settlement</h3>
            <p className="text-sm text-[var(--text-secondary)]">
              {detailName} · Outstanding {formatMoney(detailTotal)}
            </p>
            <input
              className="pos-input w-full"
              type="number"
              min={1}
              max={detailTotal}
              placeholder="Amount received"
              value={settleAmount}
              onChange={(e) => setSettleAmount(e.target.value)}
            />
            <select className="pos-input w-full" value={settleMethod} onChange={(e) => setSettleMethod(e.target.value)}>
              {PAYMENT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <input
              className="pos-input w-full"
              placeholder="Note (optional)"
              value={settleNote}
              onChange={(e) => setSettleNote(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button type="button" className="h-10 rounded border border-[var(--border)]" onClick={() => setSettleOpen(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="h-10 rounded bg-[var(--gold)] text-black font-semibold disabled:opacity-50"
                disabled={settling}
                onClick={onSettle}
              >
                {settling ? "Saving..." : "Confirm Settlement"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </BillingShell>
  );
}
