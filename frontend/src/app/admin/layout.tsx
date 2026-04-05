'use client';

import { useAuth } from '@/hooks/useAuth';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { admin, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !admin && pathname !== '/admin/login') {
      router.push('/admin/login');
    }
  }, [admin, loading, pathname, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--surface)]">
        <div className="animate-spin w-8 h-8 border-4 border-black border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!admin && pathname !== '/admin/login') {
    return null; // Will redirect in useEffect
  }

  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-[var(--surface)] text-[var(--text-primary)]">
      <AdminSidebar />
      <div className="md:ml-[260px] flex flex-col min-h-screen">
        <main className="flex-grow">
          {children}
        </main>
      </div>
    </div>
  );
}
