'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { MenuItem } from '@/types';
import { useCart } from '@/context/CartContext';
import { FoodlyHeader } from '@/components/customer/FoodlyHeader';
import { PageIntroBand } from '@/components/customer/PageIntroBand';
import {
  FilterSidebar,
  FilterDrawerModal,
  FilterState,
  DEFAULT_FILTER_STATE,
} from '@/components/customer/FilterSidebar';
import {
  CatalogToolbar,
  SortOption,
} from '@/components/customer/CatalogToolbar';
import { MenuCard } from '@/components/customer/MenuCard';
import { MenuCardSkeleton } from '@/components/customer/MenuCardSkeleton';
import { CatalogPagination } from '@/components/customer/CatalogPagination';
import { RecentlyViewedSection } from '@/components/customer/RecentlyViewedSection';
import { FoodlyFooter } from '@/components/customer/FoodlyFooter';
import { FloatingCartBar } from '@/components/customer/FloatingCartBar';
import { CartDrawer } from '@/components/customer/CartDrawer';
import { CustomizeItemModal } from '@/components/customer/CustomizeItemModal';
import { getMenuItems, getCategories } from '@/lib/store';
import { ChefHat, AlertCircle, RotateCcw } from 'lucide-react';

const ITEMS_PER_PAGE = 8;

export default function HomePage() {
  const { addItem, eggPrice, isStoreOpen, estimateMinutes, totalItems } =
    useCart();

  const [menuList, setMenuList] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<string[]>(['Semua']);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTER_STATE);
  const [sortOption, setSortOption] = useState<SortOption>('popular');
  const [currentPage, setCurrentPage] = useState<number>(1);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState<boolean>(false);
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState<boolean>(false);
  const [activeItemForCustomization, setActiveItemForCustomization] =
    useState<MenuItem | null>(null);

  const loadData = useCallback(() => {
    const items = getMenuItems();
    const cats = getCategories();
    setMenuList(items);
    setCategories(['Semua', ...cats]);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadData();

    const handleUpdate = () => {
      loadData();
    };

    window.addEventListener('storage', handleUpdate);
    window.addEventListener('pv_storage_update', handleUpdate);

    return () => {
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('pv_storage_update', handleUpdate);
    };
  }, [loadData]);

  // Dukungan pembacaan parameter query pencarian dari tautan eksternal
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const searchParam = params.get('search');
      if (searchParam) {
        setSearchQuery(searchParam);
      }
    }
  }, []);

  // Hitung jumlah item tiap kategori untuk info badge pada sidebar
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      Semua: menuList.length,
    };
    categories.forEach((cat) => {
      if (cat !== 'Semua') {
        counts[cat] = menuList.filter((item) => item.category === cat).length;
      }
    });
    return counts;
  }, [menuList, categories]);

  // Hitung berapa banyak filter aktif yang diubah dari pengaturan awal
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.category !== 'Semua') count += 1;
    if (filters.priceRange !== 'Semua Harga') count += 1;
    if (filters.portion !== 'Semua') count += 1;
    if (filters.mealTime.length > 0) count += filters.mealTime.length;
    if (filters.minRating > 0) count += 1;
    if (filters.availableOnly) count += 1;
    return count;
  }, [filters]);

  // Filter dan urutkan menu sesuai pilihan pengguna
  const filteredMenu = useMemo(() => {
    const result = menuList.filter((item) => {
      // 1. Pencarian Kata Kunci
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = item.name.toLowerCase().includes(q);
        const matchDesc = item.description.toLowerCase().includes(q);
        const matchCat = (
          typeof item.category === 'string' ? item.category : ''
        )
          .toLowerCase()
          .includes(q);
        if (!matchName && !matchDesc && !matchCat) return false;
      }

      // 2. Kategori
      if (filters.category !== 'Semua' && item.category !== filters.category) {
        return false;
      }

      // 3. Rentang Harga
      if (filters.priceRange === '< Rp10.000' && item.price >= 10000) {
        return false;
      }
      if (
        filters.priceRange === 'Rp10.000 - Rp15.000' &&
        (item.price < 10000 || item.price > 15000)
      ) {
        return false;
      }
      if (filters.priceRange === '> Rp15.000' && item.price <= 15000) {
        return false;
      }

      // 4. Porsi
      if (filters.portion === 'Reguler') {
        if (item.portion && item.portion !== 'Reguler') return false;
      } else if (filters.portion === 'Double / Jumbo') {
        if (item.portion !== 'Double' && item.portion !== 'Jumbo') return false;
      }

      // 5. Waktu Makan
      if (filters.mealTime.length > 0) {
        if (
          !item.mealTime ||
          !item.mealTime.some((m) => filters.mealTime.includes(m))
        ) {
          return false;
        }
      }

      // 6. Rating
      if (filters.minRating > 0) {
        const itemRating = item.rating ?? 4.8;
        if (itemRating < filters.minRating) return false;
      }

      // 7. Ketersediaan
      if (filters.availableOnly && !item.available) {
        return false;
      }

      return true;
    });

    // Urutkan katalog berdasarkan opsi pilihan
    return result.sort((a, b) => {
      if (sortOption === 'price-asc') {
        return a.price - b.price;
      }
      if (sortOption === 'price-desc') {
        return b.price - a.price;
      }
      if (sortOption === 'rating') {
        return (b.rating ?? 4.8) - (a.rating ?? 4.8);
      }
      // Opsi default: terpopuler
      const popA = a.popular ? 1 : 0;
      const popB = b.popular ? 1 : 0;
      if (popB !== popA) return popB - popA;
      return (b.reviewsCount ?? 0) - (a.reviewsCount ?? 0);
    });
  }, [menuList, searchQuery, filters, sortOption]);

  // Perhitungan pagination
  const totalPages = Math.max(1, Math.ceil(filteredMenu.length / ITEMS_PER_PAGE));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters);
    setCurrentPage(1);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setFilters(DEFAULT_FILTER_STATE);
    setSearchQuery('');
    setCurrentPage(1);
  };

  const paginatedMenu = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredMenu.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredMenu, currentPage]);

  const recommendedItems = (() => {
    const populars = menuList.filter((m) => m.popular);
    if (populars.length >= 4) {
      return populars.slice(0, 4);
    }
    return menuList.slice(0, 4);
  })();

  return (
    <div className="min-h-screen bg-[#f5f2ed] flex flex-col text-[#242321]">
      {/* 1. Header Navigasi Khas Foodly */}
      <FoodlyHeader
        isOpen={isStoreOpen}
        estimateMinutes={estimateMinutes}
        totalCartItems={totalItems}
        onOpenCart={() => setIsCartDrawerOpen(true)}
      />

      {/* 2. Banner Notifikasi Status Toko */}
      {!isStoreOpen && (
        <div
          role="alert"
          className="bg-[#f8d84f]/25 border-b border-[#f5c943]/40 text-[#242321] px-4 sm:px-6 py-2.5"
        >
          <div className="max-w-7xl mx-auto flex items-center gap-2.5 text-xs sm:text-sm font-medium">
            <AlertCircle
              className="w-4 h-4 text-[#c04c18] shrink-0"
              aria-hidden="true"
            />
            <span>
              Toko sedang tutup sementara. Anda tetap dapat menjelajahi menu,
              namun pesanan baru belum dapat diproses.
            </span>
          </div>
        </div>
      )}

      {/* 3. Pita Pengenalan Halaman & Pencarian Cepat */}
      <PageIntroBand
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
      />

      {/* 4. Kontainer Utama Katalog */}
      <main
        id="menu-section"
        className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 flex-1 safe-bottom-clearance"
      >
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">
          {/* Kolom Kiri: Filter Sidebar di Layar Desktop */}
          <div className="hidden lg:block w-64 xl:w-72 shrink-0 sticky top-20">
            <FilterSidebar
              filters={filters}
              categories={categories}
              categoryCounts={categoryCounts}
              onFilterChange={handleFilterChange}
              onResetFilters={handleResetFilters}
            />
          </div>

          {/* Kolom Kanan: Toolbar, Grid Produk, dan Pagination */}
          <div className="flex-1 min-w-0 w-full space-y-4">
            {/* Toolbar Kontrol Hasil Menu */}
            <CatalogToolbar
              totalItems={filteredMenu.length}
              sortBy={sortOption}
              sortOption={sortOption}
              onSortChange={setSortOption}
              onOpenMobileFilter={() => setIsMobileFilterOpen(true)}
              activeFilterCount={activeFilterCount}
            />

            {/* Kondisi Memuat Data */}
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <MenuCardSkeleton key={i} />
                ))}
              </div>
            ) : filteredMenu.length === 0 ? (
              /* Kondisi Hasil Kosong */
              <div className="bg-white rounded-xl border border-[#e9e5df] p-8 sm:p-12 text-center shadow-card">
                <div className="w-14 h-14 rounded-full bg-[#f5f2ed] border border-[#e9e5df] flex items-center justify-center mx-auto mb-3.5 text-[#77736d]">
                  <ChefHat className="w-7 h-7" aria-hidden="true" />
                </div>
                <h3 className="font-bold text-sm sm:text-base text-[#242321] mb-1">
                  Menu tidak ditemukan
                </h3>
                <p className="text-xs sm:text-sm text-[#68645e] max-w-sm mx-auto mb-5 leading-relaxed">
                  Tidak ada sajian yang sesuai dengan kriteria pencarian atau filter yang dipilih. Silakan coba kata kunci lain.
                </p>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-[#f5c943] hover:bg-[#e8b82b] text-[#242321] transition-all cursor-pointer shadow-xs active:scale-95 min-h-[44px]"
                >
                  <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Reset Semua Filter</span>
                </button>
              </div>
            ) : (
              /* Grid Produk Katalog */
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  {paginatedMenu.map((item, index) => (
                    <div
                      key={item.id}
                      className="animate-slide-up"
                      style={{
                        animationDelay: `${Math.min(index * 35, 210)}ms`,
                      }}
                    >
                      <MenuCard
                        item={item}
                        isStoreOpen={isStoreOpen}
                        onSelect={(selected) =>
                          setActiveItemForCustomization(selected)
                        }
                      />
                    </div>
                  ))}
                </div>

                {/* Navigasi Pagination */}
                <CatalogPagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={(page) => {
                    setCurrentPage(page);
                    const elem = document.getElementById('menu-section');
                    if (elem) {
                      elem.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                />
              </>
            )}
          </div>
        </div>
      </main>

      {/* 5. Bagian Pilihan Hangat / Menu Populer */}
      <RecentlyViewedSection
        items={recommendedItems}
        onSelectMenu={(item) => setActiveItemForCustomization(item)}
      />

      {/* 6. Footer Informasi & Tautan */}
      <FoodlyFooter />

      {/* 7. Bar Keranjang Melayang di Tampilan Mobile */}
      <FloatingCartBar onOpenCart={() => setIsCartDrawerOpen(true)} />

      {/* Drawer Keranjang Pesanan */}
      <CartDrawer
        isOpen={isCartDrawerOpen}
        onClose={() => setIsCartDrawerOpen(false)}
      />

      {/* Modal Kustomisasi Menu */}
      <CustomizeItemModal
        item={activeItemForCustomization}
        isOpen={Boolean(activeItemForCustomization)}
        eggPrice={eggPrice}
        onClose={() => setActiveItemForCustomization(null)}
        onAddToCart={(cartPayload) => {
          addItem(cartPayload);
          setActiveItemForCustomization(null);
        }}
      />

      {/* Drawer Filter Menu di Mobile */}
      <FilterDrawerModal
        isOpen={isMobileFilterOpen}
        onClose={() => setIsMobileFilterOpen(false)}
        filters={filters}
        categories={categories}
        categoryCounts={categoryCounts}
        onFilterChange={handleFilterChange}
        onResetFilters={handleResetFilters}
        onApply={() => setIsMobileFilterOpen(false)}
      />
    </div>
  );
}
