import SectionLabel from '@/components/ui/SectionLabel';
import ListingForm from '@/components/forms/ListingForm';

export default function NewListingPage() {
  return (
    <div>
      <SectionLabel>Post a Room</SectionLabel>
      <h1 className="font-display text-3xl mb-10">Create New Listing</h1>
      <ListingForm />
    </div>
  );
}
