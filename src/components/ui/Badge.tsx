import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'danger' | 'neutral' | 'info' | 'gold';
  className?: string;
  dot?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function Badge({
  children,
  variant = 'neutral',
  className = '',
  dot = false,
  size = 'md',
}: BadgeProps) {
  const variantStyles = {
    success: 'bg-success-soft text-success-ink border-success-line',
    warning: 'bg-gold-soft text-gold-ink border-gold-line',
    danger: 'bg-danger-soft text-danger-ink border-danger-line',
    neutral: 'bg-cream text-ink border-line',
    info: 'bg-info-soft text-info-ink border-info-line',
    gold: 'bg-gold text-ink border-rating font-bold',
  };

  const dotStyles = {
    success: 'bg-success',
    warning: 'bg-gold-ink',
    danger: 'bg-danger',
    neutral: 'bg-muted',
    info: 'bg-info',
    gold: 'bg-ink',
  };

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-2xs',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold rounded-full border ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {dot ? (
        <span
          className={`w-1.5 h-1.5 rounded-full ${dotStyles[variant]}`}
          aria-hidden="true"
        />
      ) : null}
      {children}
    </span>
  );
}
