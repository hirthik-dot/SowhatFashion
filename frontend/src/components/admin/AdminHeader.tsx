'use client';

import { useAuth } from '@/hooks/useAuth';
import { adminLogout } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { Menu } from 'lucide-react';
import { useAdminUIStore } from '@/lib/admin-store';

export default function AdminHeader({ title }: { title: string }) {
  const { admin } = useAuth();
  const router = useRouter();
  const { toggleSidebar } = useAdminUIStore();

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
    <header className="bg-white border-b border-[var(--border)] h-16 flex items-center justify-between px-4 md:px-6 sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <button 
          className="md:hidden p-1 -ml-1 text-[var(--text-secondary)] hover:text-black"
          onClick={toggleSidebar}
        >
          <Menu size={24} />
        </button>
        <h2 className="text-lg md:text-xl font-bold truncate">{title}</h2>
      </div>
      
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium text-[var(--text-secondary)] hidden sm:block">
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
