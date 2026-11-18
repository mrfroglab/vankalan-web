'use client';

import React from 'react';

export interface TabItem<T extends string> {
  value: T;
  label: string;
  count?: number;
}

/** Tab standar (chip): dipakai untuk filter status/kategori di semua halaman. */
export function Tabs<T extends string>({
  items,
  value,
  onChange,
  ariaLabel,
  className = '',
}: {
  items: TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <div role="tablist" aria-label={ariaLabel} className={`flex items-center gap-2 overflow-x-auto pb-0.5 ${className}`}>
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.value)}
            className={`min-h-10 px-4 rounded-full text-xs font-bold inline-flex items-center gap-2 shrink-0 transition-colors cursor-pointer border ${
              active
                ? 'bg-gold border-gold text-ink'
                : 'bg-white border-line text-muted hover:text-ink hover:bg-surface-muted'
            }`}
          >
            {item.label}
            {typeof item.count === 'number' && (
              <span
                className={`min-w-5 h-5 px-1.5 rounded-full text-2xs font-bold inline-flex items-center justify-center ${
                  active ? 'bg-ink text-white' : 'bg-cream text-muted'
                }`}
              >
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
