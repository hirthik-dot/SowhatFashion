"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { billingApi } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { useRole } from "@/hooks/useRole";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/billing", label: "Billing" },
  { href: "/history", label: "History" },
  { href: "/inventory", label: "Inventory", adminOnly: true },
  { href: "/stock", label: "Stock Entry", adminOnly: true },
  { href: "/returns", label: "Returns", adminOnly: true },
  { href: "/reports", label: "📈 Reports Overview", adminOnly: true },
  { href: "/reports/customers", label: "📋 Customers", adminOnly: true },
  { href: "/admin", label: "Admin", adminOnly: true },
  { href: "/admin/inventory", label: "Inventory", adminOnly: true },
];

export default function BillingShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const { isAdmin, isCashier } = useRole();

  useEffect(() => {
    let active = true;
    billingApi
      .me()
      .then((data) => {
        if (!active) return;
        if (data?.admin) {
          setUser(data.admin);
          return;
        }
        router.push("/login");
      })
      .catch(() => router.push("/login"));
    return () => {
      active = false;
    };
  }, [setUser]);

  useEffect(() => {
    if (!user) return;
    const adminOnlyPaths = ["/inventory", "/stock", "/returns", "/reports", "/admin"];
    if (adminOnlyPaths.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)) && !isAdmin) {
      router.push("/billing");
    }
  }, [pathname, isAdmin, router, user]);

  const logout = async () => {
    await billingApi.logout();
    setUser(null);
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text-primary)]">
      <aside className="fixed left-0 top-0 h-screen w-[220px] bg-[var(--surface)] border-r border-[var(--border)] hidden md:block">
        <div className="px-4 py-4 border-b border-[var(--border)] font-semibold">SOWAAT POS</div>
        <nav className="p-2 space-y-1">
          {links
            .filter((link) => !link.adminOnly || isAdmin)
            .map((link) => {
            const active = pathname === link.href || pathname.startsWith(link.href + "/");
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`block rounded px-3 py-2 text-sm ${
                  active
                    ? "bg-[var(--surface-2)] text-[var(--gold)] border-l-2 border-[var(--gold)]"
                    : "text-[var(--text-secondary)] hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="md:ml-[220px]">
        <header className="h-14 border-b border-[var(--border)] bg-[var(--surface)] px-4 flex items-center justify-between">
          <h1 className="font-semibold">{title}</h1>
          <div className="text-sm flex items-center gap-3">
            <span className="text-[var(--text-secondary)]">
              {user?.name || "Billing Admin"} {isCashier ? "(Cashier)" : ""}
            </span>
            <button onClick={logout} className="text-[var(--gold)] hover:underline">
              Logout
            </button>
          </div>
        </header>
        <main className="p-4">{children}</main>
      </div>
    </div>
  );
}
