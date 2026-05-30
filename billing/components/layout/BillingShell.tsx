"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { billingApi } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { useRole } from "@/hooks/useRole";
import { billingNavLinks, canAccessBillingPath, hasAnyPermission } from "@/lib/billing-access";
import type { BillingAdminPermissions } from "@/lib/auth-store";

function NavLinks({
  pathname,
  permissions,
  role,
  onNavigate,
}: {
  pathname: string;
  permissions: BillingAdminPermissions | null;
  role: string | null;
  onNavigate?: () => void;
}) {
  return (
    <>
      {billingNavLinks
        .filter((link) => !link.permissions?.length || hasAnyPermission(permissions, link.permissions, role))
        .map((link) => {
          const active = pathname === link.href || pathname.startsWith(link.href + "/");
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onNavigate}
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
    </>
  );
}

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
  const { isCashier, permissions, role } = useRole();
  const [menuOpen, setMenuOpen] = useState(false);

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
    if (!canAccessBillingPath(pathname, permissions, role)) {
      router.push("/billing");
    }
  }, [pathname, permissions, role, router, user]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const logout = async () => {
    await billingApi.logout();
    setUser(null);
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text-primary)]">
      {menuOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/50"
          aria-label="Close menu"
          onClick={() => setMenuOpen(false)}
        />
      ) : null}

      <aside
        className={`fixed left-0 top-0 z-50 h-screen w-[260px] max-w-[85vw] bg-[var(--surface)] border-r border-[var(--border)] transform transition-transform duration-200 ease-out ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-4 py-4 border-b border-[var(--border)]">
          <Link href="/dashboard" className="flex items-center gap-2 min-w-0" onClick={() => setMenuOpen(false)}>
            <img src="/1775556627469.png" alt="Sowaat" className="h-8 w-auto object-contain shrink-0" />
            <span className="font-semibold truncate">SOWAAT POS</span>
          </Link>
          <button
            type="button"
            className="h-9 w-9 rounded border border-[var(--border)] text-lg leading-none hover:border-[var(--gold)]"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          >
            ×
          </button>
        </div>
        <nav className="p-2 space-y-1 overflow-y-auto max-h-[calc(100vh-4rem)]">
          <NavLinks pathname={pathname} permissions={permissions} role={role} onNavigate={() => setMenuOpen(false)} />
        </nav>
      </aside>

      <div>
        <header className="sticky top-0 z-30 min-h-14 border-b border-[var(--border)] bg-[var(--surface)] px-3 sm:px-4 py-2 flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            type="button"
            className="h-10 w-10 shrink-0 rounded border border-[var(--border)] flex flex-col items-center justify-center gap-1 hover:border-[var(--gold)]"
            aria-label="Open menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className={`block h-0.5 w-5 bg-current transition-transform ${menuOpen ? "translate-y-1.5 rotate-45" : ""}`} />
            <span className={`block h-0.5 w-5 bg-current transition-opacity ${menuOpen ? "opacity-0" : ""}`} />
            <span className={`block h-0.5 w-5 bg-current transition-transform ${menuOpen ? "-translate-y-1.5 -rotate-45" : ""}`} />
          </button>
          <Link href="/dashboard" className="flex items-center shrink-0" aria-label="Sowaat home">
            <img src="/1775556627469.png" alt="Sowaat" className="h-8 w-auto object-contain" />
          </Link>
          <h1 className="font-semibold text-sm sm:text-base flex-1 min-w-0">{title}</h1>
          <div className="text-xs sm:text-sm flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-end">
            <span className="text-[var(--text-secondary)]">
              {user?.name || "Billing Admin"} {isCashier ? "(Cashier)" : ""}
            </span>
            <button onClick={logout} className="text-[var(--gold)] hover:underline">
              Logout
            </button>
          </div>
        </header>
        <main className="p-3 sm:p-4">{children}</main>
      </div>
    </div>
  );
}
