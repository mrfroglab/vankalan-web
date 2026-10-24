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
    success: 'bg-[#e2edd8] text-[#1c4d25] border-[#c5dcba]',
    warning: 'bg-[#fef1dc] text-[#7a4b08] border-[#f4d5a7]',
    danger: 'bg-[#fde7e4] text-[#91251c] border-[#f7c5be]',
    neutral: 'bg-soft-green text-ink border-border-line',
    info: 'bg-[#e7f0fa] text-[#1a4a75] border-[#c6def4]',
    gold: 'bg-[#f8d84f] text-[#242321] border-[#e9b82f] font-bold',
  };

  const dotStyles = {
    success: 'bg-[#297838]',
    warning: 'bg-[#a36307]',
    danger: 'bg-[#b64035]',
    neutral: 'bg-[#526058]',
    info: 'bg-[#1e619d]',
    gold: 'bg-[#242321]',
  };

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-[11px]',
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
