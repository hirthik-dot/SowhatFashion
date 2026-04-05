'use client';
import { useEffect } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import AuthModal from '@/components/shared/AuthModal';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setWishlist } = useAuthStore();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const url = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';
        const res = await fetch(`${url}/api/auth/me`, {
          credentials: 'include',
        });
        if (res.ok) {
           const data = await res.json();
           if (data.success && data.user) {
             setUser(data.user);
             if (data.user.wishlist) {
                // assume wishlist comes populated or as IDs. Let's map to IDs if populated:
                const ids = data.user.wishlist.map((w: any) => w._id || w);
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
