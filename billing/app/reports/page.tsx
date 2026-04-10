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
  const { isAdmin } = useRole();
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

  // Profit Tab State
  const [profitData, setProfitData] = useState<any[]>([]);
  const [profitSummary, setProfitSummary] = useState<any>(null);
  const [profitPage, setProfitPage] = useState(1);
  const [profitTotal, setProfitTotal] = useState(0);

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
      const [summaryData, billsData] = await Promise.all([
        billingApi.reportSummary(start, end),
        billingApi.reportBills(`page=${currentPage}&limit=20&startDate=${start}&endDate=${end}`),
      ]);
      setSummary(summaryData);
      setBills(billsData.data || []);
      setSalesTotal(billsData.total || 0);
    } catch {
      setSummary(null);
      setBills([]);
    }
  };

  const loadProfit = async (currentPage = 1) => {
    try {
      const res = await billingApi.reportProfit(currentPage);
      setProfitData(res.data || []);
      setProfitSummary(res.summary || null);
      setProfitTotal(res.total || 0);
    } catch {
      setProfitData([]);
      setProfitSummary(null);
    }
  };

  useEffect(() => {
    if (!isAdmin) router.push("/billing");
  }, [isAdmin, router]);

  useEffect(() => {
    if (activeTab === "sales") {
      loadSales(salesPage);
    } else {
      loadProfit(profitPage);
    }
  }, [activeTab, period, from, to, salesPage, profitPage]);

  const exportSalesExcel = () => {
    const workbook = XLSX.utils.book_new();
    const summarySheet = XLSX.utils.json_to_sheet([{
      Revenue: summary?.totalRevenue || 0,
      Bills: summary?.totalBills || 0,
      Items: summary?.totalItems || 0,
      Returns: summary?.totalReturns || 0,
      Discount: summary?.totalDiscount || 0,
      GST: summary?.totalGst || 0,
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
      salesmanMap[key].Revenue += Number(bill.totalAmount || 0);
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
      const url = `${process.env.NEXT_PUBLIC_API_URL || ""}/api/billing/reports/profit/export`;
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
  const revenueBars = (summary?.dailyRevenue || []).length ? summary.dailyRevenue : bills.map((bill) => ({ label: new Date(bill.createdAt).toLocaleDateString(), value: bill.totalAmount }));
  const topProducts = Object.values(
    bills.flatMap((bill) => bill.items || []).reduce((acc: any, item: any) => {
      const key = `${item.name}-${item.category || ""}`;
      if (!acc[key]) acc[key] = { product: item.name, category: item.category || "-", qty: 0, revenue: 0, returns: 0 };
      acc[key].qty += Number(item.quantity || 0);
      acc[key].revenue += Number(item.lineTotal || 0);
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
      acc[key].revenue += Number(bill.totalAmount || 0);
      if (bill.status?.includes("return")) acc[key].returns += 1;
      const day = new Date(bill.createdAt).toLocaleDateString(undefined, { weekday: "short" });
      acc[key].bestDay = day;
      return acc;
    }, {})
  ).map((row: any) => ({ ...row, avg: row.bills ? row.revenue / row.bills : 0 }));

  if (!isAdmin) return null;

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
              <div className="w-full text-xs text-[var(--text-secondary)] flex gap-3 pb-1">
                <span className="text-[var(--gold)]">📈 Overview</span>
                <Link href="/reports/customers" className="underline">
                  📋 Customers
                </Link>
              </div>
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
              <button className="h-10 px-3 rounded border border-[var(--border)]" onClick={() => loadSales(salesPage)}>Apply</button>
              <button className="h-10 px-3 rounded bg-[var(--gold)] text-black ml-auto font-semibold shadow-sm hover:opacity-90" onClick={exportSalesExcel}>⬇ Export Sales Excel</button>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Revenue", value: `₹${Math.round(summary?.totalRevenue || 0)}` },
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
                <table className="w-full min-w-[760px] text-sm">
                  <thead><tr className="text-left text-[var(--text-secondary)]"><th>Bill#</th><th>Customer</th><th>Salesman</th><th>Items</th><th>Total</th><th>Payment</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>
                    {bills.map((bill) => (
                      <tr key={bill._id} className="border-t border-[var(--border)] group hover:bg-[var(--surface-2)]">
                        <td className="py-2">{bill.billNumber}</td><td>{bill.customer?.name}</td><td>{bill.salesmanName || "-"}</td><td>{bill.items?.length || 0}</td><td className="font-semibold text-[var(--gold)]">₹{bill.totalAmount}</td><td>{bill.paymentMethod}</td><td>{bill.status}</td>
                        <td><button className="text-[var(--info)] hover:underline" onClick={() => setSelectedBill(bill)}>View</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex justify-between mt-3 text-sm">
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
                <h3 className="font-bold text-lg text-white">Stock Batch & Profit Margin</h3>
                <p className="text-sm text-[var(--text-secondary)]">Understand your inventory investment, sales tracking, and exact realized profit</p>
              </div>
              <button className="h-11 px-6 rounded bg-[var(--success)] text-white ml-auto font-bold shadow-sm hover:opacity-90 flex items-center gap-2" onClick={exportProfitExcel}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Export Profit Excel
              </button>
            </div>

            {/* Profit Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="pos-card p-4 border-l-4 border-l-[var(--info)]">
                <p className="text-xs font-bold text-[var(--text-secondary)] uppercase">Total Inventory Sourced</p>
                <p className="text-2xl font-black mt-1 text-white">{profitSummary?.overallPurchased || 0} <span className="text-sm font-normal text-gray-400">units</span></p>
              </div>
              <div className="pos-card p-4 border-l-4 border-l-[var(--warning)]">
                <p className="text-xs font-bold text-[var(--text-secondary)] uppercase">Total Capital Invested</p>
                <p className="text-2xl font-black mt-1 text-white">₹{(profitSummary?.totalInvestment || 0).toLocaleString()}</p>
              </div>
               <div className="pos-card p-4 border-l-4 border-l-blue-400">
                <p className="text-xs font-bold text-[var(--text-secondary)] uppercase">Total Realized Revenue</p>
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
              <h4 className="font-bold mb-4 text-white">Batch-wise Purchasing & Sales Data</h4>
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
                    <th className="p-3 font-semibold text-right text-blue-400 bg-blue-900/10">Est. Revenue</th>
                    <th className="p-3 font-semibold text-right text-[var(--success)] bg-green-900/10 rounded-tr-lg">Realized Profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {profitData.map((batch: any) => {
                     const isProfitable = batch.realizedProfit > 0;
                     const isLoss = batch.realizedProfit < 0;
                     return (
                      <tr key={batch._id} className="hover:bg-[var(--surface-2)] transition-colors group">
                        <td className="p-3 text-[var(--text-secondary)]">{new Date(batch.entryDate).toLocaleDateString()}</td>
                        <td className="p-3">
                          <p className="font-semibold text-white">{batch.productName || 'Unnamed Asset'}</p>
                          <p className="text-xs text-[var(--text-secondary)] mt-0.5">{batch.supplierName} • {batch.categoryName}</p>
                        </td>
                        <td className="p-3 text-right font-medium">{batch.quantity}</td>
                        <td className="p-3 text-right text-[var(--warning)]">₹{batch.incomingPrice}</td>
                        <td className="p-3 text-right border-r border-[var(--border)]">₹{(batch.quantity * batch.incomingPrice).toLocaleString()}</td>
                        
                        <td className="p-3 text-right text-white font-medium bg-blue-900/5">{batch.qtySold} <span className="text-[10px] text-gray-500">/ {batch.quantity}</span></td>
                        <td className="p-3 text-right text-blue-300 bg-blue-900/5">₹{batch.sellingPrice}</td>
                        <td className="p-3 text-right text-blue-400 font-semibold bg-blue-900/5">₹{(batch.soldRevenue || 0).toLocaleString()}</td>
                        
                        <td className={`p-3 text-right font-bold bg-green-900/5 ${isProfitable ? 'text-[var(--success)]' : isLoss ? 'text-red-400' : 'text-[var(--text-secondary)]'}`}>
                          {isProfitable && '+'}{isLoss && '-'}₹{Math.abs(batch.realizedProfit || 0).toLocaleString()}
                        </td>
                      </tr>
                    )
                  })}
                  {profitData.length === 0 && (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-[var(--text-secondary)]">No batch data available for cost & profit calculation.</td>
                    </tr>
                  )}
                </tbody>
              </table>

              <div className="flex justify-between mt-4 text-sm px-2 border-t border-[var(--border)] pt-4">
                 <div className="text-[var(--text-secondary)]">Total: {profitTotal} batches recorded</div>
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
            <div className="mt-4 pt-3 border-t border-[var(--border)] text-right">
              <p className="text-[var(--text-secondary)]">Subtotal: ₹{selectedBill.subtotal}</p>
              <p className="text-[var(--success)]">Coupons/Discount: -₹{(selectedBill.totalItemDiscount || 0) + (selectedBill.billDiscountAmount || 0)}</p>
              <p className="text-[var(--text-secondary)]">GST: +₹{selectedBill.gstAmount}</p>
              <h2 className="text-2xl font-bold text-[var(--gold)] mt-2">Total: ₹{selectedBill.totalAmount?.toLocaleString()}</h2>
            </div>
          </div>
        </div>
      ) : null}
    </BillingShell>
  );
}
