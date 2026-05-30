"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import BillingShell from "@/components/layout/BillingShell";
import { billingApi } from "@/lib/api";
import { useRole } from "@/hooks/useRole";

const formatCurrency = (value: number) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const formatDate = (value?: string | Date | null) =>
  value ? new Date(value).toLocaleString("en-IN") : "-";
const formatPct = (value: number) => `${Number(value || 0).toFixed(1)}%`;

type SortField = "date" | "revenue" | "cost" | "profit" | "margin";

export default function BillWiseProfitPage() {
  const router = useRouter();
  const { can } = useRole();
  const canAccess = can("canViewReports");

  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [sortBy, setSortBy] = useState<SortField>("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  const [appliedQuery, setAppliedQuery] = useState("");
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [selectedBillId, setSelectedBillId] = useState("");
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<any>(null);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(limit));
    params.set("sortBy", sortBy);
    params.set("sortOrder", sortOrder);
    if (search.trim()) params.set("search", search.trim());
    if (fromDate) params.set("startDate", fromDate);
    if (toDate) params.set("endDate", toDate);
    return params.toString();
  }, [page, limit, sortBy, sortOrder, search, fromDate, toDate]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await billingApi.reportBillProfit(appliedQuery || queryString);
      setRows(data.data || []);
      setTotal(Number(data.total || 0));
      setSummary(data.summary || null);
    } catch (e: any) {
      setRows([]);
      setTotal(0);
      setSummary(null);
      setError(e.message || "Unable to load bill-wise profit");
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

  const applyFilters = () => {
    setPage(1);
    const params = new URLSearchParams(queryString);
    params.set("page", "1");
    setAppliedQuery(params.toString());
  };

  const openBill = async (billId: string) => {
    setSelectedBillId(billId);
    setDetail(null);
    setDetailLoading(true);
    try {
      const data = await billingApi.reportBillProfitDetail(billId);
      setDetail(data);
    } catch (e: any) {
      setDetail(null);
      setError(e.message || "Unable to load bill details");
    } finally {
      setDetailLoading(false);
    }
  };

  const exportExcel = async () => {
    try {
      const exportData = await billingApi.reportBillProfit(
        `${appliedQuery || queryString}&page=1&limit=10000`
      );
      const sheetRows = (exportData.data || []).map((row: any) => ({
        "Bill #": row.billNumber || "-",
        Date: formatDate(row.createdAt),
        Customer: row.customer?.name || "-",
        Phone: row.customer?.phone || "-",
        Salesman: row.salesmanName || "-",
        Items: row.itemCount || 0,
        "Stock Units": row.stockUnits || 0,
        "Bill Total (incl. GST)": Number(row.totalAmount || 0),
        "Revenue (ex-GST)": Number(row.revenue || 0),
        Cost: Number(row.cost || 0),
        Profit: Number(row.profit || 0),
        "Margin %": Number(row.margin || 0),
        Payment: row.paymentMethod || "-",
        Status: row.status || "-",
      }));
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(sheetRows), "Bill Profit");
      XLSX.writeFile(workbook, `bill-wise-profit-${Date.now()}.xlsx`);
    } catch (e: any) {
      setError(e.message || "Export failed");
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  if (!canAccess) return null;

  return (
    <BillingShell title="Bill Wise Profit">
      <div className="space-y-3">
        <div className="pos-card p-3 flex flex-wrap items-center gap-2">
          <div className="mr-auto">
            <h2 className="font-semibold text-lg">BILL WISE PROFIT</h2>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Revenue is MRP after discounts (ex-GST). Cost is purchase price from stock entries.
            </p>
            <div className="text-xs text-[var(--text-secondary)] mt-2 flex flex-wrap gap-3">
              <Link href="/reports" className="underline">
                📈 Overview
              </Link>
              <Link href="/reports/customers" className="underline">
                📋 Customers
              </Link>
              <span className="text-[var(--gold)]">💰 Bill Wise Profit</span>
            </div>
          </div>
          <button className="h-10 px-3 rounded bg-[var(--gold)] text-black w-full sm:w-auto" onClick={exportExcel}>
            ⬇ Export Excel
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: "Bills", value: summary?.totalBills ?? 0, format: "number" },
            { label: "Revenue (ex-GST)", value: summary?.totalRevenue ?? 0, format: "currency" },
            { label: "Total Cost", value: summary?.totalCost ?? 0, format: "currency" },
            { label: "Total Profit", value: summary?.totalProfit ?? 0, format: "currency", highlight: true },
            { label: "Avg Margin", value: summary?.profitMargin ?? 0, format: "percent" },
          ].map((card) => (
            <div key={card.label} className="pos-card p-4">
              <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wide">{card.label}</p>
              <p
                className={`text-xl font-bold mt-1 ${
                  card.highlight ? "text-[var(--success)]" : "text-white"
                }`}
              >
                {card.format === "number"
                  ? card.value
                  : card.format === "percent"
                    ? formatPct(Number(card.value))
                    : formatCurrency(Number(card.value))}
              </p>
            </div>
          ))}
        </div>

        <div className="pos-card p-3 grid grid-cols-1 md:grid-cols-8 gap-2 items-center">
          <input
            className="pos-input md:col-span-2"
            placeholder="Search bill #, customer name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applyFilters()}
          />
          <input className="pos-input" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          <input className="pos-input" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          <select
            className="pos-input"
            value={`${sortBy}:${sortOrder}`}
            onChange={(e) => {
              const [field, order] = e.target.value.split(":");
              setSortBy(field as SortField);
              setSortOrder(order as "asc" | "desc");
            }}
          >
            <option value="date:desc">Newest first</option>
            <option value="date:asc">Oldest first</option>
            <option value="profit:desc">Highest profit</option>
            <option value="profit:asc">Lowest profit</option>
            <option value="revenue:desc">Highest revenue</option>
            <option value="margin:desc">Highest margin</option>
          </select>
          <button className="h-10 px-3 rounded border border-[var(--border)]" onClick={applyFilters}>
            Apply
          </button>
        </div>

        {error ? <div className="pos-card p-3 text-[var(--danger)]">{error}</div> : null}

        <div className="pos-card p-3 overflow-auto">
          <p className="mb-2 font-medium">All Bills — Profit Breakdown</p>
          {loading ? (
            <p className="text-sm text-[var(--text-secondary)] p-4">Loading...</p>
          ) : (
            <table className="w-full min-w-[1100px] text-sm">
              <thead>
                <tr className="text-left text-[var(--text-secondary)]">
                  <th>Bill #</th>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Salesman</th>
                  <th>Items</th>
                  <th>Revenue</th>
                  <th>Cost</th>
                  <th>Profit</th>
                  <th>Margin</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row._id} className="border-t border-[var(--border)] hover:bg-[var(--surface-2)]">
                    <td className="py-2 font-medium text-[var(--gold)]">{row.billNumber}</td>
                    <td>{formatDate(row.createdAt)}</td>
                    <td>
                      <div>{row.customer?.name || "-"}</div>
                      {row.customer?.phone ? (
                        <div className="text-xs text-[var(--text-secondary)]">{row.customer.phone}</div>
                      ) : null}
                    </td>
                    <td>{row.salesmanName || "-"}</td>
                    <td>
                      {row.itemCount || 0}
                      <span className="text-xs text-[var(--text-secondary)]"> ({row.stockUnits || 0} units)</span>
                    </td>
                    <td>{formatCurrency(row.revenue)}</td>
                    <td>{formatCurrency(row.cost)}</td>
                    <td className={Number(row.profit) >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]"}>
                      {formatCurrency(row.profit)}
                    </td>
                    <td>{formatPct(row.margin)}</td>
                    <td>{row.paymentMethod}</td>
                    <td>{row.status}</td>
                    <td>
                      <button className="text-[var(--info)] hover:underline" onClick={() => openBill(row._id)}>
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
                {!rows.length && !loading ? (
                  <tr>
                    <td colSpan={12} className="p-8 text-center text-[var(--text-secondary)]">
                      No bills found for the selected filters.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          )}

          <div className="flex flex-col sm:flex-row sm:justify-between gap-2 mt-3 text-sm">
            <div className="text-[var(--text-secondary)]">Total: {total} bills</div>
            <div className="flex gap-2">
              <button
                className="px-3 rounded border border-[var(--border)] disabled:opacity-50"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Prev
              </button>
              <span className="self-center">
                Page {page} / {totalPages}
              </span>
              <button
                className="px-3 rounded border border-[var(--border)] disabled:opacity-50"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {selectedBillId ? (
        <div className="fixed inset-0 bg-black/70 z-50 grid place-items-center p-4 backdrop-blur-sm">
          <div className="pos-card p-6 w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl border border-[var(--border)]">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-[var(--border)]">
              <h3 className="font-bold text-lg text-white">
                Bill Profit —{" "}
                <span className="text-[var(--gold)]">{detail?.bill?.billNumber || "..."}</span>
              </h3>
              <button
                className="text-[var(--text-secondary)] hover:text-white bg-[var(--surface-2)] p-2 rounded-full"
                onClick={() => {
                  setSelectedBillId("");
                  setDetail(null);
                }}
              >
                ✕
              </button>
            </div>

            {detailLoading ? (
              <p className="text-[var(--text-secondary)]">Loading bill details...</p>
            ) : detail ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  {[
                    { label: "Revenue (ex-GST)", value: formatCurrency(detail.revenue) },
                    { label: "Cost", value: formatCurrency(detail.cost) },
                    { label: "Profit", value: formatCurrency(detail.profit), highlight: true },
                    { label: "Margin", value: formatPct(detail.margin) },
                  ].map((card) => (
                    <div key={card.label} className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3">
                      <p className="text-xs text-[var(--text-secondary)]">{card.label}</p>
                      <p className={`text-lg font-bold mt-1 ${card.highlight ? "text-[var(--success)]" : "text-white"}`}>
                        {card.value}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="text-sm text-[var(--text-secondary)] mb-3 space-y-1">
                  <p>
                    <strong className="text-white">Customer:</strong> {detail.bill?.customer?.name || "-"}{" "}
                    {detail.bill?.customer?.phone ? `(${detail.bill.customer.phone})` : ""}
                  </p>
                  <p>
                    <strong className="text-white">Salesman:</strong> {detail.bill?.salesmanName || "-"}
                  </p>
                  <p>
                    <strong className="text-white">Date:</strong> {formatDate(detail.bill?.createdAt)}
                  </p>
                  <p>
                    <strong className="text-white">Bill total (incl. GST):</strong>{" "}
                    {formatCurrency(detail.bill?.totalAmount)}
                    <span className="ml-3">
                      <strong className="text-white">Payment:</strong> {detail.bill?.paymentMethod}
                    </span>
                    <span className="ml-3">
                      <strong className="text-white">Status:</strong> {detail.bill?.status}
                    </span>
                  </p>
                </div>

                <div className="flex-1 overflow-auto">
                  <table className="w-full min-w-[900px] text-sm">
                    <thead>
                      <tr className="text-left text-[var(--text-secondary)] border-b border-[var(--border)]">
                        <th className="py-2">Item</th>
                        <th>Barcode(s)</th>
                        <th>Qty</th>
                        <th>MRP</th>
                        <th>Revenue</th>
                        <th>Cost</th>
                        <th>Profit</th>
                        <th>Margin</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(detail.lines || []).map((line: any, index: number) => (
                        <tr key={`${line.barcode}-${index}`} className="border-b border-[var(--border)]/50">
                          <td className="py-2">
                            <div className="font-medium text-white">{line.name}</div>
                            <div className="text-xs text-[var(--text-secondary)]">
                              {line.category || "-"} • Size {line.size || "-"}
                            </div>
                          </td>
                          <td className="text-xs">
                            {(line.barcodes?.length ? line.barcodes : [line.barcode]).filter(Boolean).join(", ") ||
                              "-"}
                          </td>
                          <td>{line.quantity}</td>
                          <td>{formatCurrency(line.mrp)}</td>
                          <td>{formatCurrency(line.revenue)}</td>
                          <td>{formatCurrency(line.cost)}</td>
                          <td className={line.profit >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]"}>
                            {formatCurrency(line.profit)}
                          </td>
                          <td>{formatPct(line.margin)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 pt-3 border-t border-[var(--border)] text-right text-sm space-y-1">
                  <p className="text-[var(--text-secondary)]">
                    Subtotal: {formatCurrency(detail.bill?.subtotal)} • Discount: -
                    {formatCurrency(
                      Number(detail.bill?.totalItemDiscount || 0) + Number(detail.bill?.billDiscountAmount || 0)
                    )}
                  </p>
                  <p className="text-[var(--text-secondary)]">GST on bill: {formatCurrency(detail.bill?.gstAmount)}</p>
                </div>
              </>
            ) : (
              <p className="text-[var(--danger)]">Could not load bill details.</p>
            )}
          </div>
        </div>
      ) : null}
    </BillingShell>
  );
}
