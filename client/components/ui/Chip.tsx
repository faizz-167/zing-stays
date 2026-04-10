'use client';

interface ChipProps {
  label: string;
  active?: boolean;
  onRemove?: () => void;
  onClick?: () => void;
  disabled?: boolean;
}

export function Chip({ label, active = false, onRemove, onClick, disabled = false }: ChipProps) {
  const isRemovable = typeof onRemove === 'function';

  const baseClasses =
    'inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1';

  const activeClasses = active
    ? 'bg-blue-600 text-white'
    : 'bg-gray-100 text-gray-700 hover:bg-gray-200';

  const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'cursor-pointer';

  if (isRemovable) {
    return (
      <span className={`${baseClasses} bg-blue-100 text-blue-800 ${disabledClasses}`}>
        {label}
        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          aria-label={`Remove ${label}`}
          className="ml-1 rounded-full p-0.5 hover:bg-blue-200 focus:outline-none focus-visible:ring-1"
        >
          <svg className="h-3 w-3" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
            <path d="M9 3L3 9M3 3l6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${activeClasses} ${disabledClasses}`}
    >
      {label}
    </button>
  );
}
