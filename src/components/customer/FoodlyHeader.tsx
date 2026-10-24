'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';
import { ShoppingBag } from 'lucide-react';

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-4">
        {/* Sisi Kiri: Logo Brand & Identitas */}
        <Link
          href="/"
          className="flex items-center gap-2 group min-h-[44px] cursor-pointer shrink-0"
          aria-label="Kembali ke beranda Warmindo Putra Vangkalan"
        >
          <span className="bg-[#d94b3d] text-white font-black text-xs px-2 py-1 rounded-md tracking-wider mr-1 shrink-0 select-none">
            PV
          </span>
          <div className="flex flex-col">
            <span className="text-sm sm:text-base font-bold text-[#242321] tracking-tight group-hover:text-[#68645e] transition-colors">
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

        {/* Sisi Kanan: Status Toko, Waktu Masak, Keranjang, dan CTA */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Status Toko */}
          <div className="hidden sm:inline-flex items-center">
            {isOpen ? (
              <Badge variant="success" dot size="sm">
                Buka Sekarang
              </Badge>
            ) : (
              <Badge variant="danger" dot size="sm">
                Tutup Sementara
              </Badge>
            )}
          </div>

          {/* Estimasi Persiapan */}
          <div
            className="hidden lg:inline-flex items-center bg-[#f5f2ed] text-xs font-medium text-[#242321] px-2.5 py-1 rounded-full border border-[#e9e5df] shrink-0"
            title={`Estimasi waktu persiapan pesanan sekitar ${estimateMinutes} menit`}
          >
            <span>⏱ ±{estimateMinutes} mnt</span>
          </div>

          {/* Tombol Keranjang Belanja */}
          <button
            type="button"
            onClick={onOpenCart}
            aria-label={`Buka Keranjang Belanja (${totalCartItems} item)`}
            className="relative min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center text-[#77736d] hover:text-[#242321] hover:bg-[#f5f2ed] transition-colors cursor-pointer"
          >
            <ShoppingBag className="w-5 h-5" aria-hidden="true" />
            {totalCartItems > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 bg-[#f5c943] text-[#242321] font-bold text-[10px] rounded-full flex items-center justify-center border-2 border-white shadow-xs">
                {totalCartItems > 99 ? '99+' : totalCartItems}
              </span>
            )}
          </button>

          {/* Tombol CTA Pesan Sekarang */}
          <button
            type="button"
            onClick={handleOrderClick}
            className="bg-[#f5c943] hover:bg-[#e8b82b] text-[#242321] font-bold text-xs sm:text-sm px-4 py-2 min-h-[44px] rounded-full transition-all active:scale-95 shadow-xs cursor-pointer flex items-center justify-center shrink-0"
          >
            <span>Pesan Sekarang</span>
          </button>
        </div>
      </div>
    </header>
  );
}
