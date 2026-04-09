import { redirect } from 'next/navigation';
import { requireServerUser } from '@/lib/server-auth';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireServerUser();

  if (!user) {
    redirect('/auth');
  }

  if (!user.isAdmin) {
    redirect('/');
  }

  return children;
}
