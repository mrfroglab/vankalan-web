'use client';

import { buttonClass } from '@/components/ui/Button';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingBag, History, Clock, Images } from 'lucide-react';

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
    { label: 'Galeri', href: '/galeri' },
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
    <header className="bg-white border-b border-line sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Sisi Kiri: Logo Brand & Identitas Responsif */}
        <Link
          href="/"
          className="flex items-center gap-1.5 sm:gap-2 group min-h-11 cursor-pointer min-w-0 flex-1 md:flex-initial"
          aria-label="Kembali ke beranda Warmindo Putra Vangkalan"
        >
          <span className="bg-danger text-white font-black text-xs px-2.5 py-1 rounded-full tracking-wider shrink-0 select-none">
            PV
          </span>
          <div className="flex flex-col min-w-0">
            <span className="text-xs xs:text-sm sm:text-base font-bold text-ink tracking-tight group-hover:text-muted transition-colors truncate">
              Warmindo Putra Vangkalan
            </span>
            <span className="hidden md:block text-2xs text-muted leading-none">
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
                className={`min-h-10 px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center transition-colors cursor-pointer ${
                  isActive
                    ? 'text-ink font-bold bg-canvas border border-line'
                    : 'text-muted hover:text-ink hover:bg-canvas/60'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Sisi Kanan: Aksi & Utilitas */}
        <div className="flex items-center gap-1 sm:gap-2.5 shrink-0">
          {/* Tautan Galeri di Mobile */}
          <Link
            href="/galeri"
            aria-label="Galeri Kenangan"
            className="md:hidden relative w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-icon hover:text-ink hover:bg-canvas transition-colors cursor-pointer"
            title="Galeri Kenangan"
          >
            <Images className="w-4 h-4" aria-hidden="true" />
          </Link>

          {/* Tautan Riwayat di Mobile */}
          <Link
            href="/history"
            aria-label="Riwayat Pesanan"
            className="md:hidden relative w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-icon hover:text-ink hover:bg-canvas transition-colors cursor-pointer"
            title="Riwayat Pesanan"
          >
            <History className="w-4 h-4" aria-hidden="true" />
          </Link>

          {/* Estimasi Persiapan Desktop */}
          {isOpen && (
            <div
              className="hidden lg:inline-flex items-center gap-1 bg-canvas text-xs font-medium text-ink px-2.5 py-1 rounded-full border border-line shrink-0"
              title={`Estimasi waktu persiapan pesanan sekitar ${estimateMinutes} menit`}
            >
              <Clock className="w-3.5 h-3.5 text-muted" />
              <span>±{estimateMinutes} mnt</span>
            </div>
          )}

          {/* Tombol Keranjang Belanja */}
          <button
            type="button"
            onClick={onOpenCart}
            aria-label={`Buka Keranjang Belanja (${totalCartItems} item)`}
            className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-icon hover:text-ink hover:bg-canvas transition-colors cursor-pointer shrink-0"
          >
            <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
            {totalCartItems > 0 && (
              <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] px-1 bg-gold text-ink font-bold text-2xs rounded-full flex items-center justify-center border-2 border-white shadow-xs">
                {totalCartItems > 99 ? '99+' : totalCartItems}
              </span>
            )}
          </button>

          {/* Tombol CTA Pesan Sekarang / Warmindo Tutup */}
          {isOpen ? (
            <button
              type="button"
              onClick={handleOrderClick}
              className={buttonClass('gold', 'md', 'justify-center shrink-0')}
            >
              {/* Layar < 380px (HP kecil): header tidak muat dengan label penuh. */}
              <span className="min-[380px]:hidden">Pesan</span>
              <span className="hidden min-[380px]:inline">Pesan Sekarang</span>
            </button>
          ) : (
            <button
              type="button"
              disabled
              aria-disabled="true"
              className="bg-cream border border-line-strong text-subtle font-semibold text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2 min-h-10 sm:min-h-10 rounded-full cursor-not-allowed flex items-center justify-center shrink-0 select-none"
            >
              <span className="min-[380px]:hidden">Tutup</span>
              <span className="hidden min-[380px]:inline">Warmindo Tutup</span>
            </button>
          )}
        </div>
      </div>

      {/* Catatan / Notes di Bawah Header saat Warung Tutup */}
      {!isOpen && (
        <div className="bg-gold-tint border-t border-gold-line px-3 sm:px-6 py-2 text-center">
          <p className="text-2xs sm:text-xs text-gold-ink font-medium leading-relaxed">
            Warung lagi tutup sementara. Kamu tetap bisa melihat menu, pemesanan online akan dibuka kembali segera.
          </p>
        </div>
      )}
    </header>
  );
}
