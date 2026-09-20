import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--color-chalk)]/50 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-[var(--color-chalk)] text-[var(--color-paper)] hover:opacity-90',
        destructive:
          'bg-[var(--color-red-pen)] text-white hover:opacity-90 focus-visible:ring-[var(--color-red-pen)]/40',
        outline:
          'border-2 border-[var(--color-ink)] bg-[var(--color-paper)] hover:bg-white',
        secondary: 'bg-[var(--color-highlighter)] text-[var(--color-ink)]',
        ghost: 'hover:bg-black/5',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-11 px-6',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

function Button({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<'button'> & VariantProps<typeof buttonVariants>) {
  return (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
