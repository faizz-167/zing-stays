'use client';

import { createAuthClient } from 'better-auth/react';
import { emailOTPClient } from 'better-auth/client/plugins';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export const authClient = createAuthClient({
  baseURL: `${API_BASE_URL}/auth`,
  fetchOptions: {
    credentials: 'include',
  },
  plugins: [emailOTPClient()],
});
