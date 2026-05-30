"use client";

import BillingShell from "@/components/layout/BillingShell";
import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { adminHubLinks } from "@/lib/billing-access";
import { useRole } from "@/hooks/useRole";

export default function AdminPage() {
  const router = useRouter();
  const { canAny } = useRole();
  const canAccess = canAny("canManageAdmins", "canManageSuppliersCategories");
  useEffect(() => {
    if (!canAccess) router.push("/billing");
  }, [canAccess, router]);

  if (!canAccess) return null;

  const items = adminHubLinks.filter((item) => canAny(...item.permissions));
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
