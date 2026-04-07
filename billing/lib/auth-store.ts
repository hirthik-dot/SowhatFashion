"use client";

import { create } from "zustand";

export type BillingRole = "superadmin" | "admin" | "cashier";
export type BillingAdminPermissions = {
  canBill: boolean;
  canReturn: boolean;
  canManageStock: boolean;
  canViewReports: boolean;
  canViewCustomerReports?: boolean;
  canManageSuppliersCategories?: boolean;
  canManageAdmins: boolean;
  canEditBills: boolean;
  canDiscount: boolean;
  maxDiscountPercent: number;
};

export type BillingUser = {
  id: string;
  name: string;
  email: string;
  role: BillingRole;
  permissions?: BillingAdminPermissions;
};

type AuthState = {
  user: BillingUser | null;
  admin: BillingUser | null;
  isLoggedIn: boolean;
  role: BillingRole | null;
  permissions: BillingAdminPermissions | null;
  loading: boolean;
  setUser: (user: BillingUser | null) => void;
  setLoading: (loading: boolean) => void;
  isSuperAdmin: () => boolean;
  isAdmin: () => boolean;
  hasPermission: (key: keyof BillingAdminPermissions) => boolean;
  canDiscount: (percent: number) => boolean;
};

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  admin: null,
  isLoggedIn: false,
  role: null,
  permissions: null,
  loading: false,
  setUser: (user) =>
    set({
      user,
      admin: user,
      isLoggedIn: Boolean(user),
      role: user?.role || null,
      permissions: user?.permissions || null,
    }),
  setLoading: (loading) => set({ loading }),
  isSuperAdmin: () => get().role === "superadmin",
  isAdmin: () => ["superadmin", "admin"].includes(get().role || ""),
  hasPermission: (key) =>
    get().role === "superadmin" ||
    Boolean(get().permissions?.[key]),
  canDiscount: (percent) => {
    const state = get();
    if (state.role === "superadmin") return true;
    if (!state.permissions?.canDiscount) return false;
    return Number(percent || 0) <= Number(state.permissions?.maxDiscountPercent || 0);
  },
}));
