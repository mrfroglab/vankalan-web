'use client';

import React from 'react';
import { Check, Star, X } from 'lucide-react';

export interface FilterState {
  category: string;
  priceRange: string;
  portion: string;
  mealTime: string[];
  minRating: number;
  availableOnly: boolean;
}

export const DEFAULT_FILTER_STATE: FilterState = {
  category: 'Semua',
  priceRange: 'Semua Harga',
  portion: 'Semua',
  mealTime: [],
  minRating: 0,
  availableOnly: false,
};

export interface FilterSidebarProps {
  filters: FilterState;
  categories: string[];
  categoryCounts?: Record<string, number>;
  onFilterChange: (newFilters: FilterState) => void;
  onResetFilters: () => void;
  onApply?: () => void;
  className?: string;
}

const PRICE_RANGE_OPTIONS = [
  'Semua Harga',
  '< Rp10.000',
  'Rp10.000 - Rp15.000',
  '> Rp15.000',
];

const PORTION_OPTIONS = ['Semua', 'Reguler', 'Double / Jumbo'];

const MEAL_TIME_OPTIONS = ['Sarapan', 'Snacks', 'Makan Malam', 'Larut Malam'];

const RATING_OPTIONS = [
  { label: 'Semua Rating', value: 0 },
  { label: '4.8 & ke atas', value: 4.8 },
  { label: '4.5 & ke atas', value: 4.5 },
];

const AVAILABILITY_OPTIONS = [
  { label: 'Semua Menu', value: false },
  { label: 'Tersedia Sekarang Saja', value: true },
];

export function FilterSidebar({
  filters,
  categories,
  categoryCounts = {},
  onFilterChange,
  onResetFilters,
  onApply,
  className = '',
}: FilterSidebarProps) {
  const normalizedCategories = Array.from(
    new Set(['Semua', ...categories.filter((cat) => cat !== 'Semua')])
  );

  const handleCategorySelect = (category: string) => {
    onFilterChange({ ...filters, category });
  };

  const handlePriceSelect = (priceRange: string) => {
    onFilterChange({ ...filters, priceRange });
  };

  const handlePortionSelect = (portion: string) => {
    onFilterChange({ ...filters, portion });
  };

  const handleMealTimeToggle = (meal: string) => {
    const isSelected = filters.mealTime.includes(meal);
    const updated = isSelected
      ? filters.mealTime.filter((item) => item !== meal)
      : [...filters.mealTime, meal];
    onFilterChange({ ...filters, mealTime: updated });
  };

  const handleRatingSelect = (ratingValue: number) => {
    onFilterChange({ ...filters, minRating: ratingValue });
  };

  const handleAvailabilitySelect = (availableOnly: boolean) => {
    onFilterChange({ ...filters, availableOnly });
  };

  return (
    <aside
      className={`bg-white border border-[#e9e5df] rounded-2xl p-4 sm:p-5 shadow-card ${className}`}
      aria-label="Panel Filter Menu"
    >
      {/* Header Panel */}
      <div className="flex items-center justify-between pb-1">
        <h2 className="font-bold text-sm text-[#242321] tracking-tight">Filter</h2>
        <button
          type="button"
          onClick={onResetFilters}
          className="text-xs text-[#918c84] hover:text-[#242321] font-medium transition-colors cursor-pointer min-h-[36px] flex items-center px-1"
        >
          Reset semua
        </button>
      </div>

      <div className="border-t border-[#eeeae4] my-4" />

      {/* 1. Kategori */}
      <section aria-labelledby="filter-heading-category">
        <h3
          id="filter-heading-category"
          className="text-[11px] font-semibold text-[#242321] uppercase tracking-wider mb-2.5"
        >
          Kategori
        </h3>
        <div className="space-y-1" role="radiogroup" aria-label="Pilih Kategori">
          {normalizedCategories.map((cat) => {
            const isSelected = filters.category === cat;
            const count = categoryCounts[cat];

            return (
              <button
                key={cat}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => handleCategorySelect(cat)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-full text-xs transition-colors cursor-pointer min-h-[40px] text-left ${
                  isSelected
                    ? 'bg-[#f5f2ed] text-[#242321] font-semibold'
                    : 'text-[#68645e] hover:bg-[#f5f2ed]/60 hover:text-[#242321]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={`w-4 h-4 rounded-full flex items-center justify-center border transition-all ${
                      isSelected
                        ? 'border-[#f5c943] bg-[#f5c943]'
                        : 'border-[#e9e5df] bg-white'
                    }`}
                  >
                    {isSelected && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#242321]" />
                    )}
                  </span>
                  <span>{cat}</span>
                </div>
                {typeof count === 'number' && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-white border border-[#e9e5df] text-[#918c84] font-medium">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <div className="border-t border-[#eeeae4] my-4" />

      {/* 2. Rentang Harga */}
      <section aria-labelledby="filter-heading-price">
        <h3
          id="filter-heading-price"
          className="text-[11px] font-semibold text-[#242321] uppercase tracking-wider mb-2.5"
        >
          Rentang Harga
        </h3>
        <div className="space-y-1.5">
          {PRICE_RANGE_OPTIONS.map((price) => {
            const isSelected = filters.priceRange === price;
            return (
              <button
                key={price}
                type="button"
                onClick={() => handlePriceSelect(price)}
                className={`w-full text-left px-3.5 py-2 rounded-full text-xs font-medium transition-all cursor-pointer min-h-[38px] flex items-center justify-between border ${
                  isSelected
                    ? 'bg-[#f5c943]/20 border-[#f5c943] text-[#242321] font-bold shadow-xs'
                    : 'bg-white border-[#e9e5df] text-[#68645e] hover:bg-[#f5f2ed] hover:text-[#242321]'
                }`}
              >
                <span>{price}</span>
                {isSelected && (
                  <span className="w-2 h-2 rounded-full bg-[#f5c943]" />
                )}
              </button>
            );
          })}
        </div>
      </section>

      <div className="border-t border-[#eeeae4] my-4" />

      {/* 3. Porsi */}
      <section aria-labelledby="filter-heading-portion">
        <h3
          id="filter-heading-portion"
          className="text-[11px] font-semibold text-[#242321] uppercase tracking-wider mb-2.5"
        >
          Porsi
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {PORTION_OPTIONS.map((portion) => {
            const isSelected = filters.portion === portion;
            return (
              <button
                key={portion}
                type="button"
                onClick={() => handlePortionSelect(portion)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer border ${
                  isSelected
                    ? 'bg-[#f5c943] border-[#f5c943] text-[#242321] shadow-xs'
                    : 'bg-white border-[#e9e5df] text-[#68645e] hover:bg-[#f5f2ed] hover:text-[#242321]'
                }`}
              >
                {portion}
              </button>
            );
          })}
        </div>
      </section>

      <div className="border-t border-[#eeeae4] my-4" />

      {/* 4. Waktu Makan */}
      <section aria-labelledby="filter-heading-mealtime">
        <h3
          id="filter-heading-mealtime"
          className="text-[11px] font-semibold text-[#242321] uppercase tracking-wider mb-2.5"
        >
          Waktu Makan
        </h3>
        <div className="space-y-1.5">
          {MEAL_TIME_OPTIONS.map((meal) => {
            const isChecked = filters.mealTime.includes(meal);
            return (
              <label
                key={meal}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-full text-xs text-[#242321] hover:bg-[#f5f2ed]/60 transition-colors cursor-pointer select-none min-h-[36px]"
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => handleMealTimeToggle(meal)}
                  className="sr-only"
                />
                <span
                  className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${
                    isChecked
                      ? 'border-[#f5c943] bg-[#f5c943] text-[#242321]'
                      : 'border-[#e9e5df] bg-white'
                  }`}
                  aria-hidden="true"
                >
                  {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                </span>
                <span className="font-medium text-[#242321]">{meal}</span>
              </label>
            );
          })}
        </div>
      </section>

      <div className="border-t border-[#eeeae4] my-4" />

      {/* 5. Rating */}
      <section aria-labelledby="filter-heading-rating">
        <h3
          id="filter-heading-rating"
          className="text-[11px] font-semibold text-[#242321] uppercase tracking-wider mb-2.5"
        >
          Rating
        </h3>
        <div className="space-y-1.5">
          {RATING_OPTIONS.map((option) => {
            const isSelected = filters.minRating === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => handleRatingSelect(option.value)}
                className={`w-full flex items-center justify-between px-3.5 py-2 rounded-full text-xs transition-colors cursor-pointer min-h-[38px] text-left border ${
                  isSelected
                    ? 'bg-[#f5c943]/20 border-[#f5c943] text-[#242321] font-semibold'
                    : 'bg-white border-[#e9e5df] text-[#68645e] hover:bg-[#f5f2ed] hover:text-[#242321]'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  {option.value > 0 ? (
                    <>
                      <Star className="w-3.5 h-3.5 fill-[#e9b82f] text-[#e9b82f]" />
                      <span>{option.label}</span>
                    </>
                  ) : (
                    <span>{option.label}</span>
                  )}
                </div>
                {isSelected && (
                  <span className="w-2 h-2 rounded-full bg-[#f5c943]" />
                )}
              </button>
            );
          })}
        </div>
      </section>

      <div className="border-t border-[#eeeae4] my-4" />

      {/* 6. Ketersediaan */}
      <section aria-labelledby="filter-heading-availability">
        <h3
          id="filter-heading-availability"
          className="text-[11px] font-semibold text-[#242321] uppercase tracking-wider mb-2.5"
        >
          Ketersediaan
        </h3>
        <div className="space-y-1.5">
          {AVAILABILITY_OPTIONS.map((option) => {
            const isSelected = filters.availableOnly === option.value;
            return (
              <button
                key={String(option.value)}
                type="button"
                onClick={() => handleAvailabilitySelect(option.value)}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2 rounded-full text-xs transition-colors cursor-pointer min-h-[38px] text-left border ${
                  isSelected
                    ? 'bg-[#f5c943]/20 border-[#f5c943] text-[#242321] font-semibold'
                    : 'bg-white border-[#e9e5df] text-[#68645e] hover:bg-[#f5f2ed] hover:text-[#242321]'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full flex items-center justify-center border transition-all ${
                    isSelected
                      ? 'border-[#f5c943] bg-[#f5c943]'
                      : 'border-[#e9e5df] bg-white'
                  }`}
                >
                  {isSelected && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#242321]" />
                  )}
                </span>
                <span>{option.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Bottom CTA */}
      <div className="mt-5 pt-1">
        <button
          type="button"
          onClick={onApply}
          className="w-full bg-[#f5c943] hover:bg-[#e8b82b] text-[#242321] font-bold text-xs py-2.5 min-h-[44px] rounded-full shadow-xs transition-all active:scale-95 cursor-pointer flex items-center justify-center"
        >
          Terapkan Filter
        </button>
      </div>
    </aside>
  );
}

export interface FilterDrawerModalProps extends FilterSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FilterDrawerModal({
  isOpen,
  onClose,
  ...props
}: FilterDrawerModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl max-h-[85vh] overflow-y-auto z-10 animate-slide-up shadow-xl">
        <div className="sticky top-0 bg-white border-b border-[#eeeae4] px-4 py-3 flex items-center justify-between z-20">
          <span className="font-bold text-sm text-[#242321]">Filter Menu</span>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-[#f5f2ed] text-[#77736d] transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
            aria-label="Tutup panel filter"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4">
          <FilterSidebar
            {...props}
            onApply={() => {
              props.onApply?.();
              onClose();
            }}
            className="border-0 p-0 shadow-none"
          />
        </div>
      </div>
    </div>
  );
}
