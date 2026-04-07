"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BillingShell from "@/components/layout/BillingShell";
import { billingApi } from "@/lib/api";
import { Cell, Pie, PieChart, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Bar, ResponsiveContainer } from "recharts";
import * as XLSX from "xlsx";
import { useRole } from "@/hooks/useRole";

export default function ReportsPage() {
  const router = useRouter();
  const { isAdmin } = useRole();
  const [summary, setSummary] = useState<any>(null);
  const [period, setPeriod] = useState<"today" | "week" | "month" | "custom">("today");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [bills, setBills] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedBill, setSelectedBill] = useState<any>(null);

  const load = async (currentPage = 1) => {
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
    const [summaryData, billsData] = await Promise.all([
      billingApi.reportSummary(start, end),
      billingApi.reportBills(`page=${currentPage}&limit=20&startDate=${start}&endDate=${end}`),
    ]);
    setSummary(summaryData);
    setBills(billsData.data || []);
    setTotal(billsData.total || 0);
  };

  useEffect(() => {
    if (!isAdmin) router.push("/billing");
  }, [isAdmin, router]);

  useEffect(() => {
    load(page).catch(() => {
      setSummary(null);
      setBills([]);
    });
  }, [period, from, to, page]);

  const exportExcel = () => {
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
    XLSX.writeFile(workbook, `billing-report-${Date.now()}.xlsx`);
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
    <BillingShell title="Reports">
      <div className="space-y-3">
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
          <input className="pos-input h-10 min-h-0" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <input className="pos-input h-10 min-h-0" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          <button className="h-10 px-3 rounded border border-[var(--border)]" onClick={() => load(page)}>Apply</button>
          <button className="h-10 px-3 rounded bg-[var(--gold)] text-black ml-auto" onClick={exportExcel}>⬇ Export Excel</button>
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
              <p className="text-2xl font-bold">{card.value}</p>
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
                  <Tooltip />
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
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
          <div className="pos-card p-3 overflow-auto">
            <p className="mb-2 font-medium">Top Products</p>
            <table className="w-full min-w-[720px] text-sm">
              <thead><tr className="text-left text-[var(--text-secondary)]"><th>Rank</th><th>Product</th><th>Category</th><th>Qty Sold</th><th>Revenue</th><th>Returns</th></tr></thead>
              <tbody>
                {topProducts.map((row: any, index) => (
                  <tr key={`${row.product}-${index}`} className="border-t border-[var(--border)]">
                    <td>{index + 1}</td><td>{row.product}</td><td>{row.category}</td><td>{row.qty}</td><td>₹{row.revenue.toFixed(2)}</td><td>{row.returns}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pos-card p-3 overflow-auto">
            <p className="mb-2 font-medium">Salesman Performance</p>
            <table className="w-full min-w-[720px] text-sm">
              <thead><tr className="text-left text-[var(--text-secondary)]"><th>Name</th><th>Bills</th><th>Revenue</th><th>Avg Bill Value</th><th>Returns</th><th>Best Day</th></tr></thead>
              <tbody>
                {salesmanRows.map((row: any) => (
                  <tr key={row.name} className="border-t border-[var(--border)]">
                    <td>{row.name}</td><td>{row.bills}</td><td>₹{row.revenue.toFixed(2)}</td><td>₹{row.avg.toFixed(2)}</td><td>{row.returns}</td><td>{row.bestDay}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
          <div className="pos-card p-3 h-[320px]">
            <p className="mb-2 font-medium">Category Breakdown</p>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={categoryData} dataKey="value" nameKey="name" outerRadius={100}>
                  {categoryData.map((entry, index) => (
                    <Cell key={entry.name} fill={["#F59E0B", "#10B981", "#3B82F6", "#EC4899", "#A78BFA"][index % 5]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="pos-card p-3 overflow-auto">
            <p className="mb-2 font-medium">All Bills</p>
            <table className="w-full min-w-[760px] text-sm">
              <thead><tr className="text-left text-[var(--text-secondary)]"><th>Bill#</th><th>Customer</th><th>Salesman</th><th>Items</th><th>Total</th><th>Payment</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {bills.map((bill) => (
                  <tr key={bill._id} className="border-t border-[var(--border)]">
                    <td>{bill.billNumber}</td><td>{bill.customer?.name}</td><td>{bill.salesmanName || "-"}</td><td>{bill.items?.length || 0}</td><td>₹{bill.totalAmount}</td><td>{bill.paymentMethod}</td><td>{bill.status}</td>
                    <td><button className="underline" onClick={() => setSelectedBill(bill)}>View</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-end gap-2 mt-2">
              <button className="h-9 px-3 rounded border border-[var(--border)]" onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
              <span className="text-sm self-center">Page {page} / {Math.max(1, Math.ceil(total / 20))}</span>
              <button className="h-9 px-3 rounded border border-[var(--border)]" onClick={() => setPage((p) => p + 1)}>Next</button>
            </div>
          </div>
        </div>
      </div>
      {selectedBill ? (
        <div className="fixed inset-0 bg-black/50 z-50 grid place-items-center p-4">
          <div className="pos-card p-4 w-full max-w-2xl max-h-[80vh] overflow-auto">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-semibold">Bill Detail - {selectedBill.billNumber}</h3>
              <button onClick={() => setSelectedBill(null)}>Close</button>
            </div>
            <p className="text-sm mb-2">Customer: {selectedBill.customer?.name} · Salesman: {selectedBill.salesmanName || "-"}</p>
            <p className="font-semibold mb-1">ITEMS IN THIS BILL:</p>
            <div className="border-t border-[var(--border)] pt-2">
              {(selectedBill.items || []).map((item: any, index: number) => (
                <div key={`${item.barcode}-${index}`} className="py-2 border-b border-[var(--border)]">
                  <p>{item.name} (Size: {item.size || "-"})</p>
                  <p>Barcode: {item.barcode || "-"}</p>
                  <p>MRP: ₹{item.mrp} → Sold: ₹{item.sellingPrice} x{item.quantity} = ₹{item.lineTotal}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </BillingShell>
  );
}
