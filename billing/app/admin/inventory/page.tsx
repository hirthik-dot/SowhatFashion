"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useReactToPrint } from "react-to-print";
import BillingShell from "@/components/layout/BillingShell";
import BarcodePrintSheet from "@/components/stock/BarcodePrintSheet";
import { billingApi } from "@/lib/api";
import { useRole } from "@/hooks/useRole";
import EditProductModal from "@/components/inventory/EditProductModal";

const LABELS_PER_PAGE = 15;

export default function AdminInventoryPage() {
  const { isSuperAdmin } = useRole();
  const [data, setData] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [supplier, setSupplier] = useState("");
  const [status, setStatus] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [productStockBreakdown, setProductStockBreakdown] = useState<{
    totalInShop: number;
    sizes: { size: string; inShop: number; available: number; returned: number }[];
  } | null>(null);
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [productItems, setProductItems] = useState<any[]>([]);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [savingProduct, setSavingProduct] = useState(false);
  const [reprintItem, setReprintItem] = useState<any>(null);
  const [selectedBatchBarcodes, setSelectedBatchBarcodes] = useState<string[]>([]);
  const [batchReprint, setBatchReprint] = useState<any>(null);
  const [batchCurrentPage, setBatchCurrentPage] = useState(1);
  const reprintRef = useRef<HTMLDivElement>(null);
  const batchReprintRef = useRef<HTMLDivElement>(null);

  const printReprintLabel = useReactToPrint({
    contentRef: reprintRef,
    pageStyle: `
      @page { size: 10.7cm auto; margin: 0; }
      @media print {
        html, body { margin: 0 !important; padding: 0 !important; }
      }
    `,
  });

  const batchTotalPages = Math.max(1, Math.ceil((batchReprint?.barcodes?.length || 0) / LABELS_PER_PAGE));
  const batchPageToShow = Math.min(batchCurrentPage, batchTotalPages);
  const batchAllPagesPrinted = (batchReprint?.barcodes?.length || 0) > 0 && batchCurrentPage > batchTotalPages;
  const batchPageStart = (batchPageToShow - 1) * LABELS_PER_PAGE;
  const batchPageBarcodes = (batchReprint?.barcodes || []).slice(batchPageStart, batchPageStart + LABELS_PER_PAGE);

  const printBatchReprint = useReactToPrint({
    contentRef: batchReprintRef,
    pageStyle: `
      @page { size: 10.7cm auto; margin: 0; }
      @media print {
        html, body { margin: 0 !important; padding: 0 !important; }
      }
    `,
    onAfterPrint: () => {
      setBatchCurrentPage((prev) => prev + 1);
    },
  });

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
      const left = Number(row.stockInShop ?? row.totalStock ?? 0);
      const ratio = (left + Number(row.sold || 0)) ? left / (left + Number(row.sold || 0)) : 0;
      const stockStatus = left <= 0 ? "out" : ratio <= 0.2 ? "low" : "ok";
      if (!status) return true;
      return status === stockStatus;
    });
  }, [data, status]);

  const getProductStatus = (row: any) => {
    const left = Number(row.stockInShop ?? row.totalStock ?? 0);
    const ratio = (left + Number(row.sold || 0)) ? left / (left + Number(row.sold || 0)) : 0;
    if (left <= 0) return { label: "Out of Stock", icon: "🔴" };
    if (ratio <= 0.2) return { label: "Low Stock", icon: "🟡" };
    return { label: "In Stock", icon: "🟢" };
  };

  const loadProductBreakdown = async (productId: string) => {
    try {
      const breakdown = await billingApi.stockInventoryBreakdown(productId);
      setProductStockBreakdown({
        totalInShop: Number(breakdown?.totalInShop || 0),
        sizes: Array.isArray(breakdown?.sizes) ? breakdown.sizes : [],
      });
    } catch {
      setProductStockBreakdown(null);
    }
  };

  const openProduct = async (row: any) => {
    setSelectedProduct(row);
    setSelectedSize("");
    setProductItems([]);
    setSelectedBatchBarcodes([]);
    setBatchReprint(null);
    setBatchCurrentPage(1);
    setProductStockBreakdown(null);
    await loadProductBreakdown(String(row._id));
  };

  const loadSizeItems = async (size: string) => {
    if (!selectedProduct) return;
    setSelectedSize(size);
    const items = await billingApi.stockInventoryItems(selectedProduct._id, size);
    setProductItems(items || []);
    setSelectedBatchBarcodes([]);
  };

  const toggleBatchBarcode = (barcode: string) => {
    setSelectedBatchBarcodes((prev) =>
      prev.includes(barcode) ? prev.filter((b) => b !== barcode) : [...prev, barcode]
    );
  };

  const openBatchReprint = () => {
    if (!selectedBatchBarcodes.length) return;
    setBatchReprint({
      barcodes: selectedBatchBarcodes,
      size: selectedSize || "-",
      mrp: Number(selectedProduct?.mrp || 0),
      name: selectedProduct?.name || "Product",
    });
    setBatchCurrentPage(1);
  };

  const resolveSupplierId = (product: any) => {
    if (product._editSupplierId) return product._editSupplierId;
    if (product.supplierId) return product.supplierId;
    if (product.supplier?._id) return product.supplier._id;
    if (typeof product.supplier === "string") {
      const byId = suppliers.find((s) => s._id === product.supplier);
      if (byId) return byId._id;
      const byName = suppliers.find((s) => s.name === product.supplier);
      if (byName) return byName._id;
    }
    return "";
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    setSavingProduct(true);
    try {
      const supplierId = resolveSupplierId(editingProduct);
      const payload: any = {
        name: editingProduct.name,
        price: editingProduct.mrp,
        incomingPrice: editingProduct.incomingPrice,
        notes: editingProduct.notes,
        sizeEntries: editingProduct.sizeEntries,
      };
      if (supplierId) payload.supplier = supplierId;
      // Send ObjectId references if user picked from dropdown
      if (editingProduct._editCategoryId) {
        payload.billingCategory = editingProduct._editCategoryId;
      } else {
        payload.category = editingProduct.category;
      }
      if (editingProduct._editSubCategoryId) {
        payload.billingSubCategory = editingProduct._editSubCategoryId;
      } else {
        payload.subCategory = editingProduct.subCategory;
      }
      const updated = await billingApi.updateInventoryProduct(editingProduct._id, payload);
      setEditingProduct(null);
      await load();
      if (selectedProduct?._id === editingProduct._id) {
        const supplierName = suppliers.find((s) => s._id === String(updated?.supplier || supplierId))?.name;
        setSelectedProduct((prev: any) =>
          prev
            ? {
                ...prev,
                name: updated?.billingName || updated?.name || prev.name,
                mrp: Number(updated?.price ?? prev.mrp),
                category: updated?.category || prev.category,
                subCategory: updated?.subCategory || prev.subCategory,
                supplier: supplierName || prev.supplier,
                sizeStock: updated?.sizeStock || prev.sizeStock,
                totalStock: Number(updated?.totalStock ?? updated?.stock ?? prev.totalStock),
              }
            : prev
        );
      }
    } catch (err: any) {
      alert(err.message || "Failed to update product");
    } finally {
      setSavingProduct(false);
    }
  };

  return (
    <BillingShell title="Admin Inventory">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
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
          <input className="pos-input w-full sm:min-w-[220px] flex-1" placeholder="Search by name/category/supplier" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className="pos-input w-full sm:min-w-[180px]" value={supplier} onChange={(e) => setSupplier(e.target.value)}>
            <option value="">All Suppliers</option>
            {suppliers.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}
          </select>
          <select className="pos-input w-full sm:min-w-[180px]" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All Status</option>
            <option value="ok">In Stock</option>
            <option value="low">Low Stock</option>
            <option value="out">Out of Stock</option>
          </select>
          <button className="h-12 px-4 rounded bg-[var(--gold)] text-black font-semibold w-full sm:w-auto" onClick={load}>Apply Filters</button>
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
                const sizes = (row.sizeStockInShop?.length ? row.sizeStockInShop : row.sizeStock || [])
                  .map((s: any) => `${s.size}:${s.stock}`)
                  .join(" ");
                return (
                  <tr key={row._id} className="border-t border-[var(--border)]">
                    <td>{row.name || "-"}</td>
                    <td>{row.category || "-"}</td>
                    <td>{row.subCategory || "-"}</td>
                    <td>{row.supplier || "-"}</td>
                    <td className="whitespace-nowrap">{sizes || "-"}</td>
                    <td>{row.stockInShop ?? row.totalStock ?? 0}</td>
                    <td>{row.sold || 0}</td>
                    <td>₹{Number(row.mrp || row.price || 0).toFixed(2)}</td>
                    <td>{statusData.icon} {statusData.label}</td>
                    <td>
                      <div className="flex gap-2">
                        <button className="underline" onClick={() => openProduct(row)}>View</button>
                        <button
                          className="underline text-[var(--gold)]"
                          onClick={() =>
                            setEditingProduct({
                              ...row,
                              mrp: row.mrp || row.price,
                              _editSupplierId: row.supplierId || "",
                              _editCategoryId: row.billingCategory || "",
                              _editSubCategoryId: row.billingSubCategory || "",
                            })
                          }
                        >
                          Edit
                        </button>
                      </div>
                    </td>
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
                Product Detail: {selectedProduct.name} · Total{" "}
                {productStockBreakdown?.totalInShop ?? selectedProduct.totalStock ?? 0}
              </h3>
              <button
                onClick={() => {
                  setSelectedProduct(null);
                  setProductStockBreakdown(null);
                  setSelectedSize("");
                  setProductItems([]);
                  setSelectedBatchBarcodes([]);
                }}
              >
                Close
              </button>
            </div>
            <div className="pos-card p-3 mb-3">
              <p className="text-sm text-[var(--text-secondary)] mb-2">
                Size breakdown (available + returned in shop)
              </p>
              <div className="flex flex-wrap gap-2">
                {(productStockBreakdown?.sizes?.length
                  ? productStockBreakdown.sizes
                  : selectedProduct.sizeStock || []
                ).map((s: any) => {
                  const count = Number(s.inShop ?? s.stock ?? 0);
                  const returned = Number(s.returned || 0);
                  const available = Number(s.available ?? count);
                  return (
                    <button
                      key={s.size}
                      className={`h-10 px-3 rounded border ${selectedSize === s.size ? "border-[var(--gold)]" : "border-[var(--border)]"}`}
                      onClick={() => loadSizeItems(s.size)}
                      title={
                        returned > 0
                          ? `${available} available, ${returned} returned`
                          : `${available} available`
                      }
                    >
                      {s.size}:{count}
                    </button>
                  );
                })}
              </div>
            </div>
            {productItems.length > 0 ? (
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-[var(--text-secondary)]">
                  Selected for batch print: {selectedBatchBarcodes.length}
                </p>
                <button
                  className="h-9 px-3 rounded bg-[var(--gold)] text-black font-semibold disabled:opacity-50"
                  onClick={openBatchReprint}
                  disabled={selectedBatchBarcodes.length === 0}
                >
                  Print Selected Batch
                </button>
              </div>
            ) : null}
            <div className="overflow-auto max-h-[60vh]">
              <table className="w-full min-w-[860px] text-sm">
                <thead><tr className="text-left text-[var(--text-secondary)]"><th>Select</th><th>Barcode</th><th>Size</th><th>MRP</th><th>Status</th><th>Action</th></tr></thead>
                <tbody>
                  {productItems.map((item) => (
                    <tr key={item._id} className="border-t border-[var(--border)]">
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedBatchBarcodes.includes(item.barcode)}
                          onChange={() => toggleBatchBarcode(item.barcode)}
                        />
                      </td>
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
                      <td>
                        <button
                          className="h-8 px-3 rounded border border-[var(--border)] hover:border-[var(--gold)]"
                          onClick={() =>
                            setReprintItem({
                              barcode: item.barcode,
                              size: item.size || selectedSize || "-",
                              mrp: Number(item.mrp || selectedProduct?.mrp || 0),
                              name: selectedProduct?.name || "Product",
                            })
                          }
                        >
                          Reprint Barcode
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
      {reprintItem ? (
        <div className="fixed inset-0 bg-black/50 z-[60] grid place-items-center p-4">
          <style>{`
            @media print {
              body * { visibility: hidden; }
              #barcode-label-sheet,
              #barcode-label-sheet * { visibility: visible; }
              #barcode-label-sheet {
                position: fixed;
                top: 0;
                left: 0;
                margin: 0;
                padding: 0.3cm;
                width: 10.7cm;
                box-sizing: border-box;
                background: white;
              }
              .label-grid {
                display: grid;
                grid-template-columns: repeat(3, 3.4cm);
                grid-auto-rows: 2.5cm;
                row-gap: 0.3cm;
              }
            }
            .barcode-label-screen {
              border: 1px solid #2E3347;
              border-radius: 4px;
              padding: 8px;
              background: #1A1D27;
            }
            .label-grid-screen {
              display: grid;
              grid-template-columns: repeat(3, minmax(0, 1fr));
              gap: 8px;
              max-width: 720px;
            }
          `}</style>
          <div className="pos-card p-4 w-full max-w-3xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Reprint Barcode</h3>
              <button onClick={() => setReprintItem(null)}>Close</button>
            </div>
            <p className="text-sm text-[var(--text-secondary)] mb-3">
              {reprintItem.name} · Size {reprintItem.size} · ₹{Number(reprintItem.mrp || 0).toFixed(2)}
            </p>
            <div className="mb-4">
              <BarcodePrintSheet
                ref={reprintRef}
                barcodes={[reprintItem.barcode]}
                productName={reprintItem.name}
                size={reprintItem.size}
                price={reprintItem.mrp}
              />
            </div>
            <div className="flex justify-end">
              <button className="h-10 px-4 rounded bg-[var(--gold)] text-black font-semibold" onClick={() => printReprintLabel()}>
                Print Label
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {batchReprint ? (
        <div className="fixed inset-0 bg-black/50 z-[70] grid place-items-center p-4">
          <style>{`
            @media print {
              body * { visibility: hidden; }
              #barcode-label-sheet,
              #barcode-label-sheet * { visibility: visible; }
              #barcode-label-sheet {
                position: fixed;
                top: 0;
                left: 0;
                margin: 0;
                padding: 0.3cm;
                width: 10.7cm;
                box-sizing: border-box;
                background: white;
              }
              .label-grid {
                display: grid;
                grid-template-columns: repeat(3, 3.4cm);
                grid-auto-rows: 2.5cm;
                row-gap: 0.3cm;
              }
            }
            .barcode-label-screen {
              border: 1px solid #2E3347;
              border-radius: 4px;
              padding: 8px;
              background: #1A1D27;
            }
            .label-grid-screen {
              display: grid;
              grid-template-columns: repeat(3, minmax(0, 1fr));
              gap: 8px;
              max-width: 720px;
            }
          `}</style>
          <div className="pos-card p-4 w-full max-w-3xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Batch Reprint Barcodes</h3>
              <button onClick={() => setBatchReprint(null)}>Close</button>
            </div>
            <p className="text-sm text-[var(--text-secondary)] mb-3">
              {batchReprint.name} · Size {batchReprint.size} · {batchReprint.barcodes.length} labels · Showing page {batchPageToShow} of {batchTotalPages}
            </p>
            <div className="mb-4">
              <BarcodePrintSheet
                ref={batchReprintRef}
                barcodes={batchPageBarcodes}
                productName={batchReprint.name}
                size={batchReprint.size}
                price={batchReprint.mrp}
              />
            </div>
            <div className="flex justify-end">
              <button
                className="h-10 px-4 rounded bg-[var(--gold)] text-black font-semibold disabled:opacity-50"
                onClick={() => printBatchReprint()}
                disabled={batchReprint.barcodes.length === 0 || batchAllPagesPrinted}
              >
                {batchAllPagesPrinted
                  ? `ALL ${batchTotalPages} PAGES PRINTED`
                  : batchPageToShow < batchTotalPages
                  ? `PRINT PAGE ${batchPageToShow} OF ${batchTotalPages}`
                  : `PRINT FINAL PAGE ${batchTotalPages} OF ${batchTotalPages}`}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {editingProduct ? (
        <EditProductModal
          editingProduct={editingProduct}
          setEditingProduct={setEditingProduct}
          suppliers={suppliers}
          isSuperAdmin={isSuperAdmin}
          savingProduct={savingProduct}
          onSave={handleEditSave}
        />
      ) : null}
    </BillingShell>
  );
}