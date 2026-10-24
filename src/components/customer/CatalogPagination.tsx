'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface CatalogPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
  hideOnSinglePage?: boolean;
}

export function CatalogPagination({
  currentPage,
  totalPages,
  onPageChange,
  className = '',
  hideOnSinglePage = true,
}: CatalogPaginationProps) {
  if (totalPages <= 1 && hideOnSinglePage) {
    return null;
  }

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
      return pages;
    }

    pages.push(1);

    if (currentPage > 3) {
      pages.push('start-dots');
    }

    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (currentPage < totalPages - 2) {
      pages.push('end-dots');
    }

    pages.push(totalPages);

    return pages;
  };

  const pages = getPageNumbers();

  return (
    <nav
      role="navigation"
      aria-label="Navigasi Halaman Menu"
      className={`flex items-center justify-center gap-1.5 sm:gap-2 my-8 ${className}`}
    >
      {/* Tombol Sebelumnya */}
      <button
        type="button"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        aria-label="Halaman sebelumnya"
        className="w-9 h-9 rounded-full text-xs font-semibold flex items-center justify-center transition-all bg-white border border-[#e9e5df] text-[#242321] hover:bg-[#f5f2ed] disabled:opacity-40 disabled:hover:bg-white disabled:cursor-not-allowed cursor-pointer shadow-xs"
      >
        <ChevronLeft className="w-4 h-4 text-[#77736d]" />
      </button>

      {/* Daftar Nomor Halaman */}
      {pages.map((item, index) => {
        if (typeof item === 'string') {
          return (
            <span
              key={`dots-${index}`}
              className="w-9 h-9 text-xs font-semibold text-[#918c84] flex items-center justify-center select-none"
            >
              ...
            </span>
          );
        }

        const isActive = item === currentPage;

        return (
          <button
            key={item}
            type="button"
            onClick={() => onPageChange(item)}
            aria-current={isActive ? 'page' : undefined}
            aria-label={`Halaman ${item}`}
            className={`min-w-[36px] h-9 px-3 rounded-full text-xs font-semibold flex items-center justify-center transition-all cursor-pointer ${
              isActive
                ? 'bg-[#f5c943] border border-[#f5c943] text-[#242321] font-bold shadow-xs'
                : 'bg-white border border-[#e9e5df] text-[#242321] hover:bg-[#f5f2ed]'
            }`}
          >
            {item}
          </button>
        );
      })}

      {/* Tombol Berikutnya */}
      <button
        type="button"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        aria-label="Halaman berikutnya"
        className="w-9 h-9 rounded-full text-xs font-semibold flex items-center justify-center transition-all bg-white border border-[#e9e5df] text-[#242321] hover:bg-[#f5f2ed] disabled:opacity-40 disabled:hover:bg-white disabled:cursor-not-allowed cursor-pointer shadow-xs"
      >
        <ChevronRight className="w-4 h-4 text-[#77736d]" />
      </button>
    </nav>
  );
}
