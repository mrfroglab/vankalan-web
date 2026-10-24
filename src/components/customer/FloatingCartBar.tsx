'use client';

import React from 'react';
import { useCart } from '@/context/CartContext';
import { formatRupiah } from '@/lib/constants';
import { ShoppingBag, ArrowRight } from 'lucide-react';

interface FloatingCartBarProps {
  onOpenCart: () => void;
}

export function FloatingCartBar({ onOpenCart }: FloatingCartBarProps) {
  const { totalItems, totalAmount } = useCart();

  if (totalItems === 0) return null;

  return (
    <aside
      aria-label="Ringkasan keranjang melayang"
      className="fixed left-4 right-4 sm:left-auto sm:right-6 sm:w-96 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 animate-slide-up"
    >
      <button
        type="button"
        onClick={onOpenCart}
        className="w-full min-h-[56px] px-5 py-3 rounded-2xl bg-[#242321] text-white shadow-dropdown hover:bg-[#383633] flex items-center justify-between gap-3 transition-all duration-200 active:scale-[0.98] cursor-pointer border border-[#383633]"
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <ShoppingBag className="w-6 h-6 text-white" aria-hidden="true" />
            <span className="absolute -top-1.5 -right-2 bg-[#f5c943] text-[#242321] text-[11px] font-extrabold w-5 h-5 rounded-full flex items-center justify-center border-2 border-[#242321]">
              {totalItems}
            </span>
          </div>
          <div className="text-left">
            <span className="text-xs text-white/80 block leading-tight">
              {totalItems} menu di keranjang
            </span>
            <strong className="text-sm font-extrabold text-white">
              {formatRupiah(totalAmount)}
            </strong>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs font-bold bg-[#f5c943] hover:bg-[#e8b82b] text-[#242321] px-3.5 py-1.5 rounded-full transition-colors">
          <span>Lihat</span>
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </div>
      </button>
    </aside>
  );
}
