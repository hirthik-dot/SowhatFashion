"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import BillingShell from "@/components/layout/BillingShell";
import ReceiptPrintModal from "@/components/billing/ReceiptPrintModal";
import { activeBillItemCount } from "@/lib/return-utils";
import { billingApi } from "@/lib/api";
import { useRole } from "@/hooks/useRole";

type Tab = "bills" | "returns" | "stock";

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

export default function StaffRecordsPage() {
  const router = useRouter();
  const params = useParams();
  const staffId = String(params.id || "");
  const { can } = useRole();
  const canAccess = can("canManageAdmins");

  const [tab, setTab] = useState<Tab>("bills");
  const [summary, setSummary] = useState<any>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [reprintBill, setReprintBill] = useState<any>(null);

  const buildQuery = () => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(limit));
    if (fromDate) params.set("startDate", fromDate);
    if (toDate) params.set("endDate", toDate);
    if (tab === "bills") params.set("createdBy", staffId);
    if (tab === "returns") params.set("processedBy", staffId);
    if (tab === "stock") params.set("enteredBy", staffId);
    return params.toString();
  };

  const loadSummary = async () => {
    try {
      const data = await billingApi.staffRecordsSummary(staffId);
      setSummary(data);
    } catch (e: any) {
      setError(e.message || "Unable to load staff summary");
    }
  };

  const loadRows = async () => {
    setLoading(true);
    setError("");
    try {
      const query = appliedQuery || buildQuery();
      if (tab === "bills") {
        const data = await billingApi.billHistory(query);
        setRows(data.data || []);
        setTotal(Number(data.total || 0));
      } else if (tab === "returns") {
        const data = await billingApi.returnsHistory(query);
        setRows(data.data || []);
        setTotal(Number(data.total || 0));
      } else {
        const data = await billingApi.inventoryEntries(query);
        setRows(data.data || []);
        setTotal(Number(data.total || 0));
      }
    } catch (e: any) {
      setError(e.message || "Unable to load records");
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!canAccess) router.push("/billing");
  }, [canAccess, router]);

  useEffect(() => {
    if (!staffId || !canAccess) return;
    loadSummary().catch(() => undefined);
  }, [staffId, canAccess]);

  useEffect(() => {
    if (!staffId || !canAccess) return;
    setPage(1);
    setAppliedQuery("");
  }, [tab, staffId, canAccess]);

  useEffect(() => {
    if (!staffId || !canAccess) return;
    loadRows().catch(() => undefined);
  }, [page, appliedQuery, tab, staffId, canAccess]);

  const applyFilters = () => {
    setPage(1);
    const params = new URLSearchParams(buildQuery());
    params.set("page", "1");
    setAppliedQuery(params.toString());
  };

  if (!canAccess) return null;

  const staff = summary?.staff;
  const title = staff ? `${staff.name} — Records` : "Staff Records";

  return (
    <BillingShell title={title}>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            className="h-9 px-3 rounded border border-[var(--border)]"
            onClick={() => router.push("/admin/staff")}
          >
            ← Back to Staff
          </button>
          {staff ? (
            <span className="text-sm text-[var(--text-secondary)]">
              {staff.email} · {staff.role} · {staff.isActive ? "Active" : "Inactive"}
            </span>
          ) : null}
        </div>

        {summary ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="pos-card p-3">
              <p className="text-xs text-[var(--text-secondary)]">Bills</p>
              <p className="text-xl font-semibold">{summary.bills?.count || 0}</p>
              <p className="text-sm text-[var(--gold)]">
                ₹{Number(summary.bills?.revenue || 0).toLocaleString("en-IN")}
              </p>
            </div>
            <div className="pos-card p-3">
              <p className="text-xs text-[var(--text-secondary)]">Returns</p>
              <p className="text-xl font-semibold">{summary.returns?.count || 0}</p>
            </div>
            <div className="pos-card p-3">
              <p className="text-xs text-[var(--text-secondary)]">Stock Entries</p>
              <p className="text-xl font-semibold">{summary.stockEntries?.count || 0}</p>
            </div>
            <div className="pos-card p-3">
              <p className="text-xs text-[var(--text-secondary)]">Last Activity</p>
              <p className="text-sm font-medium">
                {summary.lastActivity ? new Date(summary.lastActivity).toLocaleString("en-IN") : "-"}
              </p>
            </div>
          </div>
        ) : null}

        <div className="pos-card p-3 flex flex-wrap gap-2">
          {(["bills", "returns", "stock"] as Tab[]).map((key) => (
            <button
              key={key}
              className={`h-9 px-4 rounded border ${
                tab === key
                  ? "bg-[var(--gold)] text-black border-[var(--gold)]"
                  : "border-[var(--border)]"
              }`}
              onClick={() => setTab(key)}
            >
              {key === "bills" ? "Bills" : key === "returns" ? "Returns" : "Stock Entries"}
            </button>
          ))}
        </div>

        <div className="pos-card p-3 grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
          <input className="pos-input" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          <input className="pos-input" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          <button className="h-11 rounded border border-[var(--border)]" onClick={applyFilters}>
            Apply
          </button>
        </div>

        <div className="pos-card p-3 overflow-auto">
          {tab === "bills" ? (
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="text-left text-[var(--text-secondary)]">
                  <th>Bill #</th>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Salesman</th>
                  <th>Items</th>
                  <th>Amount</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((bill) => (
                  <tr key={bill._id} className="border-t border-[var(--border)]">
                    <td>{bill.billNumber}</td>
                    <td>{new Date(bill.createdAt).toLocaleString("en-IN")}</td>
                    <td>{bill.customer?.name || "Walk-in"}</td>
                    <td>{bill.salesman?.name || "-"}</td>
                    <td>{activeBillItemCount(bill.items, bill.returns)}</td>
                    <td>₹{Number(bill.totalAmount || 0).toLocaleString("en-IN")}</td>
                    <td>{String(bill.paymentMethod || "").toUpperCase()}</td>
                    <td>
                      <span className={`inline-flex rounded px-2 py-1 text-xs font-medium ${statusBadgeClass(bill)}`}>
                        {formatStatusLabel(bill)}
                      </span>
                    </td>
                    <td>
                      <button className="underline" onClick={() => setReprintBill(bill)}>
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}

          {tab === "returns" ? (
            <table className="w-full min-w-[800px] text-sm">
              <thead>
                <tr className="text-left text-[var(--text-secondary)]">
                  <th>Return #</th>
                  <th>Date</th>
                  <th>Bill #</th>
                  <th>Customer</th>
                  <th>Returned</th>
                  <th>Replacement</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row._id} className="border-t border-[var(--border)]">
                    <td className="font-medium text-[var(--gold)]">{row.returnNumber}</td>
                    <td>{new Date(row.createdAt).toLocaleString("en-IN")}</td>
                    <td>{row.billNumber}</td>
                    <td>{row.customer?.name || "-"}</td>
                    <td>{(row.returnedItems || []).length} item(s)</td>
                    <td>{(row.replacementItems || []).length} item(s)</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}

          {tab === "stock" ? (
            <table className="w-full min-w-[800px] text-sm">
              <thead>
                <tr className="text-left text-[var(--text-secondary)]">
                  <th>Date</th>
                  <th>Product</th>
                  <th>Supplier</th>
                  <th>Category</th>
                  <th>Size</th>
                  <th>Qty</th>
                  <th>Selling Price</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row._id} className="border-t border-[var(--border)]">
                    <td>{new Date(row.entryDate || row.createdAt).toLocaleString("en-IN")}</td>
                    <td>{row.productName || "-"}</td>
                    <td>{row.supplier?.name || "-"}</td>
                    <td>
                      {row.category?.name || "-"}
                      {row.subCategory?.name ? ` / ${row.subCategory.name}` : ""}
                    </td>
                    <td>{row.size || "-"}</td>
                    <td>{row.quantity}</td>
                    <td>₹{Number(row.sellingPrice || 0).toLocaleString("en-IN")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}

          {loading ? <p className="text-sm mt-2 text-[var(--text-secondary)]">Loading...</p> : null}
          {error ? <p className="text-sm mt-2 text-[var(--error)]">{error}</p> : null}
          {!loading && rows.length === 0 ? (
            <p className="text-sm mt-2 text-[var(--text-secondary)]">No records found.</p>
          ) : null}

          <div className="flex justify-end gap-2 mt-3">
            <button
              className="h-9 px-3 rounded border border-[var(--border)]"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
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

      <ReceiptPrintModal open={Boolean(reprintBill)} bill={reprintBill} onClose={() => setReprintBill(null)} />
    </BillingShell>
  );
}
