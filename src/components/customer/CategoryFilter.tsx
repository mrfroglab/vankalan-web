import React from 'react';

interface CategoryFilterProps {
  categories: string[];
  selected: string;
  onSelect: (category: string) => void;
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
            className={`min-h-11 px-4 py-2 text-xs sm:text-sm font-semibold rounded-full border transition-all whitespace-nowrap cursor-pointer ${
              isSelected
                ? 'bg-ink text-white border-ink shadow-xs'
                : 'bg-white text-ink border-line hover:bg-cream'
            }`}
          >
            {cat}
          </button>
        );
      })}
    </nav>
  );
}
