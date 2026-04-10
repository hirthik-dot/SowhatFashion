"use client";

import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import BillingShell from "@/components/layout/BillingShell";
import ReceiptPrintModal from "@/components/billing/ReceiptPrintModal";
import EditBillModal from "@/components/history/EditBillModal";
import { billingApi } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";

const STATUS_OPTIONS = [
  { value: "all", label: "All Status" },
  { value: "completed", label: "Completed" },
  { value: "replaced", label: "Returned" },
  { value: "partial_replaced", label: "Partial Return" },
];

const PAYMENT_OPTIONS = [
  { value: "all", label: "All Payment" },
  { value: "cash", label: "Cash" },
  { value: "gpay", label: "GPay" },
  { value: "upi", label: "UPI" },
  { value: "card", label: "Card" },
  { value: "partial", label: "Partial" },
];

const formatStatusLabel = (bill: any) => {
  if ((bill.editHistory || []).length > 0) return "Edited";
  if (bill.status === "replaced") return "Returned";
  if (bill.status === "partial_replaced") return "Partial Return";
  return "Completed";
};

const statusBadgeClass = (bill: any) => {
  if ((bill.editHistory || []).length > 0) return "bg-blue-600/20 text-blue-300";
  if (bill.status === "replaced") return "bg-red-600/20 text-red-300";
  if (bill.status === "partial_replaced") return "bg-orange-500/20 text-orange-300";
  return "bg-green-600/20 text-green-300";
};

export default function HistoryPage() {
  const user = useAuthStore((s) => s.user);
  const [bills, setBills] = useState<any[]>([]);
  const [salesmen, setSalesmen] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [paymentMethod, setPaymentMethod] = useState("all");
  const [salesmanId, setSalesmanId] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [viewBill, setViewBill] = useState<any>(null);
  const [editBill, setEditBill] = useState<any>(null);
  const [reprintBill, setReprintBill] = useState<any>(null);

  const canEdit = useMemo(
    () => user?.role === "superadmin" || (user?.role === "admin" && Boolean(user?.permissions?.canEditBills)),
    [user]
  );

  const buildQueryString = () => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(limit));
    if (search.trim()) params.set("search", search.trim());
    if (status !== "all") params.set("status", status);
    if (paymentMethod !== "all") params.set("paymentMethod", paymentMethod);
    if (salesmanId !== "all") params.set("salesmanId", salesmanId);
    if (fromDate) params.set("startDate", fromDate);
    if (toDate) params.set("endDate", toDate);
    return params.toString();
  };

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [history, salesmanRows] = await Promise.all([
        billingApi.billHistory(appliedQuery || buildQueryString()),
        billingApi.salesmen(),
      ]);
      setBills(history.data || []);
      setTotal(Number(history.total || 0));
      setSalesmen(Array.isArray(salesmanRows) ? salesmanRows : []);
    } catch (e: any) {
      setError(e.message || "Unable to load bill history");
      setBills([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load().catch(() => undefined);
  }, [page, appliedQuery]);

  const applyFilters = () => {
    setPage(1);
    const params = new URLSearchParams();
    params.set("page", "1");
    params.set("limit", String(limit));
    if (search.trim()) params.set("search", search.trim());
    if (status !== "all") params.set("status", status);
    if (paymentMethod !== "all") params.set("paymentMethod", paymentMethod);
    if (salesmanId !== "all") params.set("salesmanId", salesmanId);
    if (fromDate) params.set("startDate", fromDate);
    if (toDate) params.set("endDate", toDate);
    setAppliedQuery(params.toString());
  };

  const exportData = () => {
    const workbook = XLSX.utils.book_new();
    const rows = bills.map((bill) => ({
      BillNumber: bill.billNumber,
      DateTime: new Date(bill.createdAt).toLocaleString(),
      Customer: bill.customer?.name || "Walk-in",
      Phone: bill.customer?.phone || "",
      Salesman: bill.salesman?.name || "-",
      Items: (bill.items || []).length,
      Total: bill.totalAmount,
      PaymentMethod: bill.paymentMethod,
      Status: formatStatusLabel(bill),
      EditedCount: (bill.editHistory || []).length,
    }));
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), "Bill History");
    XLSX.writeFile(workbook, `bill-history-${Date.now()}.xlsx`);
  };

  return (
    <BillingShell title="Bill History">
      <div className="space-y-3">
        <div className="pos-card p-3 flex flex-wrap items-center gap-2">
          <h2 className="font-semibold text-lg mr-auto">BILL HISTORY</h2>
          <input
            className="pos-input h-10 min-h-0 w-56"
            placeholder="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applyFilters()}
          />
          <input className="pos-input h-10 min-h-0" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          <input className="pos-input h-10 min-h-0" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          <button className="h-10 px-3 rounded bg-[var(--gold)] text-black" onClick={exportData}>
            ⬇ Export
          </button>
        </div>

        <div className="pos-card p-3 grid grid-cols-1 md:grid-cols-6 gap-2 items-center">
          <input
            className="pos-input md:col-span-2"
            placeholder="Search by bill# / customer / phone"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applyFilters()}
          />
          <select className="pos-input" value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select className="pos-input" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
            {PAYMENT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select className="pos-input" value={salesmanId} onChange={(e) => setSalesmanId(e.target.value)}>
            <option value="all">All Salesmen</option>
            {salesmen.map((salesman) => (
              <option key={salesman._id} value={salesman._id}>
                {salesman.name}
              </option>
            ))}
          </select>
          <button className="h-11 rounded border border-[var(--border)]" onClick={applyFilters}>
            Apply
          </button>
        </div>

        <div className="pos-card p-3 overflow-auto">
          <table className="w-full min-w-[1040px] text-sm">
            <thead>
              <tr className="text-left text-[var(--text-secondary)]">
                <th>Bill#</th>
                <th>Date+Time</th>
                <th>Customer</th>
                <th>Salesman</th>
                <th>Items</th>
                <th>Total</th>
                <th>Payment</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {bills.map((bill) => (
                <tr key={bill._id} className="border-t border-[var(--border)]">
                  <td>{bill.billNumber}</td>
                  <td>{new Date(bill.createdAt).toLocaleString()}</td>
                  <td>{bill.customer?.name || "Walk-in"}</td>
                  <td>{bill.salesman?.name || "-"}</td>
                  <td>{(bill.items || []).length}</td>
                  <td>₹{Number(bill.totalAmount || 0).toLocaleString("en-IN")}</td>
                  <td>{String(bill.paymentMethod || "").toUpperCase()}</td>
                  <td>
                    <span className={`inline-flex rounded px-2 py-1 text-xs font-medium ${statusBadgeClass(bill)}`}>
                      {formatStatusLabel(bill)}
                    </span>
                  </td>
                  <td className="space-x-2 whitespace-nowrap">
                    <button className="underline" onClick={() => setViewBill(bill)}>
                      View
                    </button>
                    <button
                      className={`underline ${canEdit ? "" : "opacity-50 cursor-not-allowed no-underline"}`}
                      onClick={() => {
                        if (canEdit) {
                          setEditBill(bill);
                          return;
                        }
                        window.alert("You don't have permission to edit bills. Ask admin to enable 'Can Edit Bills'.");
                      }}
                      title={canEdit ? "Edit bill" : "No permission to edit bills"}
                    >
                      Edit
                    </button>
                    <button className="underline" onClick={() => setReprintBill(bill)}>
                      Reprint
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {loading ? <p className="text-sm mt-2 text-[var(--text-secondary)]">Loading...</p> : null}
          {error ? <p className="text-sm mt-2 text-[var(--error)]">{error}</p> : null}
          <div className="flex justify-end gap-2 mt-3">
            <button className="h-9 px-3 rounded border border-[var(--border)]" onClick={() => setPage((p) => Math.max(1, p - 1))}>
              Prev
            </button>
            <span className="text-sm self-center">
              Page {page} / {Math.max(1, Math.ceil(total / limit))}
            </span>
            <button
              className="h-9 px-3 rounded border border-[var(--border)]"
              onClick={() => setPage((p) => (p < Math.ceil(total / limit) ? p + 1 : p))}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {viewBill ? (
        <div className="fixed inset-0 bg-black/50 z-50 grid place-items-center p-4">
          <div className="pos-card p-4 w-full max-w-3xl max-h-[85vh] overflow-auto">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-semibold">Bill Detail - {viewBill.billNumber}</h3>
              <button onClick={() => setViewBill(null)}>Close</button>
            </div>
            <p className="text-sm mb-2">
              Customer: {viewBill.customer?.name || "Walk-in"} · Phone: {viewBill.customer?.phone || "-"} · Salesman:{" "}
              {viewBill.salesman?.name || "-"}
            </p>
            <div className="space-y-2">
              {(viewBill.items || []).map((item: any, index: number) => (
                <div key={`${item.barcode}-${index}`} className="border border-[var(--border)] rounded p-2">
                  <p className="font-medium">
                    {item.name} ({item.size || "-"})
                  </p>
                  <p className="text-sm text-[var(--text-secondary)]">Barcode: {item.barcode || "-"}</p>
                  <p className="text-sm">
                    MRP ₹{item.mrp} · Qty {item.quantity}
                    {Number(item.itemDiscountAmount || 0) > 0 ? ` · Disc ₹${item.itemDiscountAmount}` : ""}
                    · Line Total ₹{item.lineTotal}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-[var(--surface)] border border-[var(--border)] rounded flex flex-col items-end gap-1 text-sm">
              <div>Total MRP: ₹{viewBill.subtotal}</div>
              {Number(viewBill.totalItemDiscount || 0) > 0 && (
                <div className="text-red-400">Item Discs: -₹{viewBill.totalItemDiscount}</div>
              )}
              {Number(viewBill.billDiscountAmount || 0) > 0 && (
                <div className="text-red-400">Bill Disc: -₹{viewBill.billDiscountAmount}</div>
              )}
              <div className="font-bold text-lg pt-2 mt-1 border-t border-[var(--border)] min-w-[200px] text-right">
                Net Total: ₹{viewBill.totalAmount}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <EditBillModal
        open={Boolean(editBill)}
        bill={editBill}
        salesmen={salesmen}
        onClose={() => setEditBill(null)}
        onSaved={(updated) => {
          setEditBill(null);
          setReprintBill(updated);
          setBills((prev) => prev.map((bill) => (bill._id === updated._id ? updated : bill)));
        }}
      />

      <ReceiptPrintModal open={Boolean(reprintBill)} bill={reprintBill} onClose={() => setReprintBill(null)} />
    </BillingShell>
  );
}
