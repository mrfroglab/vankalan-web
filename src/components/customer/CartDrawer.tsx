'use client';

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
  const { items, updateQty, clearCart, totalAmount, totalItems } = useCart();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Keranjang Pesanan (${totalItems})`}
    >
      {items.length === 0 ? (
        <div className="py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-[#f5f2ed] border border-[#e9e5df] flex items-center justify-center mx-auto mb-4 text-[#242321]">
            <ShoppingBag className="w-8 h-8 text-[#77736d]" aria-hidden="true" />
          </div>
          <h3 className="font-bold text-base text-[#242321] mb-1">
            Keranjangmu masih kosong
          </h3>
          <p className="text-xs sm:text-sm text-[#68645e] max-w-xs mx-auto">
            Pilih mi instan atau minuman favoritmu untuk mulai memesan.
          </p>
          <div className="mt-6">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-6 py-2.5 rounded-full bg-white border border-[#e9e5df] text-[#242321] font-semibold text-xs sm:text-sm hover:bg-[#f5f2ed] transition-colors cursor-pointer"
            >
              Lihat Menu
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="divide-y divide-[#eeeae4]">
            {items.map((item) => (
              <div key={item.id} className="py-3.5 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <h4 className="font-bold text-sm text-[#242321]">
                      {item.menuItem.name}
                    </h4>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {item.egg ? (
                        <span className="text-[11px] bg-[#f5f2ed] text-[#242321] border border-[#e9e5df] px-2 py-0.5 rounded-md font-medium">
                          + Telur
                        </span>
                      ) : null}
                      {item.temp ? (
                        <span className="text-[11px] bg-neutral-100 text-[#242321] border border-[#e9e5df] px-2 py-0.5 rounded-md font-medium">
                          {item.temp}
                        </span>
                      ) : null}
                    </div>
                    {item.note ? (
                      <p className="text-xs text-[#68645e] mt-1 italic">
                        Catatan: &ldquo;{item.note}&rdquo;
                      </p>
                    ) : null}
                    <div className="text-xs font-bold text-[#242321] mt-1.5">
                      {formatRupiah(item.unitPrice)}
                    </div>
                  </div>

                  {/* Quantity Stepper */}
                  <div className="flex items-center gap-1.5 bg-white border border-[#e9e5df] rounded-xl p-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => updateQty(item.id, item.qty - 1)}
                      aria-label="Kurangi jumlah"
                      className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg text-[#242321] hover:bg-[#f5f2ed] cursor-pointer transition-colors"
                    >
                      {item.qty === 1 ? (
                        <Trash2 className="w-4 h-4 text-[#d94b3d]" />
                      ) : (
                        <Minus className="w-4 h-4" />
                      )}
                    </button>
                    <span className="w-6 text-center font-bold text-sm text-[#242321]">
                      {item.qty}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQty(item.id, item.qty + 1)}
                      aria-label="Tambah jumlah"
                      className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg text-[#242321] hover:bg-[#f5f2ed] cursor-pointer transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Subtotal & Tindakan */}
          <div className="pt-4 border-t border-[#e9e5df] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#68645e]">Total Pembayaran</span>
              <strong className="text-lg font-extrabold text-[#242321]">
                {formatRupiah(totalAmount)}
              </strong>
            </div>

            <Link href="/checkout" onClick={onClose} className="block w-full">
              <button
                type="button"
                className="w-full min-h-[48px] bg-[#f5c943] hover:bg-[#e8b82b] text-[#242321] font-bold py-3.5 px-5 rounded-full shadow-xs active:scale-95 transition-all text-sm flex items-center justify-center cursor-pointer"
              >
                Lanjut ke Pembayaran ({formatRupiah(totalAmount)})
              </button>
            </Link>

            <button
              type="button"
              onClick={clearCart}
              className="w-full text-center text-xs text-[#68645e] hover:text-[#d94b3d] py-2 cursor-pointer transition-colors min-h-[36px] flex items-center justify-center"
            >
              Kosongkan Keranjang
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
