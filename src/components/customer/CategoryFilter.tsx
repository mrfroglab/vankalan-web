import React from 'react';
import { Category } from '@/types';

interface CategoryFilterProps {
  categories: (Category | 'Semua')[];
  selected: Category | 'Semua';
  onSelect: (category: Category | 'Semua') => void;
}

export function CategoryFilter({
  categories,
  selected,
  onSelect,
}: CategoryFilterProps) {
  return (
    <nav
      aria-label="Filter kategori menu"
      className="flex gap-2 overflow-x-auto pb-1 pt-1 scrollbar-none select-none"
    >
      {categories.map((cat) => {
        const isSelected = selected === cat;
        return (
          <button
            key={cat}
            type="button"
            onClick={() => onSelect(cat)}
            className={`min-h-[44px] px-4 py-2 text-xs sm:text-sm font-semibold rounded-full border transition-all whitespace-nowrap cursor-pointer ${
              isSelected
                ? 'bg-brand-green text-white border-brand-green shadow-xs'
                : 'bg-white text-ink border-border-line hover:bg-soft-green'
            }`}
          >
            {cat}
          </button>
        );
      })}
    </nav>
  );
}
