"use client";

import { useAuthStore } from "@/lib/auth-store";
import { hasAnyPermission } from "@/lib/billing-access";
import type { BillingAdminPermissions } from "@/lib/auth-store";

export const useRole = () => {
  const role = useAuthStore((s) => s.role);
  const permissions = useAuthStore((s) => s.permissions);
  const admin = useAuthStore((s) => s.admin);

  const can = (permission: keyof BillingAdminPermissions) =>
    role === "superadmin" || permissions?.[permission] === true;

  const canAny = (...keys: Array<keyof BillingAdminPermissions>) =>
    hasAnyPermission(permissions, keys, role);

  return {
    role,
    permissions,
    admin,
    isSuperAdmin: role === "superadmin",
    isAdmin: ["superadmin", "admin"].includes(role || ""),
    isCashier: role === "cashier",
    can,
    canAny,
    maxDiscount: Number(permissions?.maxDiscountPercent || 0),
  };
};
