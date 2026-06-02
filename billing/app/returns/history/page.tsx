"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BillingShell from "@/components/layout/BillingShell";
import ReplacementSwapSummary, { type ReturnSwapRecord } from "@/components/returns/ReplacementSwapSummary";
import ReplacementReceipt, { type ReturnDocument } from "@/components/returns/ReplacementReceipt";
import { billingApi } from "@/lib/api";
import { useRole } from "@/hooks/useRole";

export default function ReturnsHistoryPage() {
  const router = useRouter();
  const { can } = useRole();
  const canAccess = can("canReturn") || can("canViewReports");

  const [rows, setRows] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState<ReturnSwapRecord | null>(null);
  const [reprintData, setReprintData] = useState<ReturnDocument | null>(null);
  const [reprintLoading, setReprintLoading] = useState(false);

  const buildQuery = () => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(limit));
    if (search.trim()) params.set("search", search.trim());
    if (fromDate) params.set("startDate", fromDate);
    if (toDate) params.set("endDate", toDate);
    return params.toString();
  };

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await billingApi.returnsHistory(appliedQuery || buildQuery());
      setRows(data.data || []);
      setTotal(Number(data.total || 0));
    } catch (e: any) {
      setError(e.message || "Unable to load returns history");
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
    load().catch(() => undefined);
  }, [page, appliedQuery]);

  const openReprint = async (row: any) => {
    setReprintLoading(true);
    try {
      const full = row._id ? await billingApi.returnById(row._id) : row;
      setReprintData({
        ...full,
        billNumber: full.billNumber || row.billNumber,
        customer: full.customer || row.customer,
        processedByName: full.processedByName || row.processedByName || "-",
      });
    } catch (e: any) {
      setError(e.message || "Unable to load return for reprint");
    } finally {
      setReprintLoading(false);
    }
  };

  const applyFilters = () => {
    setPage(1);
    const params = new URLSearchParams(buildQuery());
    params.set("page", "1");
    setAppliedQuery(params.toString());
  };

  if (!canAccess) return null;

  return (
    <BillingShell title="Returns History">
      {reprintData ? (
        <ReplacementReceipt
          returnData={reprintData}
          onClose={() => setReprintData(null)}
        />
      ) : null}
      <div className="space-y-3">
        <div className="pos-card p-3 flex flex-wrap items-center gap-2">
          <h2 className="font-semibold text-lg mr-auto">RETURNS & REPLACEMENTS</h2>
        </div>

        <div className="pos-card p-3 grid grid-cols-1 md:grid-cols-5 gap-2 items-center">
          <input
            className="pos-input md:col-span-2"
            placeholder="Search return #, bill #, customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applyFilters()}
          />
          <input className="pos-input" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          <input className="pos-input" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          <button className="h-11 rounded border border-[var(--border)]" onClick={applyFilters}>
            Apply
          </button>
        </div>

        <div className="pos-card p-3 overflow-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="text-left text-[var(--text-secondary)]">
                <th>Return #</th>
                <th>Date</th>
                <th>Bill #</th>
                <th>Customer</th>
                <th>Returned</th>
                <th>Replacement</th>
                <th>Processed by</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row._id} className="border-t border-[var(--border)]">
                  <td className="font-medium text-[var(--gold)]">{row.returnNumber}</td>
                  <td>{new Date(row.createdAt).toLocaleString("en-IN")}</td>
                  <td>{row.billNumber}</td>
                  <td>
                    {row.customer?.name || "-"}
                    {row.customer?.phone ? (
                      <div className="text-xs text-[var(--text-secondary)]">{row.customer.phone}</div>
                    ) : null}
                  </td>
                  <td>{(row.returnedItems || []).length} item(s)</td>
                  <td>{(row.replacementItems || []).length} item(s)</td>
                  <td>{row.processedByName || "-"}</td>
                  <td className="space-x-2 whitespace-nowrap">
                    <button className="underline" onClick={() => setDetail(row)}>
                      View swap
                    </button>
                    <button
                      className="underline text-[var(--gold)]"
                      disabled={reprintLoading}
                      onClick={() => openReprint(row)}
                    >
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

      {detail ? (
        <div className="fixed inset-0 bg-black/60 z-50 grid place-items-center p-4">
          <div className="pos-card p-4 w-full max-w-4xl max-h-[90vh] overflow-auto">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold">Replacement details — {detail.returnNumber}</h3>
              <button onClick={() => setDetail(null)}>Close</button>
            </div>
            <ReplacementSwapSummary records={[detail]} />
          </div>
        </div>
      ) : null}
    </BillingShell>
  );
}
