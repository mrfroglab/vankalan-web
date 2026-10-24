'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingBag, History, Clock } from 'lucide-react';

export interface FoodlyHeaderProps {
  isOpen: boolean;
  estimateMinutes: number;
  totalCartItems?: number;
  onOpenCart?: () => void;
}

export function FoodlyHeader({
  isOpen,
  estimateMinutes,
  totalCartItems = 0,
  onOpenCart,
}: FoodlyHeaderProps) {
  const pathname = usePathname();

  const navLinks = [
    { label: 'Menu Lengkap', href: '/' },
    { label: 'Riwayat Pesanan', href: '/history' },
    { label: 'Dapur Admin', href: '/admin/antrean' },
  ];

  const handleOrderClick = () => {
    if (!isOpen) return;

    if (onOpenCart) {
      onOpenCart();
      return;
    }

    const menuElement = document.getElementById('menu-section');
    if (menuElement) {
      menuElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="bg-white border-b border-[#e9e5df] sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Sisi Kiri: Logo Brand & Identitas Responsif */}
        <Link
          href="/"
          className="flex items-center gap-1.5 sm:gap-2 group min-h-[44px] cursor-pointer shrink"
          aria-label="Kembali ke beranda Warmindo Putra Vangkalan"
        >
          <span className="bg-[#d94b3d] text-white font-black text-xs px-2 py-1 rounded-md tracking-wider shrink-0 select-none">
            PV
          </span>
          <div className="flex flex-col min-w-0">
            <span className="text-xs xs:text-sm sm:text-base font-bold text-[#242321] tracking-tight group-hover:text-[#68645e] transition-colors truncate max-w-[125px] xs:max-w-[180px] sm:max-w-none">
              Warmindo Putra Vangkalan
            </span>
            <span className="hidden md:block text-[11px] text-[#68645e] leading-none">
              Pesan Dulu, Tinggal Ambil
            </span>
          </div>
        </Link>

        {/* Bagian Tengah: Tautan Navigasi (Tablet & Desktop) */}
        <nav
          className="hidden md:flex items-center gap-1 lg:gap-2"
          aria-label="Navigasi Utama"
        >
          {navLinks.map((link) => {
            const isActive =
              link.href === '/'
                ? pathname === '/'
                : pathname?.startsWith(link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive ? 'page' : undefined}
                className={`min-h-[40px] px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center transition-colors cursor-pointer ${
                  isActive
                    ? 'text-[#242321] font-bold bg-[#f5f2ed] border border-[#e9e5df]'
                    : 'text-[#68645e] hover:text-[#242321] hover:bg-[#f5f2ed]/60'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Sisi Kanan: Aksi & Utilitas */}
        <div className="flex items-center gap-1 sm:gap-2.5 shrink-0">
          {/* Tautan Riwayat di Mobile */}
          <Link
            href="/history"
            aria-label="Riwayat Pesanan"
            className="md:hidden relative w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-[#77736d] hover:text-[#242321] hover:bg-[#f5f2ed] transition-colors cursor-pointer"
            title="Riwayat Pesanan"
          >
            <History className="w-4 h-4" aria-hidden="true" />
          </Link>

          {/* Estimasi Persiapan Desktop */}
          {isOpen && (
            <div
              className="hidden lg:inline-flex items-center gap-1 bg-[#f5f2ed] text-xs font-medium text-[#242321] px-2.5 py-1 rounded-full border border-[#e9e5df] shrink-0"
              title={`Estimasi waktu persiapan pesanan sekitar ${estimateMinutes} menit`}
            >
              <Clock className="w-3.5 h-3.5 text-[#68645e]" />
              <span>±{estimateMinutes} mnt</span>
            </div>
          )}

          {/* Tombol Keranjang Belanja */}
          <button
            type="button"
            onClick={onOpenCart}
            aria-label={`Buka Keranjang Belanja (${totalCartItems} item)`}
            className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-[#77736d] hover:text-[#242321] hover:bg-[#f5f2ed] transition-colors cursor-pointer shrink-0"
          >
            <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
            {totalCartItems > 0 && (
              <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] px-1 bg-[#f5c943] text-[#242321] font-bold text-[10px] rounded-full flex items-center justify-center border-2 border-white shadow-xs">
                {totalCartItems > 99 ? '99+' : totalCartItems}
              </span>
            )}
          </button>

          {/* Tombol CTA Pesan Sekarang / Warmindo Tutup */}
          {isOpen ? (
            <button
              type="button"
              onClick={handleOrderClick}
              className="bg-[#f5c943] hover:bg-[#e8b82b] text-[#242321] font-bold text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2 min-h-[38px] sm:min-h-[42px] rounded-full transition-all active:scale-95 shadow-xs cursor-pointer flex items-center justify-center shrink-0"
            >
              <span>Pesan Sekarang</span>
            </button>
          ) : (
            <button
              type="button"
              disabled
              aria-disabled="true"
              className="bg-neutral-100 border border-neutral-300 text-neutral-400 font-semibold text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2 min-h-[38px] sm:min-h-[42px] rounded-full cursor-not-allowed flex items-center justify-center shrink-0 select-none"
            >
              <span>Warmindo Tutup</span>
            </button>
          )}
        </div>
      </div>

      {/* Catatan / Notes di Bawah Header saat Warung Tutup */}
      {!isOpen && (
        <div className="bg-[#fff8ea] border-t border-[#f4e2b8] px-3 sm:px-6 py-2 text-center">
          <p className="text-[11px] sm:text-xs text-[#8c5a14] font-medium leading-relaxed">
            Warung lagi tutup sementara. Kamu tetap bisa melihat menu, pemesanan online akan dibuka kembali segera.
          </p>
        </div>
      )}
    </header>
  );
}
