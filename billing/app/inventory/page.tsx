"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import BillingShell from "@/components/layout/BillingShell";
import { billingApi } from "@/lib/api";
import { useRole } from "@/hooks/useRole";

export default function InventoryPage() {
  const router = useRouter();
  const { isAdmin, isSuperAdmin } = useRole();
  const [summary, setSummary] = useState<any>(null);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [entries, setEntries] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [supplier, setSupplier] = useState("");
  const [stockFilter, setStockFilter] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const load = async (targetPage = 1) => {
    const query = new URLSearchParams();
    query.set("page", String(targetPage));
    query.set("limit", "25");
    if (search.trim()) query.set("search", search.trim());
    if (supplier) query.set("supplier", supplier);
    if (stockFilter) query.set("stock", stockFilter);

    const [summaryData, productsData, entriesData, supplierData] = await Promise.all([
      billingApi.inventorySummary(),
      billingApi.inventoryProducts(query.toString()),
      billingApi.inventoryEntries("page=1&limit=10"),
      billingApi.suppliers(),
    ]);

    setSummary(summaryData);
    setProducts(productsData.data || []);
    setTotal(productsData.total || 0);
    setEntries(entriesData.data || []);
    setSuppliers(supplierData || []);
  };

  useEffect(() => {
    if (!isAdmin) router.push("/billing");
  }, [isAdmin, router]);

  useEffect(() => {
    load(page).catch(() => {
      setSummary(null);
      setProducts([]);
      setEntries([]);
    });
  }, [page]);

  const cards = useMemo(
    () => [
      { label: "Total Products", value: summary?.totalProducts || 0 },
      { label: "Total Units", value: summary?.totalUnits || 0 },
      { label: "Retail Value", value: `₹${Math.round(summary?.totalRetailValue || 0)}` },
      ...(isSuperAdmin
        ? [
            { label: "Cost Value", value: `₹${Math.round(summary?.totalCostValue || 0)}` },
            { label: "Expected Profit", value: `₹${Math.round(summary?.expectedProfit || 0)}` },
          ]
        : []),
      { label: "Low Stock", value: summary?.lowStock || 0 },
      { label: "Out of Stock", value: summary?.outOfStock || 0 },
    ],
    [summary, isSuperAdmin]
  );

  if (!isAdmin) return null;

  return (
    <BillingShell title="Inventory">
      <div className="space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
          {cards.map((card) => (
            <div key={card.label} className="pos-card p-3">
              <p className="text-xs text-[var(--text-secondary)]">{card.label}</p>
              <p className="text-lg font-semibold mt-1">{card.value}</p>
            </div>
          ))}
        </div>

        <div className="pos-card p-3">
          <div className="flex flex-wrap gap-2">
            <input
              className="pos-input w-full sm:min-w-[220px] flex-1"
              placeholder="Search by name, barcode, sku, category..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <select className="pos-input w-full sm:min-w-[180px]" value={supplier} onChange={(event) => setSupplier(event.target.value)}>
              <option value="">All Suppliers</option>
              {suppliers.map((item) => (
                <option key={item._id} value={item._id}>
                  {item.name}
                </option>
              ))}
            </select>
            <select className="pos-input w-full sm:min-w-[180px]" value={stockFilter} onChange={(event) => setStockFilter(event.target.value)}>
              <option value="">All Stock</option>
              <option value="in">In Stock</option>
              <option value="low">Low Stock</option>
              <option value="out">Out of Stock</option>
            </select>
            <button
              className="h-12 px-4 rounded bg-[var(--gold)] text-black font-semibold w-full sm:w-auto"
              onClick={() => {
                setPage(1);
                load(1);
              }}
            >
              Apply Filters
            </button>
          </div>
        </div>

        <div className="pos-card p-3 overflow-auto">
          <h2 className="font-semibold mb-2">Product Inventory</h2>
          <table className="w-full min-w-[1200px] text-sm">
            <thead>
              <tr className="text-left text-[var(--text-secondary)]">
                <th>Name</th>
                <th>Category</th>
                <th>Subcategory</th>
                <th>Supplier</th>
                <th>Sizes</th>
                {isSuperAdmin ? <th>Cost</th> : null}
                <th>MRP</th>
                <th>Stock</th>
                <th>Sold</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product._id} className="border-t border-[var(--border)]">
                  <td>{product.name}</td>
                  <td>{product.category || "-"}</td>
                  <td>{product.billingSubCategory?.name || product.subCategory || "-"}</td>
                  <td>{product.supplier?.name || "-"}</td>
                  <td>{(product.sizeStock || []).map((s: any) => `${s.size}:${s.stock}`).join(" ") || "-"}</td>
                  {isSuperAdmin ? <td>₹{Number(product.incomingPrice || 0).toFixed(2)}</td> : null}
                  <td>₹{Number(product.price || 0).toFixed(2)}</td>
                  <td>{product.stock}</td>
                  <td>{Number(product.sold || 0)}</td>
                  <td>{product.stock <= 0 ? "Out" : product.stock <= 2 ? "Low" : "In"}</td>
                  <td>{new Date(product.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex flex-col sm:flex-row sm:justify-end gap-2 mt-3">
            <button className="h-9 px-3 rounded border border-[var(--border)]" onClick={() => setPage((value) => Math.max(1, value - 1))}>
              Prev
            </button>
            <span className="text-sm self-center">
              Page {page} / {Math.max(1, Math.ceil(total / 25))}
            </span>
            <button className="h-9 px-3 rounded border border-[var(--border)]" onClick={() => setPage((value) => value + 1)}>
              Next
            </button>
          </div>
        </div>

        <div className="pos-card p-3 overflow-auto">
          <h2 className="font-semibold mb-2">Recent Stock Entries</h2>
          <table className="w-full min-w-[1000px] text-sm">
            <thead>
              <tr className="text-left text-[var(--text-secondary)]">
                <th>Date</th>
                <th>Supplier</th>
                <th>Category</th>
                <th>Subcategory</th>
                <th>Size</th>
                <th>Qty</th>
                <th>Cost</th>
                <th>MRP</th>
                <th>GST%</th>
                <th>Barcodes</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry._id} className="border-t border-[var(--border)]">
                  <td>{new Date(entry.entryDate || entry.createdAt).toLocaleString()}</td>
                  <td>{entry.supplier?.name || "-"}</td>
                  <td>{entry.category?.name || "-"}</td>
                  <td>{entry.subCategory?.name || "-"}</td>
                  <td>{entry.size || "-"}</td>
                  <td>{entry.quantity}</td>
                  <td>₹{Number(entry.incomingPrice || 0).toFixed(2)}</td>
                  <td>₹{Number(entry.sellingPrice || 0).toFixed(2)}</td>
                  <td>{entry.gstPercent || 0}</td>
                  <td>{entry.barcodes?.length || 0}</td>
                  <td>{entry.notes || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </BillingShell>
  );
}
