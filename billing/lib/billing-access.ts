import type { BillingAdminPermissions } from "@/lib/auth-store";

type PermissionKey = keyof BillingAdminPermissions;

export type BillingNavLink = {
  href: string;
  label: string;
  permissions?: PermissionKey[];
};

export const billingNavLinks: BillingNavLink[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/billing", label: "Billing" },
  { href: "/history", label: "History" },
  { href: "/pending", label: "⏳ Pending" },
  { href: "/inventory", label: "Inventory", permissions: ["canManageStock", "canViewReports"] },
  { href: "/stock", label: "Stock Entry", permissions: ["canManageStock"] },
  { href: "/returns", label: "Returns", permissions: ["canReturn"] },
  { href: "/returns/history", label: "Returns History", permissions: ["canReturn", "canViewReports"] },
  { href: "/reports", label: "📈 Reports Overview", permissions: ["canViewReports"] },
  { href: "/reports/customers", label: "📋 Customers", permissions: ["canViewCustomerReports"] },
  { href: "/reports/bill-profit", label: "💰 Bill Wise Profit", permissions: ["canViewReports"] },
  { href: "/admin", label: "Admin", permissions: ["canManageAdmins", "canManageSuppliersCategories"] },
  { href: "/admin/inventory", label: "Inventory", permissions: ["canManageStock", "canViewReports"] },
];

export const adminHubLinks: Array<{ href: string; label: string; permissions: PermissionKey[] }> = [
  { href: "/admin/inventory", label: "Inventory", permissions: ["canManageStock", "canViewReports"] },
  { href: "/admin/suppliers", label: "Suppliers", permissions: ["canManageSuppliersCategories"] },
  { href: "/admin/categories", label: "Categories", permissions: ["canManageSuppliersCategories"] },
  { href: "/admin/salesmen", label: "Salesmen", permissions: ["canManageAdmins"] },
  { href: "/admin/staff", label: "Staff", permissions: ["canManageAdmins"] },
];

export const hasAnyPermission = (
  permissions: BillingAdminPermissions | null | undefined,
  keys: PermissionKey[],
  role?: string | null
) => role === "superadmin" || keys.some((key) => Boolean(permissions?.[key]));

export const canAccessBillingPath = (
  pathname: string,
  permissions: BillingAdminPermissions | null | undefined,
  role?: string | null
) => {
  if (role === "superadmin") return true;

  if (pathname === "/admin") {
    return hasAnyPermission(permissions, ["canManageAdmins", "canManageSuppliersCategories"], role);
  }

  if (pathname.startsWith("/admin/")) {
    const adminLink = adminHubLinks.find(
      (link) => pathname === link.href || pathname.startsWith(`${link.href}/`)
    );
    if (adminLink) {
      return hasAnyPermission(permissions, adminLink.permissions, role);
    }
    return false;
  }

  const match = [...billingNavLinks]
    .filter((link) => link.permissions?.length && !link.href.startsWith("/admin"))
    .sort((a, b) => b.href.length - a.href.length)
    .find((link) => pathname === link.href || pathname.startsWith(`${link.href}/`));

  if (!match?.permissions?.length) return true;
  return hasAnyPermission(permissions, match.permissions, role);
};
