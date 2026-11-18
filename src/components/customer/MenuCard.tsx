'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { MenuItem } from '@/types';
import { formatRupiah } from '@/lib/constants';
import { FoodIllustration } from './FoodIllustration';
import { Star, Clock, Plus, Heart } from 'lucide-react';

export interface MenuCardProps {
  item: MenuItem;
  onSelect: (item: MenuItem) => void;
  isStoreOpen?: boolean;
}

export function MenuCard({ item, onSelect, isStoreOpen = true }: MenuCardProps) {
  const isAvailable = item.available && isStoreOpen;
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('pv_favorites');
      if (raw) {
        const favs = JSON.parse(raw);
        if (Array.isArray(favs) && favs.includes(item.id)) {
          setIsFavorite(true);
        }
      }
    } catch {
      // Abaikan error parsing penyimpanan lokal
    }
  }, [item.id]);

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFavorite((prev) => {
      const next = !prev;
      try {
        const raw = localStorage.getItem('pv_favorites');
        const favs: string[] = raw ? JSON.parse(raw) : [];
        const updated = next
          ? Array.from(new Set([...favs, item.id]))
          : favs.filter((id) => id !== item.id);
        localStorage.setItem('pv_favorites', JSON.stringify(updated));
      } catch {
        // Abaikan error penyimpanan lokal
      }
      return next;
    });
  };

  const badgeText = !isAvailable
    ? 'HABIS'
    : item.badge || (item.popular ? 'FAVORIT' : null);

  return (
    <article
      onClick={() => isAvailable && onSelect(item)}
      className={`group relative flex flex-col justify-between bg-white border border-line rounded-2xl p-2.5 sm:p-3.5 hover:shadow-card hover:-translate-y-0.5 transition-all duration-200 select-none ${
        isAvailable ? 'cursor-pointer' : 'opacity-70 cursor-not-allowed bg-surface-muted/80'
      }`}
    >
      <div>
        {/* Kontainer Gambar Produk */}
        <div className="relative w-full h-32 sm:h-40 bg-surface-muted rounded-xl overflow-hidden flex items-center justify-center mb-2 sm:mb-2.5 border border-line-soft/60">
          {item.image ? (
            <Image
              src={item.image}
              alt={item.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <FoodIllustration kind={item.kind} className="w-full h-full p-2" />
          )}

          {/* Status Badge */}
          {badgeText && (
            <div className="absolute top-2 left-2 z-10">
              <span
                className={`text-2xs sm:text-2xs font-bold px-2 sm:px-2.5 py-0.5 rounded-full tracking-wide shadow-xs ${
                  !isAvailable
                    ? 'bg-danger text-white'
                    : 'bg-gold text-ink'
                }`}
              >
                {badgeText}
              </span>
            </div>
          )}

          {/* Tombol Simpan Favorit */}
          <button
            type="button"
            onClick={handleToggleFavorite}
            aria-label={isFavorite ? `Hapus ${item.name} dari favorit` : `Simpan ${item.name} ke favorit`}
            className={`absolute top-2 right-2 z-10 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/90 hover:bg-white flex items-center justify-center shadow-xs transition-colors cursor-pointer before:absolute before:-inset-2 before:content-[''] ${
              isFavorite
                ? 'text-danger'
                : 'text-icon hover:text-danger'
            }`}
          >
            <Heart
              className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isFavorite ? 'fill-danger text-danger' : ''}`}
              aria-hidden="true"
            />
          </button>
        </div>

        {/* Detail Produk */}
        <div>
          <h3 className="font-semibold text-xs sm:text-sm text-ink line-clamp-1 group-hover:text-danger transition-colors">
            {item.name}
          </h3>
          <p className="text-2xs sm:text-2xs text-muted line-clamp-2 mt-0.5 sm:mt-1 leading-snug">
            {item.description}
          </p>

          {/* Baris Metadata: Rating & Waktu Persiapan */}
          <div className="flex items-center justify-between mt-1.5 sm:mt-2 pt-1.5 border-t border-line-soft">
            <div className="flex items-center gap-1">
              <Star
                className="w-3.5 h-3.5 fill-rating text-rating"
                aria-hidden="true"
              />
              <span className="text-2xs sm:text-2xs font-bold text-ink">
                {(item.rating ?? 4.8).toFixed(1)}
              </span>
              <span className="hidden xs:inline text-2xs text-subtle">
                ({item.reviewsCount ?? 45})
              </span>
            </div>

            <div className="flex items-center gap-1 text-muted">
              <Clock className="w-3 h-3 text-subtle" aria-hidden="true" />
              <span className="text-2xs font-medium text-muted">
                {item.prepTime ?? 10} mnt
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Baris Bawah: Harga & Tombol Tambah ke Keranjang */}
      <div className="flex items-center justify-between gap-1.5 sm:gap-2 mt-2 sm:mt-2.5 pt-1">
        <div className="min-w-0">
          <span className="text-2xs sm:text-2xs text-subtle block leading-none mb-0.5">
            Mulai dari
          </span>
          <strong className="font-extrabold text-xs sm:text-sm text-ink block truncate">
            {formatRupiah(item.price)}
          </strong>
        </div>

        <button
          type="button"
          disabled={!isAvailable}
          onClick={(e) => {
            e.stopPropagation();
            if (isAvailable) onSelect(item);
          }}
          aria-label={`Tambah ${item.name} ke keranjang`}
          className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gold hover:bg-gold-hover text-ink flex items-center justify-center shadow-xs active:scale-95 transition-all cursor-pointer disabled:opacity-40 shrink-0 before:absolute before:-inset-2 before:content-['']"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}
