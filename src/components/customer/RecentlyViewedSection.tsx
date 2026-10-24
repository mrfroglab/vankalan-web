'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { MenuItem } from '@/types';
import { formatRupiah } from '@/lib/constants';
import { Star, Clock, Plus, Heart } from 'lucide-react';
import { FoodIllustration } from './FoodIllustration';

export interface RecentlyViewedProps {
  items: MenuItem[];
  onSelectMenu: (item: MenuItem) => void;
  onAddToCartFast?: (item: MenuItem) => void;
  className?: string;
  title?: string;
  subtitle?: string;
}

export function RecentlyViewedSection({
  items,
  onSelectMenu,
  onAddToCartFast,
  className = '',
  title = 'Pilihan Hangat Pelanggan',
  subtitle = 'Menu warmindo paling sering dipesan dan disukai warga sekitar.',
}: RecentlyViewedProps) {
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

  if (!items || items.length === 0) {
    return null;
  }

  const displayItems = items.slice(0, 4);

  const toggleFavorite = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setFavoriteIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <section
      aria-label={title}
      className={`bg-[#f1ede7] py-10 sm:py-14 border-t border-[#e9e5df] ${className}`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Section Heading */}
        <div className="mb-6">
          <h2 className="text-xl sm:text-2xl font-bold font-editorial text-[#242321] mb-1 tracking-tight">
            {title}
          </h2>
          <p className="text-xs sm:text-sm text-[#68645e]">{subtitle}</p>
        </div>

        {/* 4 Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {displayItems.map((item) => {
            const isFav = favoriteIds.includes(item.id);
            const badgeText = item.badge || (item.popular ? 'FAVORIT' : null);
            const ratingValue = item.rating || 4.8;
            const reviewCount = item.reviewsCount || 42;
            const prepMinutes = item.prepTime || 10;

            return (
              <article
                key={item.id}
                onClick={() => onSelectMenu(item)}
                className="rounded-2xl bg-white border border-[#e9e5df] p-3 sm:p-3.5 flex flex-col justify-between hover:shadow-card hover:-translate-y-0.5 transition-all cursor-pointer group relative select-none"
              >
                <div>
                  {/* Image Container */}
                  <div className="relative w-full h-36 rounded-xl overflow-hidden bg-[#f5f2ed] mb-3 border border-[#eeeae4]/60">
                    {item.image ? (
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <FoodIllustration
                        kind={item.kind}
                        className="w-full h-full p-2"
                      />
                    )}

                    {/* Status Badge */}
                    {badgeText && (
                      <div className="absolute top-2 left-2 z-10">
                        <span className="bg-[#f8d84f] text-[#242321] text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-xs">
                          {badgeText}
                        </span>
                      </div>
                    )}

                    {/* Favorite Heart Control */}
                    <button
                      type="button"
                      onClick={(e) => toggleFavorite(e, item.id)}
                      aria-label={`Simpan ${item.name} ke favorit`}
                      className={`absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-white/90 hover:bg-white flex items-center justify-center transition-colors shadow-xs cursor-pointer before:absolute before:-inset-2 before:content-[''] ${
                        isFav
                          ? 'text-[#d94b3d]'
                          : 'text-[#77736d] hover:text-[#242321]'
                      }`}
                    >
                      <Heart
                        className={`w-3.5 h-3.5 ${
                          isFav ? 'fill-[#d94b3d] text-[#d94b3d]' : ''
                        }`}
                      />
                    </button>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="font-semibold text-xs sm:text-sm text-[#242321] line-clamp-1">
                      {item.name}
                    </h3>
                    <p className="text-[11px] text-[#68645e] line-clamp-1 mt-0.5 leading-normal">
                      {item.description}
                    </p>
                  </div>

                  {/* Rating & Prep Time */}
                  <div className="flex items-center justify-between text-xs mt-2.5 pt-1 border-t border-[#eeeae4]">
                    <div className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-[#e9b82f] text-[#e9b82f]" />
                      <span className="text-xs font-bold text-[#242321]">
                        {ratingValue.toFixed(1)}
                      </span>
                      <span className="text-[10px] text-[#918c84]">
                        ({reviewCount})
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-[#68645e]">
                      <Clock className="w-3 h-3 text-[#77736d]" />
                      <span className="text-[11px]">{prepMinutes} mnt</span>
                    </div>
                  </div>
                </div>

                {/* Bottom Row: Price & Circular Gold Plus Action */}
                <div className="flex items-center justify-between mt-3 pt-2">
                  <div>
                    <span className="text-[10px] text-[#918c84] block font-medium">
                      Harga
                    </span>
                    <strong className="text-xs sm:text-sm font-bold text-[#242321]">
                      {formatRupiah(item.price)}
                    </strong>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onAddToCartFast) {
                        onAddToCartFast(item);
                      } else {
                        onSelectMenu(item);
                      }
                    }}
                    aria-label={`Tambah ${item.name} ke pesanan`}
                    className="relative w-8 h-8 rounded-full bg-[#f5c943] hover:bg-[#e8b82b] text-[#242321] flex items-center justify-center transition-transform active:scale-90 shadow-xs cursor-pointer shrink-0 before:absolute before:-inset-2 before:content-['']"
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
