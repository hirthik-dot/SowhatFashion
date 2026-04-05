'use client';
import { useEffect } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import AuthModal from '@/components/shared/AuthModal';
import { normalizeAuthUser } from '@/lib/auth-user';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setWishlist } = useAuthStore();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const url = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        const headers: HeadersInit = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(`${url}/api/auth/me`, {
          credentials: 'include',
          headers,
        });
        if (res.ok) {
           const data = await res.json();
           if (data.success && data.user) {
             const normalized = normalizeAuthUser(data.user);
             if (normalized) setUser(normalized);
             if (data.user.wishlist) {
                const ids = data.user.wishlist.map((w: { _id?: string } | string) =>
                  typeof w === 'object' && w && '_id' in w ? String(w._id) : String(w)
                );
                setWishlist(ids);
             }
           }
        }
      } catch (err) {
        console.error('Failed to restore session:', err);
      }
    };
    checkAuth();
  }, [setUser, setWishlist]);

  return (
    <>
      {children}
      <AuthModal />
    </>
  );
}
