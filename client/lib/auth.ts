'use client';

import { createContext, useContext } from 'react';

export interface AuthUser {
  id: number;
  phone: string;
  name?: string;
  isAdmin?: boolean;
}

export interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  token: null,
  login: () => {},
  logout: () => {},
  isAuthenticated: false,
});

export const useAuth = () => useContext(AuthContext);

export function getStoredAuth(): { token: string; user: AuthUser } | null {
  if (typeof window === 'undefined') return null;

  const token = localStorage.getItem('zindstay_token');
  const userStr = localStorage.getItem('zindstay_user');

  if (!token || !userStr) return null;

  return { token, user: JSON.parse(userStr) };
}
