"use client";

import { useMemo, useState } from "react";

type CustomerProfileProps = {
  open: boolean;
  loading?: boolean;
  profile: any;
  onClose: () => void;
};

const formatCurrency = (value: number) => `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const formatDate = (value?: string | Date | null, options?: Intl.DateTimeFormatOptions) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN", options);
};

const formatDateTime = (value?: string | Date | null) => {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-IN");
};

export default function CustomerProfile({ open, loading, profile, onClose }: CustomerProfileProps) {
  const [selectedBillId, setSelectedBillId] = useState<string>("");

  const itemsBought = useMemo(() => {
    if (!profile?.bills?.length) return [];
    const map: Record<string, number> = {};
    profile.bills.forEach((bill: any) => {
      (bill.items || []).forEach((item: any) => {
        const key = item.category || item.name || "Other";
        map[key] = (map[key] || 0) + Number(item.quantity || 0);
      });
    });
    return Object.entries(map)
      .map(([name, qty]) => ({ name, qty }))
      .sort((a, b) => b.qty - a.qty);
  }, [profile]);

  const selectedBill = useMemo(
    () => (profile?.bills || []).find((bill: any) => String(bill._id) === selectedBillId),
    [profile, selectedBillId]
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 grid place-items-center p-4">
      <div className="pos-card w-full max-w-6xl max-h-[90vh] overflow-auto p-4 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-semibold">
              {profile?.customer?.name || "Customer"} <span className="text-base font-normal">📱 {profile?.customer?.phone || "-"}</span>
            </h3>
          </div>
          <button className="h-10 px-3 rounded border border-[var(--border)]" onClick={onClose}>
            ✕ Close
          </button>
        </div>

        {loading ? <p className="text-sm text-[var(--text-secondary)]">Loading customer profile...</p> : null}

        {profile ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Bills", value: profile.summary?.totalBills || 0 },
                { label: "Spent", value: formatCurrency(profile.summary?.totalSpent || 0) },
                { label: "Avg Bill", value: formatCurrency(profile.summary?.avgBillValue || 0) },
                { label: "Returns", value: profile.summary?.totalReturns || 0 },
              ].map((card) => (
                <div key={card.label} className="pos-card p-4">
                  <p className="text-sm text-[var(--text-secondary)]">{card.label}</p>
                  <p className="text-2xl font-bold">{card.value}</p>
                </div>
              ))}
            </div>

            <div className="pos-card p-3 flex flex-wrap gap-4 text-sm">
              <p>
                <span className="text-[var(--text-secondary)]">First Visit: </span>
                {formatDate(profile.summary?.firstVisit, { day: "2-digit", month: "short", year: "numeric" })}
              </p>
              <p>
                <span className="text-[var(--text-secondary)]">Last Visit: </span>
                {formatDate(profile.summary?.lastVisit, { day: "2-digit", month: "short", year: "numeric" })}
              </p>
              <p>
                <span className="text-[var(--text-secondary)]">Fav Category: </span>
                {profile.summary?.favouriteCategory || "-"}
              </p>
              <p>
                <span className="text-[var(--text-secondary)]">Fav Payment: </span>
                {String(profile.summary?.favouritePayment || "-").toUpperCase()}
              </p>
            </div>

            <div className="pos-card p-3 overflow-auto">
              <p className="font-semibold mb-2">PURCHASE HISTORY</p>
              <table className="w-full min-w-[780px] text-sm">
                <thead>
                  <tr className="text-left text-[var(--text-secondary)]">
                    <th>Bill #</th>
                    <th>Date</th>
                    <th>Total</th>
                    <th>Payment</th>
                    <th>Items</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(profile.bills || []).map((bill: any) => (
                    <tr key={bill._id} className="border-t border-[var(--border)]">
                      <td>{bill.billNumber}</td>
                      <td>{formatDateTime(bill.createdAt)}</td>
                      <td>{formatCurrency(bill.totalAmount)}</td>
                      <td>{String(bill.paymentMethod || "-").toUpperCase()}</td>
                      <td>{(bill.items || []).length}</td>
                      <td>
                        <button
                          className="underline"
                          onClick={() => setSelectedBillId((prev) => (prev === String(bill._id) ? "" : String(bill._id)))}
                        >
                          {selectedBillId === String(bill._id) ? "Hide" : "View"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {selectedBill ? (
                <div className="mt-3 border border-[var(--border)] rounded p-3 space-y-2">
                  <p className="font-medium">Bill Items - {selectedBill.billNumber}</p>
                  {(selectedBill.items || []).map((item: any, index: number) => (
                    <div key={`${item.barcode || item.name}-${index}`} className="text-sm border-t border-[var(--border)] pt-2">
                      <p>{item.name} ({item.size || "-"})</p>
                      <p className="text-[var(--text-secondary)]">
                        Qty {item.quantity} · Category {item.category || "-"} · Line {formatCurrency(item.lineTotal)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="pos-card p-3">
              <p className="font-semibold mb-2">ITEMS BOUGHT (all time)</p>
              {itemsBought.length ? (
                <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                  {itemsBought.map((row) => (
                    <p key={row.name}>
                      {row.name}: <span className="font-medium">{row.qty} pcs</span>
                    </p>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[var(--text-secondary)]">No items purchased yet.</p>
              )}
            </div>

            <div className="pos-card p-3 overflow-auto">
              <p className="font-semibold mb-2">RETURNS</p>
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="text-left text-[var(--text-secondary)]">
                    <th>Return #</th>
                    <th>Date</th>
                    <th>Item</th>
                    <th>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {(profile.returns || []).map((ret: any) => (
                    <tr key={ret._id} className="border-t border-[var(--border)]">
                      <td>{ret.returnNumber}</td>
                      <td>{formatDateTime(ret.createdAt)}</td>
                      <td>{ret.returnedItems?.[0]?.name || "-"}</td>
                      <td>{ret.returnedItems?.[0]?.reason || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!(profile.returns || []).length ? <p className="text-sm text-[var(--text-secondary)] mt-2">No returns found.</p> : null}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
