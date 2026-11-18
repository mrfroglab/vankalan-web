import React from 'react';

/**
 * Tombol standar seluruh aplikasi.
 * - gold    : aksi utama (satu per area)
 * - outline : aksi sekunder
 * - dark    : aksi tegas netral (jarang; mis. di atas latar kuning)
 * - danger  : aksi merusak (hapus, batalkan)
 * - ghost   : aksi tersier tanpa bingkai
 * Ukuran: sm 40px, md 44px, lg 48px (target sentuh minimal 40px).
 */
export type ButtonVariant = 'gold' | 'outline' | 'dark' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

/** Nama varian lama tetap diterima agar pemanggil lama tidak rusak. */
type LegacyVariant = 'primary' | 'orange' | 'secondary';

const LEGACY: Record<LegacyVariant, ButtonVariant> = { primary: 'gold', orange: 'gold', secondary: 'outline' };

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-full font-bold whitespace-nowrap transition-colors cursor-pointer select-none active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100';

const SIZES: Record<ButtonSize, string> = {
  sm: 'min-h-10 px-4 text-xs',
  md: 'min-h-11 px-5 text-sm',
  lg: 'min-h-12 px-6 text-sm sm:text-base',
};

const VARIANTS: Record<ButtonVariant, string> = {
  gold: 'bg-gold text-ink hover:bg-gold-hover',
  outline: 'bg-white text-ink border border-line hover:bg-surface-muted',
  dark: 'bg-ink text-white hover:bg-ink-hover',
  danger: 'bg-white text-danger border border-danger-line hover:bg-danger-soft',
  ghost: 'bg-transparent text-muted hover:text-ink hover:bg-cream',
};

/** Kelas tombol untuk elemen lain (mis. <Link>) agar tampil identik dengan <Button>. */
export function buttonClass(
  variant: ButtonVariant | LegacyVariant = 'gold',
  size: ButtonSize = 'md',
  extra = ''
): string {
  const v = (LEGACY as Record<string, ButtonVariant>)[variant] ?? (variant as ButtonVariant);
  return `${BASE} ${SIZES[size]} ${VARIANTS[v]} ${extra}`.trim();
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant | LegacyVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { children, variant = 'gold', size = 'md', fullWidth = false, isLoading = false, disabled, className = '', type, ...props },
    ref
  ) => (
    <button
      ref={ref}
      type={type ?? 'button'}
      disabled={disabled || isLoading}
      className={buttonClass(variant, size, `${fullWidth ? 'w-full' : ''} ${className}`)}
      {...props}
    >
      {isLoading ? (
        <span
          className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"
          aria-hidden="true"
        />
      ) : null}
      {children}
    </button>
  )
);

Button.displayName = 'Button';
