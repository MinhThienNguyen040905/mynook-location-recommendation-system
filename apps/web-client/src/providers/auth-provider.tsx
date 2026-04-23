'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { getProfile } from '@/lib/api/auth';
import { getCookie } from '@/lib/api/client';
import { ACCESS_TOKEN_KEY } from '@/lib/constants';

/**
 * AuthProvider — tự động load profile khi có access_token trong cookie.
 * Đặt ở root layout để auth state luôn sẵn sàng.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setUser = useAuthStore((s) => s.setUser);
  const setLoading = useAuthStore((s) => s.setLoading);

  useEffect(() => {
    const token = getCookie(ACCESS_TOKEN_KEY);
    if (!token) {
      setUser(null);
      return;
    }

    getProfile()
      .then((user) => setUser(user))
      .catch(() => setUser(null));
  }, [setUser, setLoading]);

  return <>{children}</>;
}
