'use client';

import { useAuth } from '@/hooks/useAuth';
import { adminLogout } from '@/lib/api';
import { useRouter } from 'next/navigation';

export default function AdminHeader({ title }: { title: string }) {
  const { admin } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await adminLogout();
      localStorage.removeItem('admin_token');
      window.location.href = '/admin/login';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <header className="bg-white border-b border-[var(--border)] h-16 flex items-center justify-between px-6 sticky top-0 z-30">
      <h2 className="text-xl font-bold">{title}</h2>
      
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium text-[var(--text-secondary)]">
          {admin?.email}
        </span>
        <button 
          onClick={handleLogout}
          className="text-sm text-[var(--sale-red)] hover:bg-[var(--sale-red)] hover:text-white px-3 py-1.5 rounded transition-colors"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
