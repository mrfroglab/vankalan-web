'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { MenuItem } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { FoodIllustration } from './FoodIllustration';
import { formatRupiah } from '@/lib/constants';
import { Plus, Minus } from 'lucide-react';

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
    // Reset state & close
    setWithEgg(false);
    setSelectedTemp('Dingin');
    setNote('');
    setQty(1);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={item.name}>
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Foto / Ilustrasi Header */}
        <div className="w-full h-36 bg-[#f2efe4] rounded-2xl overflow-hidden flex items-center justify-center border border-border-line relative">
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
          <p className="text-sm text-text-muted leading-relaxed">
            {item.description}
          </p>
          <div className="mt-2 text-lg font-extrabold text-ink">
            {formatRupiah(item.price)}
          </div>
        </div>

        {/* Opsi Tambahan Telur */}
        {hasEggOption ? (
          <div className="p-3.5 bg-white border border-border-line rounded-xl">
            <label className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={withEgg}
                  onChange={(e) => setWithEgg(e.target.checked)}
                  className="w-5 h-5 accent-brand-green rounded cursor-pointer"
                />
                <div>
                  <span className="font-bold text-sm text-ink block">
                    Tambah Telur Ceplok / Rebus
                  </span>
                  <span className="text-xs text-text-muted">
                    Bisa request matang atau setengah matang di catatan
                  </span>
                </div>
              </div>
              <span className="text-sm font-semibold text-brand-orange">
                +{formatRupiah(eggPrice)}
              </span>
            </label>
          </div>
        ) : null}

        {/* Opsi Suhu Minuman */}
        {hasTempOption ? (
          <div>
            <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
              Pilihan Suhu Minuman
            </label>
            <div className="grid grid-cols-2 gap-3">
              {(item.temperatures || ['Panas', 'Dingin']).map((t) => {
                const isSelected = selectedTemp === t;
                const extra = t === 'Dingin' && item.coldExtra ? item.coldExtra : 0;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setSelectedTemp(t)}
                    className={`min-h-[48px] p-3 rounded-xl border text-sm font-semibold flex items-center justify-between transition-all cursor-pointer ${
                      isSelected
                        ? 'border-brand-green bg-soft-green text-brand-green'
                        : 'border-border-line bg-white text-ink hover:bg-neutral-50'
                    }`}
                  >
                    <span>{t === 'Dingin' ? '🧊 Dingin (Es)' : '☕ Panas / Hangat'}</span>
                    {extra > 0 ? (
                      <span className="text-xs font-normal">+{formatRupiah(extra)}</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* Catatan Khusus */}
        <div>
          <label
            htmlFor="special-note"
            className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2"
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
            className="w-full p-3 text-sm rounded-xl border border-border-line bg-white focus:outline-none focus:border-brand-green transition-colors resize-none"
          />
        </div>

        {/* Jumlah & Subtotal */}
        <div className="pt-3 border-t border-border-line flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 bg-white border border-border-line rounded-xl p-1">
            <button
              type="button"
              disabled={qty <= 1}
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              aria-label="Kurangi jumlah pesanan"
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-ink hover:bg-soft-green disabled:opacity-30 cursor-pointer"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-8 text-center font-bold text-sm">{qty}</span>
            <button
              type="button"
              onClick={() => setQty((q) => q + 1)}
              aria-label="Tambah jumlah pesanan"
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-ink hover:bg-soft-green cursor-pointer"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1">
            <Button type="submit" variant="orange" fullWidth size="lg">
              Tambah ({formatRupiah(totalPrice)})
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
