"use client";
import BillingShell from "@/components/layout/BillingShell";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { billingApi } from "@/lib/api";
import { useRole } from "@/hooks/useRole";
export default function StaffPage() {
  const router = useRouter();
  const { isAdmin, isSuperAdmin, permissions: ownPermissions } = useRole();
  const [staff, setStaff] = useState<any[]>([]);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({
    name: "",
    email: "",
    password: "",
    role: "cashier",
    permissions: {
      canBill: true,
      canReturn: true,
      canManageStock: false,
      canViewReports: false,
      canManageAdmins: false,
      canEditBills: false,
      canDiscount: true,
      maxDiscountPercent: 5,
    },
  });
  const load = () => billingApi.admins().then(setStaff).catch(() => setStaff([]));
  useEffect(() => {
    if (!isAdmin) router.push("/billing");
  }, [isAdmin, router]);
  useEffect(() => {
    void load();
  }, []);

  const save = async () => {
    if (!isSuperAdmin && form.role === "superadmin") {
      window.alert("Only superadmin can create superadmin.");
      return;
    }
    if (!isSuperAdmin) {
      for (const key of Object.keys(form.permissions || {})) {
        if (key === "maxDiscountPercent") {
          if (Number(form.permissions.maxDiscountPercent || 0) > Number(ownPermissions?.maxDiscountPercent || 0)) {
            window.alert("Cannot assign higher max discount than your own.");
            return;
          }
          continue;
        }
        if (Boolean(form.permissions[key]) && !Boolean((ownPermissions as any)?.[key])) {
          window.alert(`Cannot assign permission you do not have: ${key}`);
          return;
        }
      }
    }
    if (editing?._id) await billingApi.updateAdmin(editing._id, form);
    else await billingApi.createAdmin(form);
    setEditing(null);
    load();
  };

  if (!isAdmin) return null;

  return (
    <BillingShell title="Staff">
      <div className="pos-card p-4 space-y-3">
        <button className="h-11 px-3 rounded bg-[var(--gold)] text-black" onClick={() => { setEditing({}); setForm({ ...form, name: "", email: "", password: "" }); }}>+ Add Staff</button>
        <table className="w-full text-sm">
          <thead><tr className="text-left text-[var(--text-secondary)]"><th>Name</th><th>Email</th><th>Role</th><th>Last Login</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {staff.map((member) => (
              <tr key={member._id} className="border-t border-[var(--border)]">
                <td>{member.name}</td><td>{member.email}</td><td>{member.role}</td><td>{member.lastLogin ? new Date(member.lastLogin).toLocaleString() : "-"}</td><td>{member.isActive ? "Active" : "Inactive"}</td>
                <td className="space-x-2">
                  <button onClick={() => { setEditing(member); setForm({ ...member, password: "" }); }}>Edit</button>
                  <button onClick={async () => { if (window.confirm("Deactivate staff?")) { await billingApi.deleteAdmin(member._id); load(); } }}>Deactivate</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editing ? (
        <div className="fixed inset-0 bg-black/50 grid place-items-center p-4">
          <div className="pos-card p-4 w-full max-w-xl space-y-2">
            <h3 className="font-semibold">{editing?._id ? "Edit Staff" : "Add Staff"}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <input className="pos-input w-full" placeholder="Name" value={form.name} onChange={(e) => setForm((prev: any) => ({ ...prev, name: e.target.value }))} />
              <input className="pos-input w-full" placeholder="Email" value={form.email} onChange={(e) => setForm((prev: any) => ({ ...prev, email: e.target.value }))} />
              <input className="pos-input w-full" placeholder="Temp Password" value={form.password || ""} onChange={(e) => setForm((prev: any) => ({ ...prev, password: e.target.value }))} />
              <select className="pos-input w-full" value={form.role} onChange={(e) => setForm((prev: any) => ({ ...prev, role: e.target.value }))}>
                {isSuperAdmin ? <option value="superadmin">superadmin</option> : null}
                <option value="admin">admin</option>
                <option value="cashier">cashier</option>
              </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              {[
                ["canBill", "Can Bill"],
                ["canReturn", "Can Process Returns"],
                ["canManageStock", "Can Manage Stock"],
                ["canViewReports", "Can View Reports"],
                ["canViewCustomerReports", "Can View Customer Reports"],
                ["canManageSuppliersCategories", "Can Manage Suppliers/Categories"],
                ["canEditBills", "Can Edit Completed Bills"],
                ["canManageAdmins", "Can Create Staff"],
                ["canDiscount", "Can Apply Discount"],
              ].map(([key, label]) => (
                <label key={key} className="flex items-center gap-2">
                  <input type="checkbox" checked={Boolean(form.permissions?.[key])} onChange={(e) => setForm((prev: any) => ({ ...prev, permissions: { ...prev.permissions, [key]: e.target.checked } }))} />
                  <span>{label}</span>
                </label>
              ))}
            </div>
            <input className="pos-input w-full" type="number" value={form.permissions?.maxDiscountPercent || 0} onChange={(e) => setForm((prev: any) => ({ ...prev, permissions: { ...prev.permissions, maxDiscountPercent: Number(e.target.value || 0) } }))} />
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
