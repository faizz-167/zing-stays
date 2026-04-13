import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export function buttonClassName({
  variant = 'primary',
  size = 'md',
  className,
}: {
  variant?: ButtonProps['variant'];
  size?: ButtonProps['size'];
  className?: string;
}) {
  return cn(
    'inline-flex items-center justify-center rounded-md font-sans font-medium touch-manipulation transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
    {
      'min-h-[44px] px-4 py-2 text-sm': size === 'sm',
      'min-h-[44px] px-6 py-3 text-base': size === 'md',
      'min-h-[52px] px-8 py-4 text-lg': size === 'lg',
    },
    {
      'bg-accent text-accent-foreground shadow-sm hover:bg-accent-secondary hover:shadow-hover hover:-translate-y-[1px] active:scale-[0.98] active:translate-y-0 overflow-hidden relative group/btn': variant === 'primary',
      'bg-transparent border-2 border-foreground text-foreground hover:bg-muted hover:border-accent hover:text-accent hover:-translate-y-[1px] active:scale-[0.98]': variant === 'secondary',
      'bg-transparent text-muted-foreground hover:text-foreground hover:underline underline-offset-4 decoration-accent active:scale-[0.98]': variant === 'ghost',
    },
    className,
  );
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={buttonClassName({ variant, size, className })}
        {...props}
      >
        {variant === 'primary' && (
          <span
            className="absolute inset-0 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700 ease-out bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none"
            aria-hidden="true"
          />
        )}
        <span className="relative z-10 inline-flex items-center justify-center">{children}</span>
      </button>
    );
  },
);
Button.displayName = 'Button';
export default Button;
