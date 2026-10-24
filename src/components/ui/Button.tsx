import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'orange' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'gold';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      isLoading = false,
      disabled,
      className = '',
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-semibold transition-all rounded-xl cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 select-none';

    // Standar ergonomi mobile: minimal touch target 44px
    const sizeStyles = {
      sm: 'min-h-[40px] px-3.5 py-2 text-xs gap-1.5',
      md: 'min-h-[44px] px-4 py-2.5 text-sm gap-2',
      lg: 'min-h-[48px] px-5 py-3 text-base gap-2.5',
    };

    const variantStyles = {
      primary:
        'bg-brand-green text-white hover:bg-brand-green-hover active:scale-[0.98]',
      orange:
        'bg-brand-orange text-white hover:bg-brand-orange-hover active:scale-[0.98]',
      gold: 'bg-[#f5c943] text-[#242321] hover:bg-[#e8b82b] font-bold active:scale-[0.98] shadow-sm',
      secondary:
        'bg-white text-ink border border-border-line hover:bg-soft-green active:scale-[0.98]',
      outline:
        'bg-white text-ink border border-border-line hover:bg-neutral-50 active:scale-[0.98]',
      danger:
        'bg-danger-red text-white hover:opacity-90 active:scale-[0.98]',
      ghost:
        'bg-transparent text-ink hover:bg-black/5 active:scale-[0.98]',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${
          fullWidth ? 'w-full' : ''
        } ${className}`}
        {...props}
      >
        {isLoading ? (
          <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
        ) : null}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
