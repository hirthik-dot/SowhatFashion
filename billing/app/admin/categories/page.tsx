"use client";
import BillingShell from "@/components/layout/BillingShell";
import { useEffect, useState } from "react";
import { billingApi } from "@/lib/api";
export default function CategoriesPage() {
  const [tree, setTree] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [modal, setModal] = useState<{ mode: "main" | "sub" | "edit"; parent?: string; item?: any } | null>(null);
  const [name, setName] = useState("");
  const [supplierId, setSupplierId] = useState("");

  const load = () => billingApi.categories().then(setTree).catch(() => setTree([]));
  useEffect(() => {
    void load();
    billingApi.suppliers().then(setSuppliers).catch(() => setSuppliers([]));
  }, []);

  const save = async () => {
    if (!modal) return;
    if (!supplierId) return;
    if (modal.mode === "edit" && modal.item?._id) {
      await billingApi.updateCategory(modal.item._id, { name, supplier: supplierId });
    } else {
      await billingApi.createCategory({ name, supplier: supplierId, parentCategory: modal.mode === "sub" ? modal.parent : null });
    }
    setModal(null);
    setName("");
    setSupplierId("");
    load();
  };

  return (
    <BillingShell title="Categories">
      <div className="pos-card p-4 space-y-2">
        {tree.map((main) => (
          <div key={main._id}>
            <div className="flex items-center gap-2">
              <button onClick={() => setExpanded((prev) => ({ ...prev, [main._id]: !prev[main._id] }))}>{expanded[main._id] ? "▼" : "▶"}</button>
              <span>{main.name}</span>
              <span className="text-xs text-[var(--text-secondary)]">
                (
                {suppliers.find((s) => String(s._id) === String(main.supplier))?.name || "No Supplier"}
                )
              </span>
              <button onClick={() => { setModal({ mode: "sub", parent: main._id, item: main }); setName(""); setSupplierId(String(main.supplier || "")); }}>[+ Add Sub]</button>
              <button onClick={() => { setModal({ mode: "edit", item: main }); setName(main.name); setSupplierId(String(main.supplier || "")); }}>[✏ Edit]</button>
              <button onClick={async () => { if (window.confirm("Delete category?")) { await billingApi.deleteCategory(main._id); load(); } }}>[🗑]</button>
            </div>
            {expanded[main._id] && (
              <div className="ml-7 mt-1 space-y-1">
                {(main.subCategories || []).map((sub: any) => (
                  <div key={sub._id} className="flex items-center gap-2">
                    <span>{sub.name}</span>
                    <span className="text-xs text-[var(--text-secondary)]">
                      (
                      {suppliers.find((s) => String(s._id) === String(sub.supplier))?.name || "No Supplier"}
                      )
                    </span>
                    <button onClick={() => { setModal({ mode: "edit", item: sub }); setName(sub.name); setSupplierId(String(sub.supplier || "")); }}>[✏ Edit]</button>
                    <button onClick={async () => { if (window.confirm("Delete subcategory?")) { await billingApi.deleteCategory(sub._id); load(); } }}>[🗑]</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        <button className="h-11 px-3 rounded bg-[var(--gold)] text-black mt-2" onClick={() => { setModal({ mode: "main" }); setName(""); setSupplierId(""); }}>+ Add Main Category</button>
      </div>
      {modal ? (
        <div className="fixed inset-0 bg-black/50 grid place-items-center p-4">
          <div className="pos-card p-4 w-full max-w-sm space-y-2">
            <h3 className="font-semibold">{modal.mode === "sub" ? "Add Subcategory" : modal.mode === "main" ? "Add Main Category" : "Edit Category"}</h3>
            <label className="text-sm text-[var(--text-secondary)]">Supplier</label>
            <select className="pos-input w-full" value={supplierId} onChange={(e) => setSupplierId(e.target.value)} required>
              <option value="">Select Supplier</option>
              {suppliers.map((supplier) => (
                <option key={supplier._id} value={supplier._id}>
                  {supplier.name}
                </option>
              ))}
            </select>
            <input className="pos-input w-full" value={name} onChange={(e) => setName(e.target.value)} placeholder="Category name" />
            <div className="flex gap-2">
              <button className="h-11 px-3 rounded bg-[var(--gold)] text-black" onClick={save}>Save</button>
              <button className="h-11 px-3 rounded border border-[var(--border)]" onClick={() => setModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      ) : null}
    </BillingShell>
  );
}
