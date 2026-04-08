'use client';

import { useEffect, useState } from 'react';
import { AuthContext, AuthUser, getStoredAuth } from '@/lib/auth';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const stored = getStoredAuth();
    if (stored) {
      setToken(stored.token);
      setUser(stored.user);
    }
  }, []);

  const login = (newToken: string, newUser: AuthUser) => {
    localStorage.setItem('zindstay_token', newToken);
    localStorage.setItem('zindstay_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem('zindstay_token');
    localStorage.removeItem('zindstay_user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}
