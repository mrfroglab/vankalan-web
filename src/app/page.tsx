'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { MenuItem, Category } from '@/types';
import { INITIAL_MENU } from '@/lib/constants';
import { useCart } from '@/context/CartContext';
import { StoreHeader } from '@/components/customer/StoreHeader';
import { CategoryFilter } from '@/components/customer/CategoryFilter';
import { MenuCard } from '@/components/customer/MenuCard';
import { CustomizeItemModal } from '@/components/customer/CustomizeItemModal';
import { FloatingCartBar } from '@/components/customer/FloatingCartBar';
import { CartDrawer } from '@/components/customer/CartDrawer';
import { Search, ChefHat } from 'lucide-react';

const CATEGORIES: (Category | 'Semua')[] = ['Semua', 'Mi', 'Nasi', 'Camilan', 'Minuman'];

function CatalogContent() {
  const { addItem, eggPrice, isStoreOpen, estimateMinutes } = useCart();
  const [selectedCategory, setSelectedCategory] = useState<Category | 'Semua'>('Semua');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeItemForCustomization, setActiveItemForCustomization] = useState<MenuItem | null>(null);
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState<boolean>(false);

  // Filter menu berdasarkan kategori dan pencarian kata kunci
  const filteredMenu = useMemo(() => {
    return INITIAL_MENU.filter((item) => {
      const matchCategory =
        selectedCategory === 'Semua' || item.category === selectedCategory;
      const matchSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCategory && matchSearch;
    });
  }, [selectedCategory, searchQuery]);

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      {/* Container Utama */}
      <main className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8 flex-1 safe-bottom-clearance space-y-6">
        {/* Header Toko */}
        <StoreHeader isOpen={isStoreOpen} estimateMinutes={estimateMinutes} />

        {/* Baris Pencarian & Kategori */}
        <section className="space-y-3" aria-label="Pencarian dan Filter Menu">
          <div className="relative">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari mi goreng, es teh manis, roti bakar..."
              aria-label="Cari menu"
              className="w-full min-h-[48px] pl-11 pr-4 text-sm bg-white border border-border-line rounded-2xl focus:outline-none focus:border-brand-green transition-colors"
            />
            <Search className="w-5 h-5 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <CategoryFilter
            categories={CATEGORIES}
            selected={selectedCategory}
            onSelect={setSelectedCategory}
          />
        </section>

        {/* Grid Katalog Menu */}
        <section aria-label="Daftar Menu">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base sm:text-lg font-bold text-ink">
              {selectedCategory === 'Semua' ? 'Semua Menu' : `Kategori ${selectedCategory}`}
            </h2>
            <span className="text-xs text-text-muted">
              {filteredMenu.length} menu tersedia
            </span>
          </div>

          {filteredMenu.length === 0 ? (
            <div className="py-16 text-center bg-white rounded-2xl border border-border-line p-6">
              <ChefHat className="w-12 h-12 text-text-muted mx-auto mb-3" />
              <p className="font-bold text-sm text-ink">Menu tidak ditemukan</p>
              <p className="text-xs text-text-muted mt-1">
                Coba gunakan kata kunci pencarian lain atau pilih kategori Semua.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
              {filteredMenu.map((item) => (
                <MenuCard
                  key={item.id}
                  item={item}
                  isStoreOpen={isStoreOpen}
                  onSelect={(selected) => setActiveItemForCustomization(selected)}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Footer Minimalis */}
      <footer className="border-t border-border-line py-6 bg-white text-xs text-text-muted text-center px-4">
        <p>Warmindo Putra Vangkalan &copy; 2026. Pesan dulu secara online, tinggal ambil.</p>
        <div className="mt-2 flex justify-center gap-4 text-xs">
          <Link href="/admin/antrean" className="hover:text-brand-green underline">
            Panel Kasir / Dapur
          </Link>
        </div>
      </footer>

      {/* Modal Kustomisasi Menu (Telur / Suhu / Catatan) */}
      <CustomizeItemModal
        item={activeItemForCustomization}
        isOpen={Boolean(activeItemForCustomization)}
        onClose={() => setActiveItemForCustomization(null)}
        eggPrice={eggPrice}
        onAddToCart={(data) => {
          addItem(data);
        }}
      />

      {/* Drawer / Bottom Sheet Keranjang */}
      <CartDrawer
        isOpen={isCartDrawerOpen}
        onClose={() => setIsCartDrawerOpen(false)}
      />

      {/* Tombol Keranjang Melayang di Bawah */}
      <FloatingCartBar onOpenCart={() => setIsCartDrawerOpen(true)} />
    </div>
  );
}

export default function HomePage() {
  return <CatalogContent />;
}
