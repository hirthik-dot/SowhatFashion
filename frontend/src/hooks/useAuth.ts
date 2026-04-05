'use client';

import { useState, useEffect } from 'react';
import { adminMe } from '@/lib/api';

export function useAuth() {
  const [admin, setAdmin] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const data = await adminMe();
      setAdmin(data);
    } catch {
      setAdmin(null);
    } finally {
      setLoading(false);
    }
  };

  return { admin, loading, checkAuth };
}
