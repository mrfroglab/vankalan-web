'use client';

import { buttonClass } from '@/components/ui/Button';
import React from 'react';
import { ChevronDown, SlidersHorizontal } from 'lucide-react';

export type SortOption = 'popular' | 'price-asc' | 'price-desc' | 'rating';

export interface CatalogToolbarProps {
  totalItems: number;
  sortBy?: SortOption;
  sortOption?: SortOption;
  onSortChange: (sort: SortOption) => void;
  onOpenFilterMobile?: () => void;
  onOpenMobileFilter?: () => void;
  activeFilterCount?: number;
  className?: string;
}

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'popular', label: 'Terpopuler' },
  { value: 'rating', label: 'Rating Tertinggi' },
  { value: 'price-asc', label: 'Harga Terendah' },
  { value: 'price-desc', label: 'Harga Tertinggi' },
];

export function CatalogToolbar({
  totalItems,
  sortBy,
  sortOption,
  onSortChange,
  onOpenFilterMobile,
  onOpenMobileFilter,
  activeFilterCount = 0,
  className = '',
}: CatalogToolbarProps) {
  const currentSort = sortOption || sortBy || 'popular';
  const handleOpenFilter = onOpenMobileFilter || onOpenFilterMobile;

  return (
    <div
      className={`flex items-center justify-between gap-3 py-2 ${className}`}
      aria-label="Pengaturan Katalog Menu"
    >
      {/* Jumlah Item */}
      <div className="flex items-center gap-2">
        <span className="text-xs sm:text-sm font-semibold text-ink">
          {totalItems} Menu Tersedia
        </span>
      </div>

      {/* Aksi Kanan: Tombol Filter Mobile & Dropdown Sort */}
      <div className="flex items-center gap-2">
        {/* Tombol Filter di Tampilan Mobile */}
        {handleOpenFilter && (
          <button
            type="button"
            onClick={handleOpenFilter}
            className={buttonClass('outline', 'sm', 'lg:hidden')}
            aria-label="Buka filter menu"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-icon" />
            <span>Filter</span>
            {activeFilterCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-gold text-ink text-2xs font-bold flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        )}

        {/* Dropdown Urutkan */}
        <div className="relative inline-flex items-center">
          <label htmlFor="catalog-sort" className="sr-only">
            Urutkan berdasarkan
          </label>
          <div className="relative">
            <select
              id="catalog-sort"
              value={currentSort}
              onChange={(e) => onSortChange(e.target.value as SortOption)}
              className="appearance-none bg-white border border-line text-ink text-xs font-medium rounded-full pl-3.5 pr-8 py-1.5 min-h-10 hover:border-subtle focus:outline-none focus:border-gold transition-colors cursor-pointer"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  Urutkan: {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-icon absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>
    </div>
  );
}
