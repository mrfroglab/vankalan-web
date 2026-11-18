import React from 'react';
import type { LucideIcon } from 'lucide-react';

/** Tampilan "kosong" standar. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = '',
}: {
  icon: LucideIcon;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-white border border-line rounded-2xl shadow-card px-6 py-10 sm:py-12 text-center ${className}`}>
      <div className="w-14 h-14 rounded-full bg-canvas border border-line flex items-center justify-center mx-auto mb-4 text-icon">
        <Icon className="w-6 h-6" aria-hidden="true" />
      </div>
      <h3 className="text-base font-bold text-ink">{title}</h3>
      {description && <p className="mt-1.5 text-sm text-muted max-w-sm mx-auto leading-relaxed">{description}</p>}
      {action && <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}
