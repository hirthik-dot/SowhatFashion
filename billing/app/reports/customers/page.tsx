"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import BillingShell from "@/components/layout/BillingShell";
import CustomerProfile from "@/components/reports/CustomerProfile";
import { billingApi } from "@/lib/api";
import { useRole } from "@/hooks/useRole";

const formatCurrency = (value: number) => `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const formatDate = (value?: string | Date | null) => (value ? new Date(value).toLocaleDateString("en-IN") : "-");

type SortField = "totalSpent" | "lastVisit" | "totalBills";

export default function CustomerReportsPage() {
  const router = useRouter();
  const { isAdmin } = useRole();
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [minSpend, setMinSpend] = useState("");
  const [minVisits, setMinVisits] = useState("");
  const [sortBy, setSortBy] = useState<SortField>("lastVisit");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  const [appliedQuery, setAppliedQuery] = useState("");
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [selectedPhone, setSelectedPhone] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(limit));
    params.set("sortBy", sortBy);
    params.set("sortOrder", sortOrder);
    if (search.trim()) params.set("search", search.trim());
    if (fromDate) params.set("startDate", fromDate);
    if (toDate) params.set("endDate", toDate);
    if (Number(minSpend) > 0) params.set("minSpend", String(Number(minSpend)));
    if (Number(minVisits) > 0) params.set("minVisits", String(Number(minVisits)));
    return params.toString();
  }, [page, limit, sortBy, sortOrder, search, fromDate, toDate, minSpend, minVisits]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await billingApi.reportCustomers(appliedQuery || queryString);
      setRows(data.data || []);
      setTotal(Number(data.total || 0));
      setSummary(data.summary || null);
    } catch (e: any) {
      setRows([]);
      setTotal(0);
      setSummary(null);
      setError(e.message || "Unable to load customer reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) router.push("/billing");
  }, [isAdmin, router]);

  useEffect(() => {
    load().catch(() => undefined);
  }, [page, appliedQuery]);

  const applyFilters = () => {
    setPage(1);
    const params = new URLSearchParams(queryString);
    params.set("page", "1");
    setAppliedQuery(params.toString());
  };

  const openCustomer = async (phone: string) => {
    setSelectedPhone(phone);
    setProfile(null);
    setProfileLoading(true);
    try {
      const data = await billingApi.reportCustomerProfile(phone);
      setProfile(data);
    } catch (e: any) {
      setProfile(null);
      setError(e.message || "Unable to load customer profile");
    } finally {
      setProfileLoading(false);
    }
  };

  const exportExcel = async () => {
    try {
      const exportData = await billingApi.reportCustomers(
        `${appliedQuery || queryString}&page=1&limit=10000`
      );
      const workbook = XLSX.utils.book_new();
      const sheetRows = (exportData.data || []).map((row: any) => ({
        Name: row.name || "-",
        Phone: row.phone || "-",
        "Total Bills": row.totalBills || 0,
        "Total Spent": Number(row.totalSpent || 0),
        "Avg Bill": Number(row.avgBillValue || 0),
        "Last Visit": formatDate(row.lastVisit),
        "Favourite Category": row.favouriteCategory || "-",
      }));
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(sheetRows), "Customers");
      XLSX.writeFile(workbook, `customer-report-${Date.now()}.xlsx`);
    } catch (e: any) {
      setError(e.message || "Unable to export customer report");
    }
  };

  if (!isAdmin) return null;

  return (
    <BillingShell title="Customer Reports">
      <div className="space-y-3">
        <div className="pos-card p-3 flex flex-wrap items-center gap-2">
          <div className="mr-auto">
            <h2 className="font-semibold text-lg">CUSTOMER REPORTS</h2>
            <div className="text-xs text-[var(--text-secondary)] mt-1 flex gap-3">
              <Link href="/reports" className="underline">
                📈 Overview
              </Link>
              <span className="text-[var(--gold)]">📋 Customers</span>
            </div>
          </div>
          <button className="h-10 px-3 rounded bg-[var(--gold)] text-black" onClick={exportExcel}>
            ⬇ Export Excel
          </button>
        </div>

        <div className="pos-card p-3 grid grid-cols-1 md:grid-cols-8 gap-2 items-center">
          <input
            className="pos-input md:col-span-2"
            placeholder="Search by name or phone number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applyFilters()}
          />
          <input className="pos-input" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          <input className="pos-input" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          <input
            className="pos-input"
            type="number"
            min={0}
            placeholder="Min spend"
            value={minSpend}
            onChange={(e) => setMinSpend(e.target.value)}
          />
          <input
            className="pos-input"
            type="number"
            min={0}
            placeholder="Min visits"
            value={minVisits}
            onChange={(e) => setMinVisits(e.target.value)}
          />
          <select className="pos-input" value={`${sortBy}:${sortOrder}`} onChange={(e) => {
            const [field, order] = e.target.value.split(":");
            setSortBy(field as SortField);
            setSortOrder((order as "asc" | "desc") || "desc");
          }}>
            <option value="totalSpent:desc">Total Spent ↓</option>
            <option value="totalSpent:asc">Total Spent ↑</option>
            <option value="lastVisit:desc">Last Visit ↓</option>
            <option value="lastVisit:asc">Last Visit ↑</option>
            <option value="totalBills:desc">Total Bills ↓</option>
            <option value="totalBills:asc">Total Bills ↑</option>
          </select>
          <button className="h-11 rounded border border-[var(--border)]" onClick={applyFilters}>
            Apply
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total Customers", value: summary?.totalCustomers || total || 0 },
            { label: "Today's New", value: summary?.todayNewCustomers || 0 },
            { label: "Avg Spend Per Visit", value: formatCurrency(summary?.avgSpendPerVisit || 0) },
            { label: "Repeat Customers", value: summary?.repeatCustomers || 0 },
          ].map((card) => (
            <div key={card.label} className="pos-card p-4">
              <p className="text-sm text-[var(--text-secondary)]">{card.label}</p>
              <p className="text-2xl font-bold">{card.value}</p>
            </div>
          ))}
        </div>

        <div className="pos-card p-3 overflow-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead>
              <tr className="text-left text-[var(--text-secondary)]">
                <th>Name</th>
                <th>Phone</th>
                <th>Bills</th>
                <th>Total Spent</th>
                <th>Avg Bill</th>
                <th>Last Visit</th>
                <th>Fav Category</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((customer) => (
                <tr key={customer._id} className="border-t border-[var(--border)]">
                  <td>{customer.name || "-"}</td>
                  <td>{customer.phone || "-"}</td>
                  <td>{customer.totalBills || 0}</td>
                  <td>{formatCurrency(customer.totalSpent || 0)}</td>
                  <td>{formatCurrency(customer.avgBillValue || 0)}</td>
                  <td>{formatDate(customer.lastVisit)}</td>
                  <td>{customer.favouriteCategory || "-"}</td>
                  <td>
                    <button className="underline" onClick={() => openCustomer(customer.phone)}>
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {loading ? <p className="text-sm mt-2 text-[var(--text-secondary)]">Loading...</p> : null}
          {!loading && !rows.length ? <p className="text-sm mt-2 text-[var(--text-secondary)]">No customers found.</p> : null}
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

      <CustomerProfile
        open={Boolean(selectedPhone)}
        loading={profileLoading}
        profile={profile}
        onClose={() => {
          setSelectedPhone("");
          setProfile(null);
          setProfileLoading(false);
        }}
      />
    </BillingShell>
  );
}
