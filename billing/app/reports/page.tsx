"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BillingShell from "@/components/layout/BillingShell";
import { billingApi } from "@/lib/api";
import { Cell, Pie, PieChart, BarChart, CartesianGrid, XAxis, YAxis, Tooltip as ChartTooltip, Bar, ResponsiveContainer } from "recharts";
import * as XLSX from "xlsx";
import { useRole } from "@/hooks/useRole";

export default function ReportsPage() {
  const router = useRouter();
  const { can } = useRole();
  const canAccess = can("canViewReports");
  const [activeTab, setActiveTab] = useState<"sales" | "profit">("sales");
  
  // Sales Tab State
  const [summary, setSummary] = useState<any>(null);
  const [period, setPeriod] = useState<"today" | "week" | "month" | "custom">("today");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [bills, setBills] = useState<any[]>([]);
  const [salesPage, setSalesPage] = useState(1);
  const [salesTotal, setSalesTotal] = useState(0);
  const [selectedBill, setSelectedBill] = useState<any>(null);
  const [salesSearch, setSalesSearch] = useState("");

  // Profit Tab State
  const [profitData, setProfitData] = useState<any[]>([]);
  const [profitSummary, setProfitSummary] = useState<any>(null);
  const [profitPage, setProfitPage] = useState(1);
  const [profitTotal, setProfitTotal] = useState(0);
  const [profitSort, setProfitSort] = useState<'recentSales' | 'entryDate'>('recentSales');
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [profitSupplierId, setProfitSupplierId] = useState("");
  const [supplierPurchaseSummary, setSupplierPurchaseSummary] = useState<any[]>([]);
  const [profitPeriod, setProfitPeriod] = useState<"all" | "today" | "week" | "month" | "custom">("all");
  const [profitFrom, setProfitFrom] = useState("");
  const [profitTo, setProfitTo] = useState("");
  const [profitSearch, setProfitSearch] = useState("");

  const getProfitDateRange = () => {
    if (profitPeriod === "all") return { start: "", end: "" };
    const now = new Date();
    if (profitPeriod === "today") {
      const day = now.toISOString().slice(0, 10);
      return { start: day, end: day };
    }
    if (profitPeriod === "week") {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - 6);
      return { start: weekStart.toISOString().slice(0, 10), end: now.toISOString().slice(0, 10) };
    }
    if (profitPeriod === "month") {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: monthStart.toISOString().slice(0, 10), end: now.toISOString().slice(0, 10) };
    }
    return { start: profitFrom, end: profitTo };
  };

  const profitDateRange = getProfitDateRange();
  const profitDateFilterActive = Boolean(profitDateRange.start || profitDateRange.end);

  const loadSales = async (currentPage = 1) => {
    const now = new Date();
    let start = "";
    let end = "";
    if (period === "today") {
      start = now.toISOString().slice(0, 10);
      end = start;
    } else if (period === "week") {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - 6);
      start = weekStart.toISOString().slice(0, 10);
      end = now.toISOString().slice(0, 10);
    } else if (period === "month") {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      start = monthStart.toISOString().slice(0, 10);
      end = now.toISOString().slice(0, 10);
    } else {
      start = from;
      end = to;
    }
    try {
      const billParams = new URLSearchParams({ page: String(currentPage), limit: '20', startDate: start, endDate: end });
      if (salesSearch.trim()) billParams.set('search', salesSearch.trim());
      const [summaryData, billsData] = await Promise.all([
        billingApi.reportSummary(start, end),
        billingApi.reportBills(billParams.toString()),
      ]);
      setSummary(summaryData);
      setBills(billsData.data || []);
      setSalesTotal(billsData.total || 0);
    } catch {
      setSummary(null);
      setBills([]);
    }
  };

  const loadProfit = async (
    currentPage = 1,
    sort: string = profitSort,
    supplierId: string = profitSupplierId,
    startDate: string = profitDateRange.start,
    endDate: string = profitDateRange.end,
    search: string = profitSearch
  ) => {
    try {
      const res = await billingApi.reportProfit(currentPage, sort, supplierId, startDate, endDate, search);
      setProfitData(res.data || []);
      setProfitSummary(res.summary || null);
      setProfitTotal(res.total || 0);
    } catch {
      setProfitData([]);
      setProfitSummary(null);
    }
  };

  const loadSupplierPurchaseSummary = async (
    startDate: string = profitDateRange.start,
    endDate: string = profitDateRange.end
  ) => {
    try {
      const res = await billingApi.reportProfitSupplierSummary(startDate, endDate);
      setSupplierPurchaseSummary(res.data || []);
    } catch {
      setSupplierPurchaseSummary([]);
    }
  };

  useEffect(() => {
    if (!canAccess) router.push("/billing");
  }, [canAccess, router]);

  useEffect(() => {
    if (activeTab !== "profit") return;
    billingApi.suppliers().then(setSuppliers).catch(() => setSuppliers([]));
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === "sales") {
      loadSales(salesPage);
    } else {
      loadSupplierPurchaseSummary(profitDateRange.start, profitDateRange.end);
      loadProfit(profitPage, profitSort, profitSupplierId, profitDateRange.start, profitDateRange.end, profitSearch);
    }
  }, [
    activeTab,
    period,
    from,
    to,
    salesPage,
    salesSearch,
    profitPage,
    profitSort,
    profitSupplierId,
    profitPeriod,
    profitFrom,
    profitTo,
    profitSearch,
  ]);

  const exportSalesExcel = () => {
    const workbook = XLSX.utils.book_new();
    const summarySheet = XLSX.utils.json_to_sheet([{
      Revenue: summary?.totalRevenue || 0,
      "Points Cost": summary?.totalPointsCost || 0,
      "Points Redeemed": summary?.totalPointsRedeemed || 0,
      "Cash Collected": summary?.totalCashCollected || 0,
      Bills: summary?.totalBills || 0,
      Items: summary?.totalItems || 0,
      Returns: summary?.totalReturns || 0,
      Discount: summary?.totalDiscount || 0,
      "Taxable (ex-GST)": summary?.totalTaxable || 0,
      CGST: summary?.totalCgst || 0,
      SGST: summary?.totalSgst || 0,
      "Total GST": summary?.totalGst || 0,
    }]);
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");
    const billsSheet = XLSX.utils.json_to_sheet(
      bills.map((bill) => ({
        Bill: bill.billNumber,
        Date: new Date(bill.createdAt).toLocaleString(),
        Customer: bill.customer?.name,
        Phone: bill.customer?.phone,
        Salesman: bill.salesmanName || bill.salesman?.name || "",
        Items: bill.items?.length || 0,
        Subtotal: bill.subtotal,
        Discount: (bill.totalItemDiscount || 0) + (bill.billDiscountAmount || 0),
        GST: bill.gstAmount,
        PointsRedeemed: Number(bill.pointsRedeemed || 0),
        PointsCost: Number(bill.pointsDiscountAmount || 0),
        CashCollected: Number(bill.totalAmount || 0),
        Total: bill.totalAmount,
        Payment: bill.paymentMethod,
        Status: bill.status,
      }))
    );
    XLSX.utils.book_append_sheet(workbook, billsSheet, "Bills");
    const items = bills.flatMap((bill) =>
      (bill.items || []).map((item: any) => ({
        Bill: bill.billNumber,
        Date: new Date(bill.createdAt).toLocaleString(),
        Barcode: item.barcode,
        Product: item.name,
        Category: item.category,
        Size: item.size,
        MRP: item.mrp,
        Discount: item.itemDiscountAmount,
        SellingPrice: item.sellingPrice,
        Qty: item.quantity,
        LineTotal: item.lineTotal,
      }))
    );
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(items), "Items");
    const salesmanMap: Record<string, any> = {};
    bills.forEach((bill) => {
      const key = bill.salesmanName || "Unknown";
      if (!salesmanMap[key]) salesmanMap[key] = { Name: key, Bills: 0, Revenue: 0, AvgBill: 0, Returns: 0, GSTCollected: 0 };
      salesmanMap[key].Bills += 1;
      salesmanMap[key].Revenue += billExGst(bill);
      salesmanMap[key].GSTCollected += Number(bill.gstAmount || 0);
      if (bill.status?.includes("return")) salesmanMap[key].Returns += 1;
    });
    Object.values(salesmanMap).forEach((row: any) => {
      row.AvgBill = row.Bills ? row.Revenue / row.Bills : 0;
    });
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(Object.values(salesmanMap)), "Salesmen");
    XLSX.writeFile(workbook, `sales-report-${Date.now()}.xlsx`);
  };

  const exportProfitExcel = async () => {
    try {
      const params = new URLSearchParams();
      if (profitSupplierId) params.set("supplier", profitSupplierId);
      if (profitDateRange.start) params.set("startDate", profitDateRange.start);
      if (profitDateRange.end) params.set("endDate", profitDateRange.end);
      const qs = params.toString();
      const url = `${process.env.NEXT_PUBLIC_API_URL || ""}/api/billing/reports/profit/export${qs ? `?${qs}` : ""}`;
      const res = await fetch(url, { credentials: "include" });
      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `profit-report-${Date.now()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error("Failed to export profit report", err);
      alert("Failed to export profit report");
    }
  };

  const paymentData = Object.entries(summary?.paymentMethodBreakdown || {}).map(([name, value]) => ({ name, value }));
  const categoryData = Object.entries(summary?.categoryBreakdown || {}).map(([name, value]) => ({ name, value }));
  const billExGst = (bill: any) =>
    Math.max(
      0,
      Number(bill.subtotal || 0) - Number(bill.totalItemDiscount || 0) - Number(bill.billDiscountAmount || 0)
    );
  const revenueBars = (summary?.dailyRevenue || []).length
    ? (summary.dailyRevenue || []).map((row: any) => ({
        label: row.label || row.day || "",
        value: Number(row.value || 0),
      }))
    : bills.map((bill) => ({ label: new Date(bill.createdAt).toLocaleDateString(), value: billExGst(bill) }));
  const topProducts = Object.values(
    bills.flatMap((bill) => bill.items || []).reduce((acc: any, item: any) => {
      const key = `${item.name}-${item.category || ""}`;
      if (!acc[key]) acc[key] = { product: item.name, category: item.category || "-", qty: 0, revenue: 0, returns: 0 };
      acc[key].qty += Number(item.quantity || 0);
      acc[key].revenue += Number(item.netLineTotal ?? item.lineTotal ?? 0);
      return acc;
    }, {})
  )
    .sort((a: any, b: any) => b.revenue - a.revenue)
    .slice(0, 10);
  const salesmanRows = Object.values(
    bills.reduce((acc: any, bill: any) => {
      const key = bill.salesmanName || "Unknown";
      if (!acc[key]) acc[key] = { name: key, bills: 0, revenue: 0, avg: 0, returns: 0, bestDay: "-" };
      acc[key].bills += 1;
      acc[key].revenue += billExGst(bill);
      if (bill.status?.includes("return")) acc[key].returns += 1;
      const day = new Date(bill.createdAt).toLocaleDateString(undefined, { weekday: "short" });
      acc[key].bestDay = day;
      return acc;
    }, {})
  ).map((row: any) => ({ ...row, avg: row.bills ? row.revenue / row.bills : 0 }));

  const selectedProfitSupplier = suppliers.find((s) => String(s._id) === profitSupplierId);

  const getBatchLabel = (batch: any) => {
    const rawId = String(batch?._id || "").toUpperCase();
    const idPart = rawId ? rawId.slice(-4) : "NA";
    const entryDate = batch?.entryDate ? new Date(batch.entryDate) : null;
    if (!entryDate || Number.isNaN(entryDate.getTime())) return `BATCH-${idPart}`;
    const y = entryDate.getFullYear();
    const m = String(entryDate.getMonth() + 1).padStart(2, "0");
    const d = String(entryDate.getDate()).padStart(2, "0");
    return `BATCH-${y}${m}${d}-${idPart}`;
  };

  if (!canAccess) return null;

  return (
    <BillingShell title="Business Reports">
      <div className="space-y-4">
        {/* Navigation Tabs */}
        <div className="flex border-b border-[var(--border)] overflow-x-auto gap-1">
          <button
            onClick={() => setActiveTab("sales")}
            className={`px-6 py-3 font-semibold whitespace-nowrap transition-colors border-b-2 ${activeTab === "sales" ? "border-[var(--gold)] text-[var(--gold)]" : "border-transparent text-[var(--text-secondary)] hover:text-white"}`}
          >
            📊 Sales & Revenue
          </button>
          <button
            onClick={() => setActiveTab("profit")}
            className={`px-6 py-3 font-semibold whitespace-nowrap transition-colors border-b-2 ${activeTab === "profit" ? "border-[var(--gold)] text-[var(--gold)]" : "border-transparent text-[var(--text-secondary)] hover:text-white"}`}
          >
            💰 Purchases & Profit Batch
          </button>
        </div>

        {activeTab === "sales" && (
          <div className="space-y-3 animate-fade-in">
            <div className="pos-card p-3 flex flex-wrap gap-2 items-center">
              <div className="w-full text-xs text-[var(--text-secondary)] flex flex-wrap gap-3 pb-1">
                <span className="text-[var(--gold)] font-semibold">📈 Overview</span>
                <a href="#tax-overview" className="text-[var(--gold)] font-semibold underline">
                  🧾 Tax
                </a>
                <Link href="/reports/customers" className="underline">
                  📋 Customers
                </Link>
                <Link href="/reports/bill-profit" className="underline">
                  💰 Bill Wise Profit
                </Link>
              </div>
              <input
                className="pos-input w-full sm:min-w-[220px] flex-1"
                placeholder="Search by bill number, customer name, phone..."
                value={salesSearch}
                onChange={(e) => setSalesSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { setSalesPage(1); loadSales(1); } }}
              />
              {[
                { id: "today", label: "Today" },
                { id: "week", label: "This Week" },
                { id: "month", label: "This Month" },
                { id: "custom", label: "Custom" },
              ].map((p) => (
                <button key={p.id} onClick={() => setPeriod(p.id as any)} className={`h-10 px-3 rounded border ${period === p.id ? "border-[var(--gold)] text-[var(--gold)]" : "border-[var(--border)]"}`}>{p.label}</button>
              ))}
              <input className="pos-input h-10 min-h-0" type="date" value={from} onChange={(e) => setFrom(e.target.value)} disabled={period !== "custom"} />
              <input className="pos-input h-10 min-h-0" type="date" value={to} onChange={(e) => setTo(e.target.value)} disabled={period !== "custom"} />
              <button className="h-10 px-3 rounded bg-[var(--gold)] text-black font-semibold" onClick={() => { setSalesPage(1); loadSales(1); }}>Apply Filters</button>
              <button className="h-10 px-3 rounded bg-[var(--gold)] text-black sm:ml-auto font-semibold shadow-sm hover:opacity-90 w-full sm:w-auto" onClick={exportSalesExcel}>⬇ Export Sales Excel</button>
            </div>

            <section id="tax-overview" className="pos-card p-4 border-2 border-[var(--gold)] bg-[var(--surface-2)]">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <h3 className="text-lg font-bold text-[var(--gold)]">🧾 Tax Overview (GST 5%)</h3>
                <span className="text-xs text-[var(--text-secondary)]">5% GST added on MRP subtotal (before shop discounts)</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "Taxable (ex-GST)", value: `₹${Number(summary?.totalTaxable || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
                  { label: "CGST (2.5%)", value: `₹${Number(summary?.totalCgst || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
                  { label: "SGST (2.5%)", value: `₹${Number(summary?.totalSgst || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
                  { label: "Total GST", value: `₹${Number(summary?.totalGst || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
                ].map((card) => (
                  <div key={card.label} className="rounded-lg border border-[var(--gold)]/40 bg-[var(--surface)] p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">{card.label}</p>
                    <p className="text-2xl font-black text-white mt-2">{card.value}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-3">
                Example: MRP ₹100 + GST ₹5 = ₹105, then shop discount is subtracted from ₹105.
              </p>
            </section>
            
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
              {[
                { label: "Revenue (ex-GST)", value: `₹${Math.round(summary?.totalRevenue || 0)}` },
                { label: "Points Cost", value: `₹${Math.round(summary?.totalPointsCost || 0)}` },
                { label: "Cash Collected", value: `₹${Math.round(summary?.totalCashCollected || 0)}` },
                { label: "Bills", value: summary?.totalBills || 0 },
                { label: "Items Sold", value: summary?.totalItems || 0 },
                { label: "Returns", value: summary?.totalReturns || 0 },
              ].map((card) => (
                <div key={card.label} className="pos-card p-4">
                  <p className="text-sm text-[var(--text-secondary)]">{card.label}</p>
                  <p className="text-2xl font-bold text-white">{card.value}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
              <div className="pos-card p-3 h-[320px] overflow-x-auto">
                <p className="mb-2 font-medium">Revenue Over Time</p>
                <div className="min-w-[520px] h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={revenueBars}>
                      <CartesianGrid stroke="#2E3347" />
                      <XAxis dataKey="label" stroke="#F5F5F5" />
                      <YAxis stroke="#F5F5F5" />
                      <ChartTooltip />
                      <Bar dataKey="value" fill="#C9A84C" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="pos-card p-3 h-[320px]">
                <p className="mb-2 font-medium">Payment Methods</p>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={paymentData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90}>
                      {paymentData.map((entry, index) => (
                        <Cell key={entry.name} fill={["#C9A84C", "#22C55E", "#3B82F6", "#8B5CF6"][index % 4]} />
                      ))}
                    </Pie>
                    <ChartTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Other Sales content... */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
              <div className="pos-card p-3 overflow-auto">
                <p className="mb-2 font-medium">All Bills</p>
                <table className="w-full min-w-[920px] text-sm">
                  <thead><tr className="text-left text-[var(--text-secondary)]"><th>Bill#</th><th>Customer</th><th>Salesman</th><th>Items</th><th>Points Cost</th><th>Cash</th><th>Payment</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>
                    {bills.map((bill) => (
                      <tr key={bill._id} className="border-t border-[var(--border)] group hover:bg-[var(--surface-2)]">
                        <td className="py-2">{bill.billNumber}</td><td>{bill.customer?.name}</td><td>{bill.salesmanName || "-"}</td><td>{bill.items?.length || 0}</td><td>{Number(bill.pointsDiscountAmount || 0) > 0 ? `₹${bill.pointsDiscountAmount}` : "-"}</td><td className="font-semibold text-[var(--gold)]">₹{bill.totalAmount}</td><td>{bill.paymentMethod}</td><td>{bill.status}</td>
                        <td><button className="text-[var(--info)] hover:underline" onClick={() => setSelectedBill(bill)}>View</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex flex-col sm:flex-row sm:justify-between gap-2 mt-3 text-sm">
                   <div className="text-[var(--text-secondary)]">Total: {salesTotal} bills</div>
                   <div className="flex gap-2">
                     <button className="px-3 rounded border border-[var(--border)]" onClick={() => setSalesPage((p) => Math.max(1, p - 1))}>Prev</button>
                     <span className="self-center">Page {salesPage} / {Math.max(1, Math.ceil(salesTotal / 20))}</span>
                     <button className="px-3 rounded border border-[var(--border)]" onClick={() => setSalesPage((p) => p + 1)}>Next</button>
                   </div>
                </div>
              </div>

              <div className="pos-card p-3 overflow-auto">
                <p className="mb-2 font-medium">Category Breakdown</p>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={categoryData} dataKey="value" nameKey="name" outerRadius={100}>
                      {categoryData.map((entry, index) => (
                        <Cell key={entry.name} fill={["#F59E0B", "#10B981", "#3B82F6", "#EC4899", "#A78BFA"][index % 5]} />
                      ))}
                    </Pie>
                    <ChartTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {activeTab === "profit" && (
          <div className="space-y-4 animate-fade-in">
            {/* Profit Tab Header */}
            <div className="pos-card p-4 flex flex-wrap gap-4 items-center justify-between">
              <div>
                <div className="text-xs text-[var(--text-secondary)] flex flex-wrap gap-3 mb-2">
                  <Link href="/reports" className="underline">
                    📈 Overview
                  </Link>
                  <Link href="/reports/customers" className="underline">
                    📋 Customers
                  </Link>
                  <Link href="/reports/bill-profit" className="underline text-[var(--gold)]">
                    💰 Bill Wise Profit
                  </Link>
                </div>
                <h3 className="font-bold text-lg text-white">
                  {profitSupplierId && selectedProfitSupplier
                    ? `Purchases from ${selectedProfitSupplier.name}`
                    : "Stock Batch & Profit Margin"}
                </h3>
                <p className="text-sm text-[var(--text-secondary)]">
                  {profitSupplierId
                    ? "Showing purchase batches and sales performance for this supplier only."
                    : "Revenue and profit use MRP after discounts only — GST is excluded (see Tax Overview on Sales tab)."}
                  {profitDateFilterActive && (
                    <>
                      {" "}
                      Purchase entry dates:{" "}
                      <span className="text-white">
                        {profitDateRange.start || "…"} — {profitDateRange.end || "…"}
                      </span>
                    </>
                  )}
                </p>
              </div>
              <div className="flex flex-wrap items-end gap-2 ml-auto">
                <input
                  className="pos-input w-full sm:min-w-[220px] flex-1"
                  placeholder="Search by product name, batch, size..."
                  value={profitSearch}
                  onChange={(e) => setProfitSearch(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { setProfitPage(1); loadProfit(1, profitSort, profitSupplierId, profitDateRange.start, profitDateRange.end, profitSearch); } }}
                />
                <div className="flex flex-wrap gap-1 items-center">
                  {[
                    { id: "all", label: "All time" },
                    { id: "today", label: "Today" },
                    { id: "week", label: "This week" },
                    { id: "month", label: "This month" },
                    { id: "custom", label: "Custom" },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setProfitPeriod(p.id as typeof profitPeriod);
                        setProfitPage(1);
                      }}
                      className={`h-10 px-3 rounded border text-sm whitespace-nowrap ${
                        profitPeriod === p.id
                          ? "border-[var(--gold)] text-[var(--gold)]"
                          : "border-[var(--border)] text-[var(--text-secondary)]"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                  <input
                    className="pos-input h-10 min-h-0 w-[140px]"
                    type="date"
                    value={profitFrom}
                    onChange={(e) => {
                      setProfitFrom(e.target.value);
                      setProfitPeriod("custom");
                      setProfitPage(1);
                    }}
                    disabled={profitPeriod !== "custom"}
                    aria-label="Purchase from date"
                  />
                  <span className="text-[var(--text-secondary)] text-sm self-center">to</span>
                  <input
                    className="pos-input h-10 min-h-0 w-[140px]"
                    type="date"
                    value={profitTo}
                    onChange={(e) => {
                      setProfitTo(e.target.value);
                      setProfitPeriod("custom");
                      setProfitPage(1);
                    }}
                    disabled={profitPeriod !== "custom"}
                    aria-label="Purchase to date"
                  />
                </div>
                <label className="flex flex-col gap-1 text-xs text-[var(--text-secondary)]">
                  Supplier
                  <select
                    className="pos-input h-10 min-h-0 min-w-[200px] text-sm text-white"
                    value={profitSupplierId}
                    onChange={(e) => {
                      setProfitSupplierId(e.target.value);
                      setProfitPage(1);
                    }}
                  >
                    <option value="">All suppliers</option>
                    {suppliers.map((supplier) => (
                      <option key={supplier._id} value={supplier._id}>
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="flex rounded border border-[var(--border)] overflow-hidden text-sm">
                  <button
                    onClick={() => { setProfitSort('recentSales'); setProfitPage(1); }}
                    className={`px-4 py-2 font-semibold transition-colors ${profitSort === 'recentSales' ? 'bg-[var(--gold)] text-black' : 'text-[var(--text-secondary)] hover:text-white'}`}
                  >
                    🕒 Recent Sales
                  </button>
                  <button
                    onClick={() => { setProfitSort('entryDate'); setProfitPage(1); }}
                    className={`px-4 py-2 font-semibold transition-colors ${profitSort === 'entryDate' ? 'bg-[var(--gold)] text-black' : 'text-[var(--text-secondary)] hover:text-white'}`}
                  >
                    📅 Entry Date
                  </button>
                </div>
                <button
                  className="h-10 px-4 rounded bg-[var(--gold)] text-black font-semibold"
                  onClick={() => { setProfitPage(1); loadProfit(1, profitSort, profitSupplierId, profitDateRange.start, profitDateRange.end, profitSearch); }}
                >
                  Apply Filters
                </button>
                <button className="h-11 px-6 rounded bg-[var(--success)] text-white font-bold shadow-sm hover:opacity-90 flex items-center gap-2" onClick={exportProfitExcel}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Export Profit Excel
                </button>
              </div>
            </div>

            {!profitSupplierId && supplierPurchaseSummary.length > 0 && (
              <div className="pos-card p-4 overflow-x-auto">
                <h4 className="font-bold mb-1 text-white">
                  Purchases by Supplier
                  {profitDateFilterActive ? " (selected period)" : ""}
                </h4>
                <p className="text-sm text-[var(--text-secondary)] mb-4">
                  {profitDateFilterActive
                    ? "Totals for stock brought in during the selected entry-date range. Tap a row to drill down."
                    : "Tap a row or use the filter above to see that supplier's full purchase batch list."}
                </p>
                <table className="w-full min-w-[900px] text-sm text-left">
                  <thead>
                    <tr className="border-b border-[var(--border)] text-[var(--text-secondary)] text-xs uppercase bg-[var(--surface-2)]">
                      <th className="p-3 font-semibold rounded-tl-lg">Supplier</th>
                      <th className="p-3 font-semibold text-right">Batches</th>
                      <th className="p-3 font-semibold text-right">Qty Purchased</th>
                      <th className="p-3 font-semibold text-right">Capital Invested</th>
                      <th className="p-3 font-semibold text-right">Qty Sold</th>
                      <th className="p-3 font-semibold text-right">Revenue (ex-GST)</th>
                      <th className="p-3 font-semibold text-right rounded-tr-lg">Realized Profit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {supplierPurchaseSummary.map((row: any) => (
                      <tr
                        key={String(row.supplierId)}
                        className="hover:bg-[var(--surface-2)] cursor-pointer transition-colors"
                        onClick={() => {
                          setProfitSupplierId(String(row.supplierId));
                          setProfitPage(1);
                        }}
                      >
                        <td className="p-3 font-semibold text-white">{row.supplierName}</td>
                        <td className="p-3 text-right">{row.batchCount}</td>
                        <td className="p-3 text-right">{row.unitsPurchased}</td>
                        <td className="p-3 text-right text-[var(--warning)]">
                          ₹{Number(row.totalInvestment || 0).toLocaleString()}
                        </td>
                        <td className="p-3 text-right">
                          {row.unitsSold}{" "}
                          <span className="text-[10px] text-gray-500">/ {row.unitsPurchased}</span>
                        </td>
                        <td className="p-3 text-right text-blue-400">
                          ₹{Number(row.soldRevenue || 0).toLocaleString()}
                        </td>
                        <td
                          className={`p-3 text-right font-bold ${
                            row.realizedProfit > 0
                              ? "text-[var(--success)]"
                              : row.realizedProfit < 0
                                ? "text-red-400"
                                : "text-[var(--text-secondary)]"
                          }`}
                        >
                          ₹{Number(row.realizedProfit || 0).toLocaleString()}
                          <span className="block text-[10px] font-normal text-gray-500">
                            {Number(row.profitMargin || 0).toFixed(1)}% margin
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Profit Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="pos-card p-4 border-l-4 border-l-[var(--info)]">
                <p className="text-xs font-bold text-[var(--text-secondary)] uppercase">
                  {profitDateFilterActive ? "Inventory Sourced (period)" : "Total Inventory Sourced"}
                </p>
                <p className="text-2xl font-black mt-1 text-white">{profitSummary?.overallPurchased || 0} <span className="text-sm font-normal text-gray-400">units</span></p>
              </div>
              <div className="pos-card p-4 border-l-4 border-l-[var(--warning)]">
                <p className="text-xs font-bold text-[var(--text-secondary)] uppercase">
                  {profitDateFilterActive ? "Capital Invested (period)" : "Total Capital Invested"}
                </p>
                <p className="text-2xl font-black mt-1 text-white">₹{(profitSummary?.totalInvestment || 0).toLocaleString()}</p>
              </div>
               <div className="pos-card p-4 border-l-4 border-l-blue-400">
                <p className="text-xs font-bold text-[var(--text-secondary)] uppercase">Total Realized Revenue (ex-GST)</p>
                <p className="text-2xl font-black mt-1 text-white">₹{(profitSummary?.totalSoldRevenue || 0).toLocaleString()}</p>
                <p className="text-xs mt-1 text-blue-400">{profitSummary?.overallSold || 0} units sold</p>
              </div>
              <div className="pos-card p-4 border-l-4 border-l-[var(--success)]">
                <p className="text-xs font-bold text-[var(--text-secondary)] uppercase">Overall Profit Generated</p>
                <p className="text-2xl font-black mt-1 text-[var(--success)]">₹{(profitSummary?.totalRealizedProfit || 0).toLocaleString()}</p>
                <p className="text-xs mt-1 font-semibold text-green-400">{(profitSummary?.profitMargin || 0).toFixed(1)}% Margin</p>
              </div>
            </div>

            {/* Detailed Batch Table */}
            <div className="pos-card p-4 overflow-x-auto">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <h4 className="font-bold text-white">
                  {profitSupplierId && selectedProfitSupplier
                    ? `${selectedProfitSupplier.name} — Purchase Batches`
                    : "Batch-wise Purchasing & Sales Data"}
                </h4>
                {profitSupplierId ? (
                  <button
                    type="button"
                    className="text-sm text-[var(--gold)] underline"
                    onClick={() => {
                      setProfitSupplierId("");
                      setProfitPage(1);
                    }}
                  >
                    ← Show all suppliers
                  </button>
                ) : null}
              </div>
              <table className="w-full min-w-[1200px] text-sm text-left">
                <thead>
                  <tr className="border-b border-[var(--border)] text-[var(--text-secondary)] text-xs uppercase bg-[var(--surface-2)]">
                    <th className="p-3 font-semibold rounded-tl-lg">Entry Date</th>
                    <th className="p-3 font-semibold">Product / Detail</th>
                    <th className="p-3 font-semibold text-right">Qty IN</th>
                    <th className="p-3 font-semibold text-right">Cost Price</th>
                    <th className="p-3 font-semibold text-right border-r border-[var(--border)]">Invested</th>
                    <th className="p-3 font-semibold text-right text-blue-400 bg-blue-900/10">Qty Sold</th>
                    <th className="p-3 font-semibold text-right text-blue-400 bg-blue-900/10">Sell Price</th>
                    <th className="p-3 font-semibold text-right text-red-400 bg-blue-900/10">Discount</th>
                    <th className="p-3 font-semibold text-right text-blue-400 bg-blue-900/10">Revenue (ex-GST)</th>
                    <th className="p-3 font-semibold text-right text-[var(--success)] bg-green-900/10 rounded-tr-lg">Realized Profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {profitData.map((batch: any) => {
                     const isProfitable = batch.realizedProfit > 0;
                     const isLoss = batch.realizedProfit < 0;
                     return (
                      <tr key={batch._id} className="hover:bg-[var(--surface-2)] transition-colors group">
                        <td className="p-3 text-[var(--text-secondary)]">
                          {new Date(batch.entryDate).toLocaleDateString()}
                          {batch.lastSoldDate && (
                            <p className="text-[10px] text-green-400 mt-0.5">Last sold: {new Date(batch.lastSoldDate).toLocaleDateString()}</p>
                          )}
                        </td>
                        <td className="p-3">
                          <p className="font-semibold text-white">{batch.productName || 'Unnamed Asset'}</p>
                          <p className="text-xs text-[var(--text-secondary)] mt-0.5">{batch.supplierName} • {batch.categoryName}</p>
                          <p className="text-xs text-[var(--text-secondary)] mt-1">
                            Batch: <span className="text-white">{getBatchLabel(batch)}</span>
                            {" • "}
                            Size: <span className="text-white">{batch.size || "-"}</span>
                          </p>
                        </td>
                        <td className="p-3 text-right font-medium">{batch.quantity}</td>
                        <td className="p-3 text-right text-[var(--warning)]">₹{batch.incomingPrice}</td>
                        <td className="p-3 text-right border-r border-[var(--border)]">₹{(batch.quantity * batch.incomingPrice).toLocaleString()}</td>
                        
                        <td className="p-3 text-right text-white font-medium bg-blue-900/5">{batch.qtySold} <span className="text-[10px] text-gray-500">/ {batch.quantity}</span></td>
                        <td className="p-3 text-right text-blue-300 bg-blue-900/5">₹{batch.sellingPrice}</td>
                        <td className="p-3 text-right text-red-300 bg-blue-900/5">₹{(batch.soldDiscount || 0).toLocaleString()}</td>
                        <td className="p-3 text-right text-blue-400 font-semibold bg-blue-900/5">₹{(batch.soldRevenue || 0).toLocaleString()}</td>
                        
                        <td className={`p-3 text-right font-bold bg-green-900/5 ${isProfitable ? 'text-[var(--success)]' : isLoss ? 'text-red-400' : 'text-[var(--text-secondary)]'}`}>
                          {isProfitable && '+'}{isLoss && '-'}₹{Math.abs(batch.realizedProfit || 0).toLocaleString()}
                        </td>
                      </tr>
                    )
                  })}
                  {profitData.length === 0 && (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-[var(--text-secondary)]">No batch data available for cost & profit calculation.</td>
                    </tr>
                  )}
                </tbody>
              </table>

              <div className="flex flex-col sm:flex-row sm:justify-between gap-2 mt-4 text-sm px-2 border-t border-[var(--border)] pt-4">
                 <div className="text-[var(--text-secondary)]">
                   {profitDateFilterActive
                     ? `${profitTotal} batch${profitTotal === 1 ? "" : "es"} in selected period`
                     : `Total: ${profitTotal} batches recorded`}
                 </div>
                 <div className="flex gap-2">
                   <button 
                     disabled={profitPage === 1}
                     className="px-3 py-1 rounded border border-[var(--border)] disabled:opacity-50 hover:bg-[var(--surface-2)]" 
                     onClick={() => setProfitPage((p) => Math.max(1, p - 1))}>
                     Prev
                   </button>
                   <span className="self-center font-medium bg-[var(--surface-2)] px-3 py-1 rounded">Page {profitPage} / {Math.max(1, Math.ceil(profitTotal / 20))}</span>
                   <button 
                     disabled={profitPage >= Math.ceil(profitTotal / 20)}
                     className="px-3 py-1 rounded border border-[var(--border)] disabled:opacity-50 hover:bg-[var(--surface-2)]" 
                     onClick={() => setProfitPage((p) => p + 1)}>
                     Next
                   </button>
                 </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {selectedBill ? (
        <div className="fixed inset-0 bg-black/70 z-50 grid place-items-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="pos-card p-6 w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl border border-[var(--border)]">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-[var(--border)]">
              <h3 className="font-bold text-lg text-white">Bill Receipt - <span className="text-[var(--gold)]">{selectedBill.billNumber}</span></h3>
              <button 
                className="text-[var(--text-secondary)] hover:text-white bg-[var(--surface-2)] p-2 rounded-full transition-colors"
                onClick={() => setSelectedBill(null)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="space-y-1 mb-4 text-sm text-[var(--text-secondary)]">
               <p><strong className="text-white">Customer:</strong> {selectedBill.customer?.name} {selectedBill.customer?.phone && `(${selectedBill.customer.phone})`}</p>
               <p><strong className="text-white">Sales Associate:</strong> {selectedBill.salesmanName || "None"}</p>
               <p><strong className="text-white">Date:</strong> {new Date(selectedBill.createdAt).toLocaleString()}</p>
            </div>
            
            <p className="font-bold mb-2 text-white uppercase text-xs tracking-wider">Purchased Items ({selectedBill.items?.length || 0})</p>
            <div className="flex-1 overflow-auto bg-[var(--surface-2)] rounded-lg p-2 border border-[var(--border)]">
              {(selectedBill.items || []).map((item: any, index: number) => (
                <div key={`${item.barcode}-${index}`} className="p-3 border-b last:border-b-0 border-[var(--border)] bg-[var(--surface)] mb-2 rounded border border-[var(--border)]/50">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-white">{item.name}</p>
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5">Barcode: {item.barcode || "N/A"} • Size: <span className="text-white bg-[var(--surface-2)] px-1.5 py-0.5 rounded text-[10px]">{item.size || "-"}</span></p>
                    </div>
                    <div className="text-right">
                       <p className="font-bold text-[var(--gold)]">₹{item.lineTotal?.toLocaleString()}</p>
                       <p className="text-xs text-[var(--text-secondary)]">{item.quantity} × ₹{item.sellingPrice}</p>
                    </div>
                  </div>
                  {item.itemDiscountAmount > 0 && <p className="text-xs text-[var(--success)] mt-2">Discount Applied: ₹{item.itemDiscountAmount}</p>}
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-[var(--border)] text-right space-y-1">
              <p className="text-[var(--text-secondary)]">Subtotal: ₹{selectedBill.subtotal?.toLocaleString()}</p>
              <p className="text-[var(--success)]">Discount: -₹{((selectedBill.totalItemDiscount || 0) + (selectedBill.billDiscountAmount || 0)).toLocaleString()}</p>
              {Number(selectedBill.pointsDiscountAmount || 0) > 0 ? (
                <p className="text-orange-300">
                  Points ({Number(selectedBill.pointsRedeemed || 0)} pts): -₹{Number(selectedBill.pointsDiscountAmount).toLocaleString()}
                </p>
              ) : null}
              <p className="text-[var(--text-secondary)]">
                MRP ₹{Number(selectedBill.subtotal || 0).toLocaleString()} + GST 5% ₹
                {(
                  Number(selectedBill.gstAmount || 0) > 0
                    ? Number(selectedBill.gstAmount)
                    : Number(selectedBill.subtotal || 0) * 0.05
                ).toFixed(2)}{" "}
                = ₹
                {(
                  Number(selectedBill.subtotal || 0) +
                  (Number(selectedBill.gstAmount || 0) > 0
                    ? Number(selectedBill.gstAmount)
                    : Number(selectedBill.subtotal || 0) * 0.05)
                ).toFixed(2)}{" "}
                before discount
              </p>
              <p className="text-[var(--text-secondary)]">
                CGST / SGST: ₹{Number(selectedBill.cgst || (Number(selectedBill.subtotal || 0) * 0.05) / 2).toFixed(2)} / ₹
                {Number(selectedBill.sgst || (Number(selectedBill.subtotal || 0) * 0.05) / 2).toFixed(2)}
              </p>
              <h2 className="text-2xl font-bold text-[var(--gold)] mt-2">Cash Collected: ₹{selectedBill.totalAmount?.toLocaleString()}</h2>
            </div>
          </div>
        </div>
      ) : null}
    </BillingShell>
  );
}
