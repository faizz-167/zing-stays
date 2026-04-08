'use client';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import Button from '@/components/ui/Button';
import SectionLabel from '@/components/ui/SectionLabel';

export default function DashboardPage() {
  const { user } = useAuth();
  return (
    <div>
      <SectionLabel>Dashboard</SectionLabel>
      <h1 className="font-display text-3xl mb-2">Welcome, {user?.name || 'there'}</h1>
      <p className="font-sans text-muted-foreground mb-10">{user?.phone}</p>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="border border-border rounded-xl p-8">
          <h2 className="font-display text-xl mb-2">Your Listings</h2>
          <p className="font-sans text-sm text-muted-foreground mb-6">Manage the rooms you&apos;ve posted</p>
          <Link href="/dashboard/listings"><Button variant="secondary">View My Rooms</Button></Link>
        </div>
        <div className="border border-border rounded-xl p-8">
          <h2 className="font-display text-xl mb-2">Post a New Room</h2>
          <p className="font-sans text-sm text-muted-foreground mb-6">List your PG, hostel, or room for free</p>
          <Link href="/dashboard/listings/new"><Button>+ Post a Room</Button></Link>
        </div>
      </div>
    </div>
  );
}
