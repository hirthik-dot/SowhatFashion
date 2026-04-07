"use client";

import { useAuthStore } from "@/lib/auth-store";

export const useRole = () => {
  const role = useAuthStore((s) => s.role);
  const permissions = useAuthStore((s) => s.permissions);
  const admin = useAuthStore((s) => s.admin);

  return {
    role,
    permissions,
    admin,
    isSuperAdmin: role === "superadmin",
    isAdmin: ["superadmin", "admin"].includes(role || ""),
    isCashier: role === "cashier",
    can: (permission: keyof NonNullable<typeof permissions>) =>
      role === "superadmin" || permissions?.[permission] === true,
    maxDiscount: Number(permissions?.maxDiscountPercent || 0),
  };
};
