'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { normalizeAuthUser } from '@/lib/auth-user';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = useAuthStore((state) => state.redirectUrl);
  const setRedirectUrl = useAuthStore((state) => state.setRedirectUrl);

  useEffect(() => {
    const token = searchParams.get('token');
    const error = searchParams.get('error');

    if (error) {
      console.error('Google Auth Failed:', error);
      router.push('/');
      return;
    }

    if (token) {
      // Store token in cookies so the API can read it automatically
      document.cookie = `user_token=${token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
      // Also save to localStorage
      localStorage.setItem('token', token);

      const fetchUser = async () => {
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/me`, {
            credentials: 'include',
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          const data = await res.json();
          if (data.success && data.user) {
            const normalized = normalizeAuthUser(data.user);
            if (normalized) useAuthStore.getState().setUser(normalized);
          }
        } catch (err) {
          console.error('Failed to fetch user:', err);
        } finally {
          const destination =
            redirectUrl && redirectUrl.startsWith('/') ? redirectUrl : '/';
          setRedirectUrl(null);
          router.replace(destination);
        }
      };

      fetchUser();
    } else {
      router.push('/');
    }
  }, [searchParams, router, redirectUrl, setRedirectUrl]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-2 text-gray-900">Authenticating...</h2>
        <p className="text-gray-500 mb-6">Please wait while we log you in.</p>
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900 mx-auto"></div>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900"></div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}
