"use client";
import BillingShell from "@/components/layout/BillingShell";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { billingApi } from "@/lib/api";
import { useRole } from "@/hooks/useRole";

const ROLE_PERMISSION_DEFAULTS: Record<string, Record<string, boolean | number>> = {
  superadmin: {
    canBill: true,
    canReturn: true,
    canManageStock: true,
    canViewReports: true,
    canViewCustomerReports: true,
    canManageSuppliersCategories: true,
    canManageAdmins: true,
    canEditBills: true,
    canDiscount: true,
    maxDiscountPercent: 100,
  },
  admin: {
    canBill: true,
    canReturn: true,
    canManageStock: true,
    canViewReports: true,
    canViewCustomerReports: true,
    canManageSuppliersCategories: true,
    canManageAdmins: true,
    canEditBills: true,
    canDiscount: true,
    maxDiscountPercent: 25,
  },
  cashier: {
    canBill: true,
    canReturn: false,
    canManageStock: false,
    canViewReports: false,
    canViewCustomerReports: false,
    canManageSuppliersCategories: false,
    canManageAdmins: false,
    canEditBills: false,
    canDiscount: true,
    maxDiscountPercent: 5,
  },
};

export default function StaffPage() {
  const router = useRouter();
  const { isSuperAdmin, can, permissions: ownPermissions } = useRole();
  const canAccess = can("canManageAdmins");
  const [staff, setStaff] = useState<any[]>([]);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({
    name: "",
    email: "",
    password: "",
    role: "cashier",
    permissions: { ...ROLE_PERMISSION_DEFAULTS.cashier },
  });
  const load = () => billingApi.admins().then(setStaff).catch(() => setStaff([]));
  useEffect(() => {
    if (!canAccess) router.push("/billing");
  }, [canAccess, router]);
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

  if (!canAccess) return null;

  return (
    <BillingShell title="Staff">
      <div className="pos-card p-4 space-y-3">
        <button className="h-11 px-3 rounded bg-[var(--gold)] text-black w-full sm:w-auto" onClick={() => { setEditing({}); setForm({ name: "", email: "", password: "", role: "cashier", permissions: { ...ROLE_PERMISSION_DEFAULTS.cashier } }); }}>+ Add Staff</button>
        <div className="overflow-auto">
        <table className="w-full min-w-[820px] text-sm">
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
      </div>
      {editing ? (
        <div className="fixed inset-0 bg-black/50 grid place-items-center p-4">
          <div className="pos-card p-4 w-full max-w-xl space-y-2">
            <h3 className="font-semibold">{editing?._id ? "Edit Staff" : "Add Staff"}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <input className="pos-input w-full" placeholder="Name" value={form.name} onChange={(e) => setForm((prev: any) => ({ ...prev, name: e.target.value }))} />
              <input className="pos-input w-full" placeholder="Email" value={form.email} onChange={(e) => setForm((prev: any) => ({ ...prev, email: e.target.value }))} />
              <input className="pos-input w-full" placeholder="Temp Password" value={form.password || ""} onChange={(e) => setForm((prev: any) => ({ ...prev, password: e.target.value }))} />
              <select className="pos-input w-full" value={form.role} onChange={(e) => {
                const role = e.target.value;
                setForm((prev: any) => ({
                  ...prev,
                  role,
                  ...(!editing?._id ? { permissions: { ...(ROLE_PERMISSION_DEFAULTS[role] || ROLE_PERMISSION_DEFAULTS.cashier) } } : {}),
                }));
              }}>
                {isSuperAdmin ? <option value="superadmin">superadmin</option> : null}
                <option value="admin">admin</option>
                <option value="cashier">cashier</option>
              </select>
            </div>
            {form.role === "superadmin" ? (
              <p className="text-sm text-[var(--text-secondary)]">Superadmin has all permissions.</p>
            ) : (
              <>
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
                <label className="block text-sm">
                  <span className="text-[var(--text-secondary)]">Max discount %</span>
                  <input className="pos-input w-full mt-1" type="number" min={0} max={100} value={form.permissions?.maxDiscountPercent || 0} onChange={(e) => setForm((prev: any) => ({ ...prev, permissions: { ...prev.permissions, maxDiscountPercent: Number(e.target.value || 0) } }))} />
                </label>
              </>
            )}
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
