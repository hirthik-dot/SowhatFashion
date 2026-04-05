'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';

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
      // We set max-age to 7 days
      document.cookie = `user_token=${token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
      
      const destination = redirectUrl || '/';
      setRedirectUrl(null);
      
      // Force reload to let the root layout fetch /api/auth/me and hydrate the store
      window.location.href = destination;
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
