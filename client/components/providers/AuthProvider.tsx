'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AuthContext, AuthUser } from '@/lib/auth';
import { api } from '@/lib/api';

interface ProviderState {
  user: AuthUser | null;
  isReady: boolean;
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ProviderState>({ user: null, isReady: false });

  useEffect(() => {
    api.get<{ user: AuthUser }>('/auth/me')
      .then(({ user }) => setState({ user, isReady: true }))
      .catch(() => setState({ user: null, isReady: true }));
  }, []);

  const login = useCallback((user: AuthUser) => {
    setState({ user, isReady: true });
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout', {});
    } catch {
      // ignore — clear state regardless
    }
    setState({ user: null, isReady: true });
  }, []);

  const value = useMemo(
    () => ({
      user: state.user,
      login,
      logout,
      isAuthenticated: !!state.user,
      isReady: state.isReady,
    }),
    [state, login, logout],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
