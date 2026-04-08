import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center font-sans font-medium touch-manipulation transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
          {
            'min-h-[44px] px-4 py-2 text-sm': size === 'sm',
            'min-h-[44px] px-6 py-3 text-base': size === 'md',
            'min-h-[52px] px-8 py-4 text-lg': size === 'lg',
          },
          {
            'bg-accent text-accent-foreground rounded-md shadow-sm hover:bg-accent-secondary hover:shadow-md active:translate-y-0': variant === 'primary',
            'bg-transparent border border-foreground text-foreground rounded-md hover:bg-muted hover:border-accent hover:text-accent': variant === 'secondary',
            'bg-transparent text-muted-foreground hover:text-foreground hover:underline underline-offset-4 decoration-accent': variant === 'ghost',
          },
          className,
        )}
        {...props}
      >
        {children}
      </button>
    );
  },
);
Button.displayName = 'Button';
export default Button;
