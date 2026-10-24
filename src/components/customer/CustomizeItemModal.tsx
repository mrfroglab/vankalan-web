'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { MenuItem } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { FoodIllustration } from './FoodIllustration';
import { formatRupiah } from '@/lib/constants';
import { Plus, Minus, Check } from 'lucide-react';

interface CustomizeItemModalProps {
  item: MenuItem | null;
  isOpen: boolean;
  onClose: () => void;
  eggPrice: number;
  onAddToCart: (data: {
    menuItem: MenuItem;
    qty: number;
    egg?: boolean;
    temp?: 'Panas' | 'Dingin';
    note?: string;
  }) => void;
}

export function CustomizeItemModal({
  item,
  isOpen,
  onClose,
  eggPrice,
  onAddToCart,
}: CustomizeItemModalProps) {
  const [withEgg, setWithEgg] = useState<boolean>(false);
  const [selectedTemp, setSelectedTemp] = useState<'Panas' | 'Dingin'>('Dingin');
  const [note, setNote] = useState<string>('');
  const [qty, setQty] = useState<number>(1);

  if (!item) return null;

  const hasEggOption = Boolean(item.egg);
  const hasTempOption = Boolean(item.temperatures && item.temperatures.length > 0);

  // Hitung unit price
  let unitPrice = item.price;
  if (hasEggOption && withEgg) unitPrice += eggPrice;
  if (hasTempOption && selectedTemp === 'Dingin' && item.coldExtra) {
    unitPrice += item.coldExtra;
  }
  const totalPrice = unitPrice * qty;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddToCart({
      menuItem: item,
      qty,
      egg: hasEggOption ? withEgg : undefined,
      temp: hasTempOption ? selectedTemp : undefined,
      note: note.trim() || undefined,
    });
    // Reset state & tutup modal
    setWithEgg(false);
    setSelectedTemp('Dingin');
    setNote('');
    setQty(1);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={item.name}>
      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
        {/* Foto / Ilustrasi Header */}
        <div className="w-full h-36 bg-[#fbf9f5] rounded-xl overflow-hidden flex items-center justify-center border border-[#eeeae4]/60 relative">
          {item.image ? (
            <Image
              src={item.image}
              alt={item.name}
              fill
              sizes="(max-width: 640px) 100vw, 50vw"
              className="object-cover"
            />
          ) : (
            <FoodIllustration kind={item.kind} className="w-full h-full p-2" />
          )}
        </div>

        <div>
          <p className="text-xs sm:text-sm text-[#68645e] leading-relaxed">
            {item.description}
          </p>
          <div className="mt-2 text-base sm:text-lg font-extrabold text-[#242321]">
            {formatRupiah(item.price)}
          </div>
        </div>

        {/* Opsi Tambahan Telur */}
        {hasEggOption && (
          <div className="p-3.5 bg-white border border-[#e9e5df] rounded-xl hover:border-[#f5c943] transition-colors">
            <label className="flex items-center justify-between cursor-pointer select-none">
              <div className="flex items-center gap-3">
                <span
                  className={`w-5 h-5 rounded flex items-center justify-center border transition-all ${
                    withEgg
                      ? 'border-[#f5c943] bg-[#f5c943] text-[#242321]'
                      : 'border-[#e9e5df] bg-white'
                  }`}
                  aria-hidden="true"
                >
                  {withEgg && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </span>
                <input
                  type="checkbox"
                  checked={withEgg}
                  onChange={(e) => setWithEgg(e.target.checked)}
                  className="sr-only"
                />
                <div>
                  <span className="font-bold text-xs sm:text-sm text-[#242321] block">
                    Tambah Telur Ceplok / Rebus
                  </span>
                  <span className="text-[11px] text-[#68645e]">
                    Tulis permintaan matang atau setengah matang di catatan
                  </span>
                </div>
              </div>
              <span className="text-xs sm:text-sm font-bold text-[#242321] shrink-0">
                +{formatRupiah(eggPrice)}
              </span>
            </label>
          </div>
        )}

        {/* Opsi Suhu Minuman */}
        {hasTempOption && (
          <div>
            <label className="block text-[11px] font-bold text-[#68645e] uppercase tracking-wider mb-2">
              Pilihan Suhu Minuman
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {(item.temperatures || ['Panas', 'Dingin']).map((t) => {
                const isSelected = selectedTemp === t;
                const extra = t === 'Dingin' && item.coldExtra ? item.coldExtra : 0;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setSelectedTemp(t)}
                    className={`min-h-[44px] p-2.5 sm:p-3 rounded-xl border text-xs sm:text-sm font-semibold flex items-center justify-between transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#f5c943] bg-[#f5c943]/20 text-[#242321] font-bold shadow-xs'
                        : 'border-[#e9e5df] bg-white text-[#68645e] hover:bg-[#f5f2ed] hover:text-[#242321]'
                    }`}
                  >
                    <span>{t === 'Dingin' ? '🧊 Dingin (Es)' : '☕ Panas / Hangat'}</span>
                    {extra > 0 ? (
                      <span className="text-xs font-normal text-[#68645e]">+{formatRupiah(extra)}</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Catatan Khusus */}
        <div>
          <label
            htmlFor="special-note"
            className="block text-[11px] font-bold text-[#68645e] uppercase tracking-wider mb-1.5"
          >
            Catatan Khusus (Opsional)
          </label>
          <textarea
            id="special-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Contoh: jangan pakai sawi, kuah dipisah, mi setengah matang..."
            rows={2}
            maxLength={150}
            className="w-full p-3 text-xs sm:text-sm rounded-xl border border-[#e9e5df] bg-white text-[#242321] placeholder:text-[#918c84] focus:outline-none focus:border-[#f5c943] transition-colors resize-none"
          />
        </div>

        {/* Jumlah & Subtotal */}
        <div className="pt-3 border-t border-[#eeeae4] flex items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-2 bg-white border border-[#e9e5df] rounded-xl p-1">
            <button
              type="button"
              disabled={qty <= 1}
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              aria-label="Kurangi jumlah pesanan"
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-[#242321] hover:bg-[#f5f2ed] disabled:opacity-30 cursor-pointer transition-colors"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-7 text-center font-bold text-sm text-[#242321]">
              {qty}
            </span>
            <button
              type="button"
              onClick={() => setQty((q) => q + 1)}
              aria-label="Tambah jumlah pesanan"
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-[#242321] hover:bg-[#f5f2ed] cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1">
            <button
              type="submit"
              className="w-full min-h-[48px] bg-[#f5c943] hover:bg-[#e8b82b] text-[#242321] font-bold rounded-full py-3 px-4 shadow-xs active:scale-95 transition-all text-xs sm:text-sm flex items-center justify-center cursor-pointer"
            >
              Tambah ({formatRupiah(totalPrice)})
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
