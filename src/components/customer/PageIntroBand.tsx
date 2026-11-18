'use client';

import { buttonClass } from '@/components/ui/Button';
import React from 'react';
import { Search, X } from 'lucide-react';

export interface PageIntroBandProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSubmitSearch?: () => void;
}

export function PageIntroBand({
  searchQuery,
  onSearchChange,
  onSubmitSearch,
}: PageIntroBandProps) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (onSubmitSearch) {
      onSubmitSearch();
    }
  };

  return (
    <section
      aria-label="Pengenalan Halaman dan Pencarian Menu"
      className="bg-canvas border-b border-line py-6 sm:py-8"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
        {/* Sisi Kiri: Breadcrumb, Judul Halaman Editorial, dan Deskripsi */}
        <div>
          <nav
            aria-label="Breadcrumb"
            className="text-2xs font-semibold uppercase tracking-wider text-muted mb-1 flex items-center gap-1.5"
          >
            <span>Beranda</span>
            <span aria-hidden="true" className="text-subtle">
              /
            </span>
            <span className="text-ink font-semibold" aria-current="page">
              Menu Lengkap
            </span>
          </nav>

          <h1 className="text-2xl sm:text-3xl font-bold font-editorial text-ink tracking-tight">
            Menu Lengkap
          </h1>

          <p className="text-xs sm:text-sm text-muted mt-1 max-w-lg leading-relaxed">
            Sajian hangat warmindo dengan cita rasa autentik. Pesan online, tinggal
            ambil saat matang tanpa antre.
          </p>
        </div>

        {/* Sisi Kanan: Input Pencarian Berbentuk Pill Khas Foodly */}
        <div className="w-full md:w-96 lg:w-[440px]">
          <form
            role="search"
            onSubmit={handleSubmit}
            className="w-full bg-white rounded-full border border-line shadow-xs p-1.5 flex items-center gap-2 focus-within:border-gold transition-colors"
          >
            <Search
              className="w-4 h-4 text-subtle ml-2 shrink-0"
              aria-hidden="true"
            />

            <input
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Cari mi goreng, es teh, camilan..."
              aria-label="Cari menu warmindo"
              className="w-full text-xs sm:text-sm bg-transparent outline-none text-ink placeholder:text-subtle px-1 py-1"
            />

            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                aria-label="Kosongkan kolom pencarian"
                className="p-1 rounded-full text-subtle hover:text-ink cursor-pointer transition-colors"
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            )}

            <button
              type="submit"
              className={buttonClass('gold', 'sm', 'shrink-0 justify-center')}
            >
              Cari
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
