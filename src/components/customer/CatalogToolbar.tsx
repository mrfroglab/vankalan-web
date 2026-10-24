'use client';

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
        <span className="text-xs sm:text-sm font-semibold text-[#242321]">
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
            className="lg:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-[#e9e5df] text-[#242321] hover:bg-[#f5f2ed] transition-colors cursor-pointer min-h-[36px]"
            aria-label="Buka filter menu"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#77736d]" />
            <span>Filter</span>
            {activeFilterCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-[#f5c943] text-[#242321] text-[10px] font-bold flex items-center justify-center">
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
              className="appearance-none bg-white border border-[#e9e5df] text-[#242321] text-xs font-medium rounded-lg pl-3 pr-8 py-1.5 min-h-[36px] hover:border-[#918c84] focus:outline-none focus:border-[#f5c943] transition-colors cursor-pointer"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  Urutkan: {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[#77736d] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>
    </div>
  );
}
