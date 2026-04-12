'use client';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

interface SearchFormValues {
  query: string;
}

export default function SearchBar() {
  const router = useRouter();
  const { register, handleSubmit } = useForm<SearchFormValues>({
    defaultValues: { query: '' },
  });

  const handleSearch = ({ query }: SearchFormValues) => {
    const trimmed = query.trim();
    if (trimmed) {
      router.push(`/listings?q=${encodeURIComponent(trimmed)}`);
    } else {
      router.push('/listings');
    }
  };

  return (
    <form onSubmit={handleSubmit(handleSearch)} className="flex gap-3 w-full max-w-2xl">
      <Input
        type="text"
        placeholder="Search by city, locality or landmark..."
        className="flex-1"
        {...register('query')}
      />
      <Button type="submit" size="md">Search</Button>
    </form>
  );
}
