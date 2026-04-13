import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  accentTop?: boolean;
  hoverEffect?: boolean;
  elevated?: boolean;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, accentTop, hoverEffect, elevated, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'bg-card border border-border rounded-xl transition-all duration-300 ease-out relative overflow-hidden',
        accentTop && 'border-t-2 border-t-accent',
        elevated ? 'shadow-md' : 'shadow-sm',
        hoverEffect && 'hover:shadow-hover hover:border-accent/20 hover:-translate-y-1.5 cursor-pointer group',
        className,
      )}
      {...props}
    >
      {hoverEffect && (
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      )}
      {children}
    </div>
  ),
);
Card.displayName = 'Card';
export default Card;
