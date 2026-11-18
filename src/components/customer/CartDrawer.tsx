'use client';

import { buttonClass } from '@/components/ui/Button';
import React from 'react';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { Modal } from '@/components/ui/Modal';
import { formatRupiah } from '@/lib/constants';
import { Plus, Minus, Trash2, ShoppingBag } from 'lucide-react';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const { items, updateQty, clearCart, totalAmount, totalItems, isStoreOpen } = useCart();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Keranjang Pesanan (${totalItems})`}
    >
      {items.length === 0 ? (
        <div className="py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-canvas border border-line flex items-center justify-center mx-auto mb-4 text-ink">
            <ShoppingBag className="w-8 h-8 text-icon" aria-hidden="true" />
          </div>
          <h3 className="font-bold text-base text-ink mb-1">
            Keranjangmu masih kosong
          </h3>
          <p className="text-xs sm:text-sm text-muted max-w-xs mx-auto">
            Pilih mi instan atau minuman favoritmu untuk mulai memesan.
          </p>
          <div className="mt-6">
            <button
              type="button"
              onClick={onClose}
              className={buttonClass('outline', 'md')}
            >
              Lihat Menu
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="divide-y divide-line-soft">
            {items.map((item) => (
              <div key={item.id} className="py-3.5 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <h4 className="font-bold text-sm text-ink">
                      {item.menuItem.name}
                    </h4>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {item.egg ? (
                        <span className="text-2xs bg-canvas text-ink border border-line px-2.5 py-0.5 rounded-full font-medium">
                          + Telur
                        </span>
                      ) : null}
                      {item.temp ? (
                        <span className="text-2xs bg-cream text-ink border border-line px-2.5 py-0.5 rounded-full font-medium">
                          {item.temp}
                        </span>
                      ) : null}
                    </div>
                    {item.note ? (
                      <p className="text-xs text-muted mt-1 italic">
                        Catatan: &ldquo;{item.note}&rdquo;
                      </p>
                    ) : null}
                    <div className="text-xs font-bold text-ink mt-1.5">
                      {formatRupiah(item.unitPrice)}
                    </div>
                  </div>

                  {/* Quantity Stepper */}
                  <div className="flex items-center gap-1 bg-white border border-line rounded-full p-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => updateQty(item.id, item.qty - 1)}
                      aria-label="Kurangi jumlah"
                      className="w-9 h-9 flex items-center justify-center rounded-full text-ink hover:bg-canvas cursor-pointer transition-colors"
                    >
                      {item.qty === 1 ? (
                        <Trash2 className="w-4 h-4 text-danger" />
                      ) : (
                        <Minus className="w-4 h-4" />
                      )}
                    </button>
                    <span className="w-6 text-center font-bold text-sm text-ink">
                      {item.qty}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQty(item.id, item.qty + 1)}
                      aria-label="Tambah jumlah"
                      className="w-9 h-9 flex items-center justify-center rounded-full text-ink hover:bg-canvas cursor-pointer transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Subtotal & Tindakan */}
          <div className="pt-4 border-t border-line space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted">Total Pembayaran</span>
              <strong className="text-lg font-extrabold text-ink">
                {formatRupiah(totalAmount)}
              </strong>
            </div>

            {isStoreOpen ? (
              <Link href="/checkout" onClick={onClose} className="block w-full">
                <button
                  type="button"
                  className={buttonClass('gold', 'lg', 'w-full justify-center')}
                >
                  Lanjut ke Pembayaran ({formatRupiah(totalAmount)})
                </button>
              </Link>
            ) : (
              <div className="space-y-1.5">
                <button
                  type="button"
                  disabled
                  aria-disabled="true"
                  className="w-full min-h-12 bg-cream border border-line-strong text-subtle font-semibold py-3.5 px-5 rounded-full text-sm flex items-center justify-center cursor-not-allowed select-none"
                >
                  Warmindo Tutup Sementara
                </button>
                <p className="text-2xs text-center text-gold-ink">
                  Pesanan online saat ini ditutup. Anda tetap dapat menyimpan keranjang ini.
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={clearCart}
              className="w-full text-center text-xs text-muted hover:text-danger py-2 cursor-pointer transition-colors min-h-10 flex items-center justify-center"
            >
              Kosongkan Keranjang
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
