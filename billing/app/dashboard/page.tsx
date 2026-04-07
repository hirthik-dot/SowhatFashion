"use client";

import { useEffect, useState } from "react";
import BillingShell from "@/components/layout/BillingShell";
import { billingApi } from "@/lib/api";
import Link from "next/link";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useRole } from "@/hooks/useRole";

export default function DashboardPage() {
  const { isCashier } = useRole();
  const [summary, setSummary] = useState<any>(null);
  const [bills, setBills] = useState<any[]>([]);
  const [lowStock, setLowStock] = useState<any[]>([]);
  const [name, setName] = useState("Admin");

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    Promise.all([
      billingApi.reportSummary(today, today),
      billingApi.bills("limit=10"),
      billingApi.lowStock(),
      billingApi.me(),
    ])
      .then(([sum, recent, low, me]) => {
        setSummary(sum);
        const myBills = (recent.data || []).filter((bill: any) =>
          String(bill.createdBy || "") === String(me.admin?.id || me.admin?._id || "")
        );
        setBills(isCashier ? myBills : recent.data || []);
        setLowStock(low || []);
        setName(me.admin?.name || "Admin");
      })
      .catch(() => setSummary(null));
  }, []);

  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const cards = [
    { label: "Today's Revenue", value: `₹${Math.round(summary?.totalRevenue || 0)}` },
    { label: "Bills Today", value: summary?.totalBills || 0 },
    { label: "Items Sold", value: summary?.totalItems || 0 },
    { label: "Low Stock", value: lowStock.length || 0 },
  ];
  const paymentData = Object.entries(summary?.paymentMethodBreakdown || {}).map(([name, value]) => ({ name, value }));
  const categoryData = Object.entries(summary?.categoryBreakdown || {}).map(([name, value]) => ({ name, value }));
  const revenueBars = bills.map((bill) => ({ day: new Date(bill.createdAt).toLocaleDateString(), value: bill.totalAmount }));
  const cashierRevenue = bills.reduce((sum, bill) => sum + Number(bill.totalAmount || 0), 0);

  return (
    <BillingShell title="Dashboard">
      <div className="mb-3">
        <p className="text-lg font-semibold">{greet}, {name}</p>
        <p className="text-sm text-[var(--text-secondary)]">{new Date().toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
      </div>
      {isCashier ? (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="pos-card p-4">
              <p className="text-sm text-[var(--text-secondary)]">Today's bills I processed</p>
              <p className="text-2xl font-bold mt-2">{bills.length}</p>
            </div>
            <div className="pos-card p-4">
              <p className="text-sm text-[var(--text-secondary)]">Today's revenue from my bills</p>
              <p className="text-2xl font-bold mt-2">₹{Math.round(cashierRevenue)}</p>
            </div>
          </div>
          <Link href="/billing" className="h-14 px-6 rounded bg-[var(--gold)] text-black font-bold inline-flex items-center">
            Start Billing →
          </Link>
        </div>
      ) : (
      <>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {cards.map((card) => (
          <div key={card.label} className="pos-card p-4">
            <p className="text-sm text-[var(--text-secondary)]">{card.label}</p>
            <p className="text-2xl font-bold mt-2">{card.value}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 mt-3">
        <div className="pos-card p-3 xl:col-span-2 h-[280px]">
          <p className="mb-2 font-medium">Revenue - Last 7 Days</p>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={revenueBars}>
              <XAxis dataKey="day" stroke="#F5F5F5" />
              <YAxis stroke="#F5F5F5" />
              <Tooltip />
              <Bar dataKey="value" fill="#C9A84C" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="pos-card p-3 h-[280px]">
          <p className="mb-2 font-medium">Payment Methods</p>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={paymentData} dataKey="value" nameKey="name" innerRadius={48} outerRadius={84}>
                {paymentData.map((entry, index) => <Cell key={entry.name} fill={["#C9A84C", "#22C55E", "#3B82F6", "#8B5CF6"][index % 4]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 mt-3">
        <div className="pos-card p-3 h-[320px]">
          <p className="mb-2 font-medium">Top Categories Today</p>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={categoryData} dataKey="value" nameKey="name" outerRadius={105}>
                {categoryData.map((entry, index) => <Cell key={entry.name} fill={["#F59E0B", "#10B981", "#3B82F6", "#EC4899", "#A78BFA"][index % 5]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="pos-card p-3 overflow-auto">
          <p className="mb-2 font-medium">Recent Bills</p>
          <table className="w-full text-sm min-w-[500px]">
            <thead><tr className="text-left text-[var(--text-secondary)]"><th>Bill</th><th>Customer</th><th>Total</th></tr></thead>
            <tbody>
              {bills.slice(0, 10).map((bill) => <tr key={bill._id} className="border-t border-[var(--border)]"><td>{bill.billNumber || "-"}</td><td>{bill.customer?.name || "Walk-in"}</td><td>₹{bill.totalAmount}</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>
      <div className="pos-card p-3 mt-3">
        <p className="font-semibold text-[var(--warning)]">⚠ {lowStock.length} items need restocking</p>
        <div className="mt-2 space-y-1">
          {lowStock.map((item) => (
            <div key={item._id} className="text-sm">
              {item.subCategory || item.category} ({item.size || "-"}) - {item.totalLeft} of {item.totalIn} remaining
            </div>
          ))}
        </div>
      </div>
      </>
      )}
    </BillingShell>
  );
}
