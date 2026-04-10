'use client';

import { createContext, useContext } from 'react';

export interface AuthUser {
  id: number;
  email: string;
  phone?: string | null;
  name?: string | null;
  emailVerified: boolean;
  isPosterVerified: boolean;
  isAdmin: boolean;
}

export interface AuthContextValue {
  user: AuthUser | null;
  login: (user: AuthUser) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isReady: boolean;
}

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  login: () => {},
  logout: () => {},
  isAuthenticated: false,
  isReady: false,
});

export const useAuth = () => useContext(AuthContext);
