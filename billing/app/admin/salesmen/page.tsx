"use client";
import BillingShell from "@/components/layout/BillingShell";
import { useEffect, useState } from "react";
import { billingApi } from "@/lib/api";
export default function SalesmenPage() {
  const [salesmen, setSalesmen] = useState<any[]>([]);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: "", phone: "" });
  const load = () => billingApi.salesmen().then(setSalesmen).catch(() => setSalesmen([]));
  useEffect(() => {
    void load();
  }, []);

  const save = async () => {
    if (editing?._id) await billingApi.updateSalesman(editing._id, form);
    else await billingApi.createSalesman(form);
    setEditing(null);
    setForm({ name: "", phone: "" });
    load();
  };

  return (
    <BillingShell title="Salesmen">
      <div className="pos-card p-4 space-y-3">
        <button className="h-11 px-3 rounded bg-[var(--gold)] text-black" onClick={() => setEditing({})}>+ Add Salesman</button>
        <table className="w-full text-sm">
          <thead><tr className="text-left text-[var(--text-secondary)]"><th>Name</th><th>Phone</th><th>Active</th><th>Edit</th><th>Toggle</th></tr></thead>
          <tbody>
            {salesmen.map((salesman) => (
              <tr key={salesman._id} className="border-t border-[var(--border)]">
                <td>{salesman.name}</td><td>{salesman.phone || "-"}</td><td>{salesman.isActive ? "Yes" : "No"}</td>
                <td><button onClick={() => { setEditing(salesman); setForm({ name: salesman.name || "", phone: salesman.phone || "" }); }}>Edit</button></td>
                <td><button onClick={async () => { await billingApi.deleteSalesman(salesman._id); load(); }}>{salesman.isActive ? "Deactivate" : "Activate"}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editing ? (
        <div className="fixed inset-0 bg-black/50 grid place-items-center p-4">
          <div className="pos-card p-4 w-full max-w-sm space-y-2">
            <h3 className="font-semibold">{editing?._id ? "Edit Salesman" : "Add Salesman"}</h3>
            <input className="pos-input w-full" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="Name" />
            <input className="pos-input w-full" value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} placeholder="Phone" />
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
