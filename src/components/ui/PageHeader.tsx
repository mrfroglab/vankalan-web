import React from 'react';

/** Judul halaman standar: (breadcrumb) + judul serif + deskripsi + aksi di kanan. */
export function PageHeader({
  breadcrumb,
  title,
  description,
  actions,
  className = '',
}: {
  breadcrumb?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between ${className}`}>
      <div className="min-w-0">
        {breadcrumb && <div className="mb-2">{breadcrumb}</div>}
        <h1 className="font-editorial text-2xl sm:text-3xl font-bold tracking-tight text-ink">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm text-muted leading-relaxed">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
