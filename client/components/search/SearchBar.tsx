'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed) {
      router.push(`/listings?q=${encodeURIComponent(trimmed)}`);
    } else {
      router.push('/listings');
    }
  };

  return (
    <form onSubmit={handleSearch} className="flex gap-3 w-full max-w-2xl">
      <Input
        type="text"
        placeholder="Search by city, locality or landmark..."
        value={query}
        onChange={e => setQuery(e.target.value)}
        className="flex-1"
      />
      <Button type="submit" size="md">Search</Button>
    </form>
  );
}
