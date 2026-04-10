import { cookies } from 'next/headers';

export interface ServerAuthUser {
  id: number;
  email: string;
  phone?: string | null;
  name?: string;
  posterEmailVerified?: boolean;
  isPosterVerified?: boolean;
  isAdmin?: boolean;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export async function requireServerUser(): Promise<ServerAuthUser | null> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  if (!cookieHeader) {
    return null;
  }

  const res = await fetch(`${API_BASE_URL}/auth/get-session`, {
    headers: {
      Cookie: cookieHeader,
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    return null;
  }

  const data = await res.json() as { user?: ServerAuthUser | null };
  return data.user ?? null;
}
