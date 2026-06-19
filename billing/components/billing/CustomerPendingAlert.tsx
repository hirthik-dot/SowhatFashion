"use client";

import { useEffect, useState } from "react";
import { billingApi } from "@/lib/api";

const formatMoney = (amount: number) => `₹${Number(amount || 0).toLocaleString("en-IN")}`;

type PendingBill = {
  _id: string;
  billNumber: string;
  totalAmount: number;
  pendingAmount: number;
  completedAt?: string;
};

export default function CustomerPendingAlert({ phone }: { phone: string }) {
  const [loading, setLoading] = useState(false);
  const [totalPending, setTotalPending] = useState(0);
  const [bills, setBills] = useState<PendingBill[]>([]);
  const [expanded, setExpanded] = useState(false);

  const digits = String(phone || "").replace(/\D/g, "");

  useEffect(() => {
    if (digits.length < 10) {
      setTotalPending(0);
      setBills([]);
      return;
    }

    let active = true;
    setLoading(true);
    billingApi
      .pendingBalance(phone)
      .then((data) => {
        if (!active) return;
        setTotalPending(Number(data?.totalPending || 0));
        setBills(Array.isArray(data?.bills) ? data.bills : []);
      })
      .catch(() => {
        if (!active) return;
        setTotalPending(0);
        setBills([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [phone, digits]);

  if (digits.length < 10 || loading || totalPending <= 0) return null;

  return (
    <div className="rounded-xl border-2 border-amber-500/60 bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-red-500/10 p-3 shadow-[0_0_20px_rgba(245,158,11,0.15)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 min-w-0">
          <span className="text-xl shrink-0 mt-0.5">⚠️</span>
          <div className="min-w-0">
            <p className="font-bold text-amber-200 text-sm uppercase tracking-wide">Customer has pending balance</p>
            <p className="text-2xl font-bold text-amber-300 mt-0.5">{formatMoney(totalPending)}</p>
            <p className="text-xs text-amber-100/80 mt-1">
              {bills.length} unpaid bill{bills.length === 1 ? "" : "s"} · Settle from Pending page
            </p>
          </div>
        </div>
        <button
          type="button"
          className="shrink-0 text-xs px-2 py-1 rounded border border-amber-500/40 text-amber-200 hover:bg-amber-500/20"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "Hide" : "Details"}
        </button>
      </div>

      {expanded ? (
        <div className="mt-3 pt-3 border-t border-amber-500/30 space-y-1.5">
          {bills.map((bill) => (
            <div key={bill._id} className="flex justify-between text-sm bg-black/20 rounded px-2 py-1.5">
              <span className="text-amber-100/90">{bill.billNumber}</span>
              <span className="font-semibold text-amber-300">{formatMoney(bill.pendingAmount)}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
