"use client";
import BillingShell from "@/components/layout/BillingShell";
import { useEffect, useState } from "react";
import { billingApi } from "@/lib/api";
export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: "", phone: "", gstNumber: "", address: "" });

  const load = () => billingApi.suppliers().then(setSuppliers).catch(() => setSuppliers([]));
  useEffect(() => {
    void load();
  }, []);

  const save = async () => {
    if (editing?._id) await billingApi.updateSupplier(editing._id, form);
    else await billingApi.createSupplier(form);
    setEditing(null);
    setForm({ name: "", phone: "", gstNumber: "", address: "" });
    load();
  };

  return (
    <BillingShell title="Suppliers">
      <div className="pos-card p-4 space-y-3">
        <button className="h-11 px-3 rounded bg-[var(--gold)] text-black w-full sm:w-auto" onClick={() => setEditing({})}>+ Add Supplier</button>
        <div className="overflow-auto">
        <table className="w-full min-w-[700px] text-sm">
          <thead><tr className="text-left text-[var(--text-secondary)]"><th>Name</th><th>Phone</th><th>GST</th><th>Status</th><th>Edit</th><th>Delete</th></tr></thead>
          <tbody>
            {suppliers.map((supplier) => (
              <tr key={supplier._id} className="border-t border-[var(--border)]">
                <td>{supplier.name}</td><td>{supplier.phone || "-"}</td><td>{supplier.gstNumber || "-"}</td><td>{supplier.isActive ? "Active" : "Inactive"}</td>
                <td><button onClick={() => { setEditing(supplier); setForm({ name: supplier.name || "", phone: supplier.phone || "", gstNumber: supplier.gstNumber || "", address: supplier.address || "" }); }}>Edit</button></td>
                <td><button onClick={async () => { if (window.confirm("Delete supplier?")) { await billingApi.deleteSupplier(supplier._id); load(); } }}>Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
      {editing !== null ? (
        <div className="fixed inset-0 bg-black/50 grid place-items-center p-4">
          <div className="pos-card p-4 w-full max-w-md space-y-2">
            <h3 className="font-semibold">{editing?._id ? "Edit Supplier" : "Add Supplier"}</h3>
            <input className="pos-input w-full" placeholder="Name" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
            <input className="pos-input w-full" placeholder="Phone" value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} />
            <input className="pos-input w-full" placeholder="GST Number" value={form.gstNumber} onChange={(e) => setForm((prev) => ({ ...prev, gstNumber: e.target.value }))} />
            <textarea className="pos-input w-full min-h-20 py-2" placeholder="Address" value={form.address} onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))} />
            <div className="flex gap-2">
              <button className="h-11 px-3 rounded bg-[var(--gold)] text-black" onClick={save}>Save</button>
              <button className="h-11 px-3 rounded border border-[var(--border)]" onClick={() => setEditing(null)}>Cancel</button>
            </div>
          </div>
        </div>
      ) : null}
    </BillingShell>
  );
}
