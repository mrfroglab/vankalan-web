import React from 'react';
import Link from 'next/link';

/** Breadcrumb standar halaman pelanggan. Item terakhir = halaman aktif. */
export function Breadcrumb({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-2xs font-semibold uppercase tracking-wider text-muted">
      <ol className="flex items-center gap-1.5 flex-wrap">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={item.label} className="flex items-center gap-1.5">
              {item.href && !last ? (
                <Link href={item.href} className="hover:text-ink transition-colors">
                  {item.label}
                </Link>
              ) : (
                <span className={last ? 'text-ink' : undefined} aria-current={last ? 'page' : undefined}>
                  {item.label}
                </span>
              )}
              {!last && <span aria-hidden="true">/</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
