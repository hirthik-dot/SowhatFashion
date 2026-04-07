"use client";

import BillingShell from "@/components/layout/BillingShell";
import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useRole } from "@/hooks/useRole";

export default function AdminPage() {
  const router = useRouter();
  const { isAdmin } = useRole();
  useEffect(() => {
    if (!isAdmin) router.push("/billing");
  }, [isAdmin, router]);

  if (!isAdmin) return null;

  const items = [
    { href: "/admin/inventory", label: "Inventory" },
    { href: "/admin/suppliers", label: "Suppliers" },
    { href: "/admin/categories", label: "Categories" },
    { href: "/admin/salesmen", label: "Salesmen" },
    { href: "/admin/staff", label: "Staff" },
  ];
  return (
    <BillingShell title="Admin">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {items.map((item) => (
          <Link key={item.href} href={item.href} className="pos-card p-4 hover:border-[var(--gold)]">
            {item.label}
          </Link>
        ))}
      </div>
    </BillingShell>
  );
}
