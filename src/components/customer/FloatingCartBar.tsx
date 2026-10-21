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
      className="fixed left-4 right-4 sm:left-auto sm:right-6 sm:w-96 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40"
    >
      <button
        type="button"
        onClick={onOpenCart}
        className="w-full min-h-[56px] px-5 py-3 rounded-2xl bg-brand-green text-white shadow-xl hover:bg-brand-green-hover flex items-center justify-between gap-3 transition-transform active:scale-[0.99] cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <ShoppingBag className="w-6 h-6 text-white" />
            <span className="absolute -top-1.5 -right-2 bg-brand-orange text-white text-[11px] font-extrabold w-5 h-5 rounded-full flex items-center justify-center border-2 border-brand-green">
              {totalItems}
            </span>
          </div>
          <div className="text-left">
            <span className="text-xs text-white/80 block leading-tight">
              {totalItems} item di keranjang
            </span>
            <strong className="text-sm font-extrabold text-white">
              {formatRupiah(totalAmount)}
            </strong>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs font-bold bg-white/15 px-3 py-1.5 rounded-xl">
          <span>Lihat</span>
          <ArrowRight className="w-4 h-4" />
        </div>
      </button>
    </aside>
  );
}
