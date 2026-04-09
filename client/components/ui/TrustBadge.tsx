import { cn } from '@/lib/utils';

const BADGE_CONFIG = {
  verified_owner: { label: 'Verified Owner', color: 'text-green-700 bg-green-50 border-green-200' },
  well_detailed: { label: 'Well Detailed', color: 'text-accent bg-amber-50 border-amber-200' },
  recently_updated: { label: 'Recently Updated', color: 'text-blue-700 bg-blue-50 border-blue-200' },
} as const;

type BadgeType = keyof typeof BADGE_CONFIG;

export default function TrustBadge({ type }: { type: BadgeType }) {
  const config = BADGE_CONFIG[type];
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded border text-xs font-mono font-medium uppercase tracking-wide', config.color)}>
      {config.label}
    </span>
  );
}
