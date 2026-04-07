"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import BillingShell from "@/components/layout/BillingShell";
import { billingApi } from "@/lib/api";
import { useRole } from "@/hooks/useRole";

export default function AdminInventoryPage() {
  const { isSuperAdmin } = useRole();
  const [data, setData] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [supplier, setSupplier] = useState("");
  const [status, setStatus] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [productItems, setProductItems] = useState<any[]>([]);

  const load = async () => {
    const query = new URLSearchParams();
    if (search.trim()) query.set("search", search.trim());
    if (supplier) query.set("supplier", supplier);
    const response = await billingApi.stockInventory(query.toString());
    setData(response.data || []);
    setSummary(response.summary || null);
    const suppliersData = await billingApi.suppliers();
    setSuppliers(suppliersData || []);
  };

  useEffect(() => {
    load().catch(() => {
      setData([]);
      setSummary(null);
    });
  }, []);

  const filtered = useMemo(() => {
    return data.filter((row) => {
      const left = Number(row.totalStock || 0);
      const ratio = (Number(row.totalStock || 0) + Number(row.sold || 0)) ? left / (Number(row.totalStock || 0) + Number(row.sold || 0)) : 0;
      const stockStatus = left <= 0 ? "out" : ratio <= 0.2 ? "low" : "ok";
      if (!status) return true;
      return status === stockStatus;
    });
  }, [data, status]);

  const getProductStatus = (row: any) => {
    const left = Number(row.totalStock || 0);
    const ratio = (Number(row.totalStock || 0) + Number(row.sold || 0)) ? left / (Number(row.totalStock || 0) + Number(row.sold || 0)) : 0;
    if (left <= 0) return { label: "Out of Stock", icon: "🔴" };
    if (ratio <= 0.2) return { label: "Low Stock", icon: "🟡" };
    return { label: "In Stock", icon: "🟢" };
  };

  const openProduct = async (row: any) => {
    setSelectedProduct(row);
    setSelectedSize("");
    setProductItems([]);
  };

  const loadSizeItems = async (size: string) => {
    if (!selectedProduct) return;
    setSelectedSize(size);
    const items = await billingApi.stockInventoryItems(selectedProduct._id, size);
    setProductItems(items || []);
  };

  return (
    <BillingShell title="Admin Inventory">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Inventory</h2>
          <Link href="/stock" className="h-11 px-4 rounded bg-[var(--gold)] text-black font-semibold inline-flex items-center">
            + New Stock Entry
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: "Total Products", value: summary?.totalProducts || 0 },
            { label: "Total Units", value: summary?.totalUnits || 0 },
            { label: "Retail Value", value: `₹${Math.round(summary?.totalRetailValue || 0)}` },
            ...(isSuperAdmin ? [{ label: "Cost Value", value: `₹${Math.round(summary?.totalCostValue || 0)}` }] : []),
            { label: "Out of Stock", value: summary?.outOfStock || 0 },
          ].map((card) => (
            <div key={card.label} className="pos-card p-3">
              <p className="text-xs text-[var(--text-secondary)]">{card.label}</p>
              <p className="text-xl font-semibold mt-1">{card.value}</p>
            </div>
          ))}
        </div>

        <div className="pos-card p-3 flex flex-wrap gap-2">
          <input className="pos-input min-w-[220px] flex-1" placeholder="Search by name/category/supplier" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className="pos-input min-w-[180px]" value={supplier} onChange={(e) => setSupplier(e.target.value)}>
            <option value="">All Suppliers</option>
            {suppliers.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}
          </select>
          <select className="pos-input min-w-[180px]" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All Status</option>
            <option value="ok">In Stock</option>
            <option value="low">Low Stock</option>
            <option value="out">Out of Stock</option>
          </select>
          <button className="h-12 px-4 rounded bg-[var(--gold)] text-black font-semibold" onClick={load}>Apply Filters</button>
        </div>

        <div className="pos-card p-3 overflow-auto">
          <h3 className="font-semibold mb-2">Products</h3>
          <table className="w-full min-w-[1200px] text-sm">
            <thead>
              <tr className="text-left text-[var(--text-secondary)]">
                <th>Product Name</th>
                <th>Category</th>
                <th>Sub</th>
                <th>Supplier</th>
                <th>Sizes Available</th>
                <th>Total Stock</th>
                <th>Sold</th>
                <th>MRP</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const statusData = getProductStatus(row);
                const sizes = (row.sizeStock || []).map((s: any) => `${s.size}:${s.stock}`).join(" ");
                return (
                  <tr key={row._id} className="border-t border-[var(--border)]">
                    <td>{row.name || "-"}</td>
                    <td>{row.category || "-"}</td>
                    <td>{row.subCategory || "-"}</td>
                    <td>{row.supplier || "-"}</td>
                    <td className="whitespace-nowrap">{sizes || "-"}</td>
                    <td>{row.totalStock || 0}</td>
                    <td>{row.sold || 0}</td>
                    <td>₹{Number(row.mrp || 0).toFixed(2)}</td>
                    <td>{statusData.icon} {statusData.label}</td>
                    <td><button className="underline" onClick={() => openProduct(row)}>View</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      {selectedProduct ? (
        <div className="fixed inset-0 bg-black/50 z-50 grid place-items-center p-4">
          <div className="pos-card p-4 w-full max-w-4xl">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-semibold">
                Product Detail: {selectedProduct.name} · Total {selectedProduct.totalStock || 0}
              </h3>
              <button onClick={() => { setSelectedProduct(null); setSelectedSize(""); setProductItems([]); }}>Close</button>
            </div>
            <div className="pos-card p-3 mb-3">
              <p className="text-sm text-[var(--text-secondary)] mb-2">Size breakdown</p>
              <div className="flex flex-wrap gap-2">
                {(selectedProduct.sizeStock || []).map((s: any) => (
                  <button
                    key={s.size}
                    className={`h-10 px-3 rounded border ${selectedSize === s.size ? "border-[var(--gold)]" : "border-[var(--border)]"}`}
                    onClick={() => loadSizeItems(s.size)}
                  >
                    {s.size}:{s.stock}
                  </button>
                ))}
              </div>
            </div>
            <div className="overflow-auto max-h-[60vh]">
              <table className="w-full min-w-[700px] text-sm">
                <thead><tr className="text-left text-[var(--text-secondary)]"><th>Barcode</th><th>Size</th><th>MRP</th><th>Status</th></tr></thead>
                <tbody>
                  {productItems.map((item) => (
                    <tr key={item._id} className="border-t border-[var(--border)]">
                      <td>{item.barcode}</td>
                      <td>{item.size || "-"}</td>
                      <td>₹{Number(item.mrp || 0).toFixed(2)}</td>
                      <td>
                        {item.status === "sold"
                          ? `🔴 SOLD${item.soldInBill ? ` (${String(item.soldInBill)})` : ""}`
                          : item.status === "returned"
                          ? `🟣 RETURNED${item.returnedInReturn ? ` (${String(item.returnedInReturn)})` : ""}`
                          : item.status === "damaged"
                          ? "⚫ DAMAGED"
                          : "🟢 AVAILABLE"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </BillingShell>
  );
}
