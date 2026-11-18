'use client';

import { textareaClass } from '@/components/ui/styles';
import { buttonClass } from '@/components/ui/Button';
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
        <div className="w-full h-36 bg-surface-muted rounded-2xl overflow-hidden flex items-center justify-center border border-line-soft/60 relative">
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
          <p className="text-xs sm:text-sm text-muted leading-relaxed">
            {item.description}
          </p>
          <div className="mt-2 text-base sm:text-lg font-extrabold text-ink">
            {formatRupiah(item.price)}
          </div>
        </div>

        {/* Opsi Tambahan Telur */}
        {hasEggOption && (
          <div className="p-3.5 bg-white border border-line rounded-2xl hover:border-gold transition-colors">
            <label className="flex items-center justify-between cursor-pointer select-none">
              <div className="flex items-center gap-3">
                <span
                  className={`w-5 h-5 rounded flex items-center justify-center border transition-all ${
                    withEgg
                      ? 'border-gold bg-gold text-ink'
                      : 'border-line bg-white'
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
                  <span className="font-bold text-xs sm:text-sm text-ink block">
                    Tambah Telur Ceplok / Rebus
                  </span>
                  <span className="text-2xs text-muted">
                    Tulis permintaan matang atau setengah matang di catatan
                  </span>
                </div>
              </div>
              <span className="text-xs sm:text-sm font-bold text-ink shrink-0">
                +{formatRupiah(eggPrice)}
              </span>
            </label>
          </div>
        )}

        {/* Opsi Suhu Minuman */}
        {hasTempOption && (
          <div>
            <label className="text-2xs font-semibold uppercase tracking-wider text-muted block mb-2">
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
                    className={`min-h-11 px-3.5 py-2.5 rounded-full border text-xs sm:text-sm font-semibold flex items-center justify-between transition-all cursor-pointer ${
                      isSelected
                        ? 'border-gold bg-gold/20 text-ink font-bold shadow-xs'
                        : 'border-line bg-white text-muted hover:bg-canvas hover:text-ink'
                    }`}
                  >
                    <span>{t === 'Dingin' ? '🧊 Dingin (Es)' : '☕ Panas / Hangat'}</span>
                    {extra > 0 ? (
                      <span className="text-xs font-normal text-muted">+{formatRupiah(extra)}</span>
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
            className="text-2xs font-semibold uppercase tracking-wider text-muted block mb-1.5"
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
            className={`${textareaClass} resize-none`}
          />
        </div>

        {/* Jumlah & Subtotal */}
        <div className="pt-3 border-t border-line-soft flex items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-1.5 bg-white border border-line rounded-full p-1">
            <button
              type="button"
              disabled={qty <= 1}
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              aria-label="Kurangi jumlah pesanan"
              className="w-9 h-9 flex items-center justify-center rounded-full text-ink hover:bg-canvas disabled:opacity-30 cursor-pointer transition-colors"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-6 text-center font-bold text-sm text-ink">
              {qty}
            </span>
            <button
              type="button"
              onClick={() => setQty((q) => q + 1)}
              aria-label="Tambah jumlah pesanan"
              className="w-9 h-9 flex items-center justify-center rounded-full text-ink hover:bg-canvas cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1">
            <button
              type="submit"
              className={buttonClass('gold', 'lg', 'w-full justify-center')}
            >
              Tambah ({formatRupiah(totalPrice)})
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
