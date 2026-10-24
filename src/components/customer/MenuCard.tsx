import React from 'react';
import Image from 'next/image';
import { MenuItem } from '@/types';
import { formatRupiah } from '@/lib/constants';
import { Badge } from '@/components/ui/Badge';
import { FoodIllustration } from './FoodIllustration';
import { Plus } from 'lucide-react';

interface MenuCardProps {
  item: MenuItem;
  onSelect: (item: MenuItem) => void;
  isStoreOpen?: boolean;
}

export function MenuCard({ item, onSelect, isStoreOpen = true }: MenuCardProps) {
  const isAvailable = item.available && isStoreOpen;

  return (
    <article
      onClick={() => isAvailable && onSelect(item)}
      className={`group relative flex flex-col justify-between bg-white border border-border-line rounded-2xl overflow-hidden transition-all duration-200 ${
        isAvailable
          ? 'hover:-translate-y-1 hover:shadow-md cursor-pointer'
          : 'opacity-70 cursor-not-allowed bg-neutral-50'
      }`}
    >
      <div>
        {/* Kontainer Gambar / Ilustrasi */}
        <div className="relative w-full h-36 sm:h-40 bg-[#f2efe4] flex items-center justify-center overflow-hidden border-b border-border-line after:absolute after:inset-0 after:bg-brand-green/0 group-hover:after:bg-brand-green/5 after:transition-colors after:duration-200 after:z-[1]">
          {item.image ? (
            <Image
              src={item.image}
              alt={item.name}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover"
            />
          ) : (
            <FoodIllustration kind={item.kind} className="w-full h-full p-2" />
          )}

          {/* Badge Status Habis / Populer */}
          <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 z-10">
            {!item.available ? (
              <Badge variant="danger">Habis</Badge>
            ) : item.popular ? (
              <Badge variant="warning">Favorit</Badge>
            ) : null}
          </div>
        </div>

        {/* Konten Menu */}
        <div className="p-3.5 sm:p-4">
          <h3 className="font-bold text-sm sm:text-base text-ink line-clamp-1 group-hover:text-brand-green transition-colors">
            {item.name}
          </h3>
          <p className="mt-1 text-xs sm:text-sm text-text-muted line-clamp-2 leading-relaxed">
            {item.description}
          </p>
        </div>
      </div>

      {/* Bagian Bawah: Harga & Tombol Tambah */}
      <div className="p-3.5 sm:p-4 pt-0 flex items-center justify-between gap-2 mt-2">
        <div>
          <span className="text-xs text-text-muted block">Mulai dari</span>
          <strong className="text-sm sm:text-base font-extrabold text-ink">
            {formatRupiah(item.price)}
          </strong>
        </div>

        {/* Tombol aksi dengan tap target ergonomis minimal 44x44px */}
        <button
          type="button"
          disabled={!isAvailable}
          onClick={(e) => {
            e.stopPropagation();
            if (isAvailable) onSelect(item);
          }}
          aria-label={`Tambah ${item.name} ke keranjang`}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-soft-green text-brand-green hover:bg-brand-green hover:text-white active:scale-95 transition-all duration-150 disabled:opacity-40 disabled:hover:bg-soft-green disabled:hover:text-brand-green cursor-pointer"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>
    </article>
  );
}
