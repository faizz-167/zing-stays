'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AuthContext, AuthUser } from '@/lib/auth';
import { authClient } from '@/lib/auth-client';

function mapUser(user: Record<string, unknown> | null | undefined): AuthUser | null {
  if (!user) {
    return null;
  }

  return {
    id: Number(user.id),
    email: String(user.email),
    phone: typeof user.phone === 'string' ? user.phone : null,
    name: typeof user.name === 'string' ? user.name : null,
    emailVerified: Boolean(user.emailVerified),
    posterEmailVerified: Boolean(user.posterEmailVerified),
    isPosterVerified: Boolean(user.isPosterVerified),
    isAdmin: Boolean(user.isAdmin),
  };
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data, isPending, refetch } = authClient.useSession();
  const user = mapUser((data?.user ?? null) as Record<string, unknown> | null);
  // Prevent premature redirects: on the server and during hydration there are
  // no cookies, so isPending may be false with no data. Only mark ready after
  // the component has mounted on the client and the session fetch settles.
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const login = useCallback((nextUser: AuthUser) => {
    void nextUser;
    void refetch();
  }, [refetch]);

  const logout = useCallback(async () => {
    await authClient.signOut();
    await refetch();
  }, [refetch]);

  const value = useMemo(
    () => ({
      user,
      login,
      logout,
      isAuthenticated: !!user,
      isReady: mounted && !isPending,
    }),
    [user, login, logout, isPending, mounted],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
