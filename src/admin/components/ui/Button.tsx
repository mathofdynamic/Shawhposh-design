import React from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'brass';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'secondary',
      size = 'md',
      isLoading = false,
      disabled = false,
      leftIcon,
      rightIcon,
      className = '',
      type = 'button',
      ...props
    },
    ref
  ) => {
    // Base styles: clear focus ring, responsive touch-target, zero novelty styling
    const baseClasses =
      'inline-flex items-center justify-center gap-2 font-medium tracking-normal transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ba8d3d] focus-visible:ring-offset-1 focus-visible:ring-offset-[#0e0d0c] motion-reduce:transition-none';

    const sizeClasses: Record<ButtonSize, string> = {
      sm: 'px-3 py-1.5 text-xs rounded-lg min-h-[32px]',
      md: 'px-4 py-2 text-xs md:text-sm rounded-xl min-h-[40px]',
      lg: 'px-5 py-2.5 text-sm md:text-base rounded-xl min-h-[48px]',
    };

    const variantClasses: Record<ButtonVariant, string> = {
      primary:
        'bg-[#f5f2eb] text-[#141211] hover:bg-white active:scale-[0.98] shadow-sm font-semibold dark:bg-[#f5f2eb] dark:text-[#12100e]',
      brass:
        'bg-[#ba8d3d] text-[#0e0d0c] hover:bg-[#c99c4c] active:scale-[0.98] font-bold shadow-sm',
      secondary:
        'bg-white/5 hover:bg-white/10 text-white/90 border border-white/10 active:scale-[0.98]',
      outline:
        'bg-transparent hover:bg-white/5 text-white/80 border border-white/15 active:scale-[0.98]',
      ghost:
        'bg-transparent hover:bg-white/5 text-white/70 hover:text-white active:scale-[0.98]',
      destructive:
        'bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30 active:scale-[0.98] font-semibold',
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-current shrink-0" />
        ) : (
          leftIcon && <span className="shrink-0">{leftIcon}</span>
        )}
        <span>{children}</span>
        {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);
Button.displayName = 'Button';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  'aria-label': string; // Enforce accessible labeling
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      children,
      variant = 'ghost',
      size = 'md',
      isLoading = false,
      disabled = false,
      className = '',
      type = 'button',
      'aria-label': ariaLabel,
      ...props
    },
    ref
  ) => {
    const sizeClasses: Record<ButtonSize, string> = {
      sm: 'w-8 h-8 rounded-lg text-xs',
      md: 'w-10 h-10 rounded-xl text-sm',
      lg: 'w-12 h-12 rounded-xl text-base',
    };

    const variantClasses: Record<ButtonVariant, string> = {
      primary: 'bg-[#f5f2eb] text-[#141211] hover:bg-white active:scale-[0.96]',
      brass: 'bg-[#ba8d3d] text-[#0e0d0c] hover:bg-[#c99c4c] active:scale-[0.96]',
      secondary: 'bg-white/5 hover:bg-white/10 text-white/90 border border-white/10 active:scale-[0.96]',
      outline: 'bg-transparent hover:bg-white/5 text-white/80 border border-white/15 active:scale-[0.96]',
      ghost: 'bg-transparent hover:bg-white/5 text-white/70 hover:text-white active:scale-[0.96]',
      destructive: 'bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30 active:scale-[0.96]',
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        aria-label={ariaLabel}
        title={ariaLabel}
        className={`inline-flex items-center justify-center transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ba8d3d] focus-visible:ring-offset-1 focus-visible:ring-offset-[#0e0d0c] ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
        {...props}
      >
        {isLoading ? <Loader2 className="w-4 h-4 animate-spin text-current" /> : children}
      </button>
    );
  }
);
IconButton.displayName = 'IconButton';
