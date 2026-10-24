'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Order } from '@/types';
import { getOrders, seedDemoOrders } from '@/lib/store';
import { formatRupiah, formatDateTimeWIB, formatTimeWIB } from '@/lib/constants';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { FoodlyHeader } from '@/components/customer/FoodlyHeader';
import { FoodlyFooter } from '@/components/customer/FoodlyFooter';
import { CartDrawer } from '@/components/customer/CartDrawer';
import { useCart } from '@/context/CartContext';
import {
  Clock,
  ShoppingBag,
  ArrowRight,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';

export default function CustomerHistoryPage() {
  const { isStoreOpen, estimateMinutes, totalItems } = useCart();
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState<boolean>(false);

  const [orders, setOrders] = useState<Order[]>([]);
  const [activeFilter, setActiveFilter] = useState<'SEMUA' | 'AKTIF' | 'SELESAI' | 'BATAL'>('SEMUA');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const loadData = () => {
    try {
      const data = getOrders();
      setOrders(data);
    } catch (e) {
      console.warn('Gagal memuat riwayat pesanan', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleUpdate = () => {
      loadData();
    };

    window.addEventListener('storage', handleUpdate);
    window.addEventListener('pv_storage_update', handleUpdate);

    return () => {
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('pv_storage_update', handleUpdate);
    };
  }, []);

  const handleReloadSeeds = () => {
    seedDemoOrders();
    loadData();
    showToast('Contoh riwayat pesanan demo berhasil dimuat ulang!');
  };

  const paymentBadges: Record<Order['payment'], { text: string; variant: 'success' | 'warning' | 'danger' }> = {
    PAID: { text: 'Lunas', variant: 'success' },
    PENDING: { text: 'Menunggu Bayar', variant: 'warning' },
    FAILED: { text: 'Gagal', variant: 'danger' },
    EXPIRED: { text: 'Kedaluwarsa', variant: 'danger' },
  };

  const fulfillmentLabels: Record<Order['fulfillment'], string> = {
    NEW: 'Diterima Dapur',
    PREPARING: 'Sedang Dimasak',
    READY: 'Siap Diambil',
    COMPLETED: 'Selesai',
    CANCELLED: 'Dibatalkan',
  };

  const filteredOrders = orders.filter((o) => {
    if (activeFilter === 'AKTIF') {
      return o.payment === 'PAID' && ['NEW', 'PREPARING', 'READY'].includes(o.fulfillment);
    }
    if (activeFilter === 'SELESAI') {
      return o.fulfillment === 'COMPLETED';
    }
    if (activeFilter === 'BATAL') {
      return o.fulfillment === 'CANCELLED' || o.payment === 'FAILED' || o.payment === 'EXPIRED';
    }
    return true;
  });

  return (
    <div className="bg-[#f5f2ed] min-h-screen flex flex-col">
      <FoodlyHeader
        isOpen={isStoreOpen}
        estimateMinutes={estimateMinutes}
        totalCartItems={totalItems}
        onOpenCart={() => setIsCartDrawerOpen(true)}
      />

      <main className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-8 flex-1 space-y-6">
        {/* Breadcrumb Ringkas */}
        <nav
          aria-label="Breadcrumb"
          className="text-[10px] text-[#918c84] uppercase tracking-wide font-medium flex items-center gap-1.5"
        >
          <Link href="/" className="hover:text-[#242321] transition-colors">
            Beranda
          </Link>
          <span>/</span>
          <span className="text-[#242321] font-semibold">Riwayat Pesanan</span>
        </nav>

        {/* Notifikasi Toast */}
        {toastMsg && (
          <div
            role="status"
            className="p-3 px-4 bg-[#242321] text-white text-xs font-semibold rounded-full shadow-xs flex items-center gap-2 animate-fade-in"
          >
            <CheckCircle2 className="w-4 h-4 text-[#f5c943] shrink-0" />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* Tajuk Halaman dan Aksi Contoh Demo */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold font-editorial text-[#242321]">
              Riwayat Pesanan
            </h1>
            <p className="text-xs sm:text-sm text-[#68645e] mt-1">
              Daftar pesanan yang pernah dibuat dari browser ini tanpa perlu login akun.
            </p>
          </div>

          <button
            type="button"
            onClick={handleReloadSeeds}
            className="min-h-[44px] px-4 py-2 rounded-full border border-[#e9e5df] bg-white hover:bg-[#fbf9f5] text-[#242321] text-xs font-semibold flex items-center gap-2 transition-all shadow-xs cursor-pointer active:scale-95 shrink-0 self-start sm:self-auto"
            title="Muat ulang 6 contoh riwayat pesanan demo"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#f5c943]" />
            <span>Muat Contoh Demo</span>
          </button>
        </div>

        {/* Segmented Filter Tabs */}
        <div className="bg-white border border-[#e9e5df] p-1.5 rounded-full flex items-center gap-1.5 overflow-x-auto shadow-card">
          {[
            { id: 'SEMUA' as const, label: 'Semua' },
            { id: 'AKTIF' as const, label: 'Sedang Berjalan' },
            { id: 'SELESAI' as const, label: 'Selesai' },
            { id: 'BATAL' as const, label: 'Batal / Gagal' },
          ].map((tab) => {
            const isActive = activeFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveFilter(tab.id)}
                className={`min-h-[40px] px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-[#f5c943] text-[#242321] shadow-xs'
                    : 'text-[#68645e] hover:text-[#242321] hover:bg-[#f5f2ed]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Konten Daftar Pesanan */}
        {isLoading ? (
          <div className="py-20 text-center">
            <div className="w-8 h-8 border-3 border-[#f5c943] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-[#918c84] mt-3">Memuat riwayat pesanan...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white p-8 sm:p-12 rounded-2xl border border-[#e9e5df] text-center space-y-4 shadow-card">
            <div className="w-16 h-16 rounded-full bg-[#fbf9f5] border border-[#e9e5df] flex items-center justify-center mx-auto text-[#77736d]">
              <ShoppingBag className="w-8 h-8" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-lg font-bold font-editorial text-[#242321]">
                Belum Ada Pesanan di Kategori Ini
              </h2>
              <p className="text-xs sm:text-sm text-[#68645e] max-w-sm mx-auto leading-relaxed">
                Kamu bisa membuat pesanan baru dari katalog menu atau memuat contoh data simulasi untuk mencoba tampilan bukti pesanan.
              </p>
            </div>
            <div className="pt-2 flex flex-col sm:flex-row justify-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleReloadSeeds}
                className="rounded-full min-h-[44px]"
              >
                <Sparkles className="w-4 h-4 mr-1.5 text-[#f5c943]" />
                <span>Muat Contoh Demo</span>
              </Button>
              <Link href="/">
                <Button
                  variant="gold"
                  size="sm"
                  className="rounded-full min-h-[44px] w-full sm:w-auto"
                >
                  Pilih Menu Warmindo
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((o) => (
              <div
                key={o.id}
                className="bg-white border border-[#e9e5df] rounded-2xl p-5 sm:p-6 shadow-card hover:shadow-dropdown transition-all space-y-3.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="font-mono font-bold text-sm text-[#242321] block tracking-tight">
                      {o.number}
                    </span>
                    <span className="text-[11px] text-[#918c84]">
                      {formatDateTimeWIB(o.created)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    <Badge variant={paymentBadges[o.payment].variant} size="sm">
                      {paymentBadges[o.payment].text}
                    </Badge>
                    {o.payment === 'PAID' && (
                      <Badge
                        variant={
                          o.fulfillment === 'COMPLETED'
                            ? 'success'
                            : o.fulfillment === 'CANCELLED'
                            ? 'danger'
                            : 'gold'
                        }
                        size="sm"
                      >
                        {fulfillmentLabels[o.fulfillment]}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Info Jadwal Ambil */}
                <div className="flex items-center gap-2.5 text-xs text-[#242321] bg-[#fbf9f5] p-3 rounded-2xl border border-[#e9e5df]">
                  <Clock className="w-4 h-4 text-[#77736d] shrink-0" />
                  <span>
                    Jadwal ambil: <strong>{formatTimeWIB(o.pickup)} WIB</strong> ({o.mode === 'asap' ? 'Secepatnya' : 'Terjadwal'})
                  </span>
                </div>

                {/* Ringkasan Item Menu */}
                <p className="text-xs text-[#68645e] line-clamp-1 leading-relaxed">
                  {o.items.map((it) => `${it.qty}x ${it.name}`).join(', ')}
                </p>

                {/* Total dan Tombol Buka Bukti */}
                <div className="pt-3 border-t border-[#eeeae4] flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-[#918c84] block">Total Tagihan</span>
                    <strong className="text-sm sm:text-base font-bold text-[#242321]">
                      {formatRupiah(o.total)}
                    </strong>
                  </div>

                  <Link href={`/order/${o.token}`}>
                    <Button
                      variant="gold"
                      size="sm"
                      className="rounded-full px-4 min-h-[44px] font-bold shadow-xs"
                    >
                      <span>Buka Bukti</span>
                      <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <FoodlyFooter />

      <CartDrawer
        isOpen={isCartDrawerOpen}
        onClose={() => setIsCartDrawerOpen(false)}
      />
    </div>
  );
}
