'use client';

import React from 'react';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { formatRupiah } from '@/lib/constants';
import { Plus, Minus, Trash2, ShoppingBag } from 'lucide-react';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const { items, updateQty, clearCart, totalAmount, totalItems } =
    useCart();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Keranjang Pesanan (${totalItems})`}>
      {items.length === 0 ? (
        <div className="py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-soft-green flex items-center justify-center mx-auto mb-4 text-brand-green">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-base text-ink mb-1">
            Keranjangmu masih kosong
          </h3>
          <p className="text-sm text-text-muted max-w-xs mx-auto">
            Yuk pilih mi instan atau minuman favoritmu terlebih dahulu.
          </p>
          <div className="mt-6">
            <Button variant="secondary" onClick={onClose}>
              Lihat Menu
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="divide-y divide-border-line">
            {items.map((item) => (
              <div key={item.id} className="py-3.5 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <h4 className="font-bold text-sm text-ink">{item.menuItem.name}</h4>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {item.egg ? (
                        <span className="text-[11px] bg-soft-green text-brand-green px-2 py-0.5 rounded-md font-medium">
                          + Telur
                        </span>
                      ) : null}
                      {item.temp ? (
                        <span className="text-[11px] bg-neutral-100 text-ink px-2 py-0.5 rounded-md font-medium">
                          {item.temp}
                        </span>
                      ) : null}
                    </div>
                    {item.note ? (
                      <p className="text-xs text-text-muted mt-1 italic">
                        Catatan: &ldquo;{item.note}&rdquo;
                      </p>
                    ) : null}
                    <div className="text-xs font-semibold text-ink mt-1.5">
                      {formatRupiah(item.unitPrice)}
                    </div>
                  </div>

                  {/* Quantity Stepper (min 44x44px touch targets) */}
                  <div className="flex items-center gap-1.5 bg-white border border-border-line rounded-xl p-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => updateQty(item.id, item.qty - 1)}
                      aria-label="Kurangi jumlah"
                      className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg text-ink hover:bg-soft-green cursor-pointer"
                    >
                      {item.qty === 1 ? (
                        <Trash2 className="w-4 h-4 text-danger-red" />
                      ) : (
                        <Minus className="w-4 h-4" />
                      )}
                    </button>
                    <span className="w-6 text-center font-bold text-sm">
                      {item.qty}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQty(item.id, item.qty + 1)}
                      aria-label="Tambah jumlah"
                      className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg text-ink hover:bg-soft-green cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Subtotal & Tindakan */}
          <div className="pt-4 border-t border-border-line space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-muted">Total Pembayaran</span>
              <strong className="text-lg font-extrabold text-ink">
                {formatRupiah(totalAmount)}
              </strong>
            </div>

            <Link href="/checkout" onClick={onClose} className="block w-full">
              <Button variant="orange" size="lg" fullWidth>
                Lanjut ke Pembayaran ({formatRupiah(totalAmount)})
              </Button>
            </Link>

            <button
              type="button"
              onClick={clearCart}
              className="w-full text-center text-xs text-text-muted hover:text-danger-red py-2 cursor-pointer transition-colors"
            >
              Kosongkan Keranjang
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
