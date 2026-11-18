'use client';

import { PageHeader } from '@/components/ui/PageHeader';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Tabs } from '@/components/ui/Tabs';
import { EmptyState } from '@/components/ui/EmptyState';
import { FULFILLMENT_LABEL, PAYMENT_BADGE } from '@/lib/statusLabels';
import { demoToolsEnabled } from '@/services/client';
import { makeSaveGuard } from '@/lib/saveGuard';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Order } from '@/types';
import { orderService } from '@/services/orders';
import { formatRupiah, formatDateTimeWIB, formatTimeWIB } from '@/lib/constants';
import { Badge } from '@/components/ui/Badge';
import { Button, buttonClass } from '@/components/ui/Button';
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

  const loadData = async () => {
    try {
      const data = await orderService.getDeviceOrders();
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

  const guard = makeSaveGuard(showToast, loadData);

  const handleReloadSeeds = guard(async () => {
    await orderService.seedDemoOrders();
    await loadData();
    showToast('Contoh riwayat pesanan demo berhasil dimuat ulang!');
  });

  const matches = (o: Order, f: typeof activeFilter): boolean => {
    if (f === 'AKTIF') return o.payment === 'PAID' && ['NEW', 'PREPARING', 'READY'].includes(o.fulfillment);
    if (f === 'SELESAI') return o.fulfillment === 'COMPLETED';
    if (f === 'BATAL') return o.fulfillment === 'CANCELLED' || o.payment === 'FAILED' || o.payment === 'EXPIRED';
    return true;
  };
  const counts = {
    SEMUA: orders.length,
    AKTIF: orders.filter((o) => matches(o, 'AKTIF')).length,
    SELESAI: orders.filter((o) => matches(o, 'SELESAI')).length,
    BATAL: orders.filter((o) => matches(o, 'BATAL')).length,
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
    <div className="bg-canvas min-h-screen flex flex-col">
      <FoodlyHeader
        isOpen={isStoreOpen}
        estimateMinutes={estimateMinutes}
        totalCartItems={totalItems}
        onOpenCart={() => setIsCartDrawerOpen(true)}
      />

      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 flex-1 space-y-6">
        {/* Notifikasi Toast */}
        {toastMsg && (
          <div
            role="status"
            className="p-3 px-4 bg-ink text-white text-xs font-semibold rounded-full shadow-xs flex items-center gap-2 animate-fade-in"
          >
            <CheckCircle2 className="w-4 h-4 text-gold shrink-0" />
            <span>{toastMsg}</span>
          </div>
        )}

        <PageHeader
          breadcrumb={<Breadcrumb items={[{ label: 'Beranda', href: '/' }, { label: 'Riwayat Pesanan' }]} />}
          title="Riwayat Pesanan"
          description="Pesanan yang pernah dibuat dari browser ini, tanpa perlu login."
          actions={
            demoToolsEnabled() ? (
              <Button variant="outline" size="sm" onClick={handleReloadSeeds} title="Muat ulang 6 contoh riwayat pesanan demo">
                <Sparkles className="w-4 h-4 text-gold" />
                Muat Contoh Demo
              </Button>
            ) : undefined
          }
        />

        <Tabs
          ariaLabel="Filter riwayat pesanan"
          value={activeFilter}
          onChange={setActiveFilter}
          items={[
            { value: 'SEMUA', label: 'Semua', count: counts.SEMUA },
            { value: 'AKTIF', label: 'Sedang Berjalan', count: counts.AKTIF },
            { value: 'SELESAI', label: 'Selesai', count: counts.SELESAI },
            { value: 'BATAL', label: 'Batal / Gagal', count: counts.BATAL },
          ]}
        />

        {/* Konten Daftar Pesanan */}
        {isLoading ? (
          <div className="py-20 text-center">
            <div className="w-8 h-8 border-3 border-gold border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-subtle mt-3">Memuat riwayat pesanan...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <EmptyState
            icon={ShoppingBag}
            title="Belum ada pesanan di sini"
            description="Pesanan yang kamu buat dari browser ini akan muncul di sini."
            action={
              <>
                {demoToolsEnabled() && (
                  <Button variant="outline" size="sm" onClick={handleReloadSeeds}>
                    <Sparkles className="w-4 h-4 text-gold" />
                    Muat Contoh Demo
                  </Button>
                )}
                <Link href="/" className={buttonClass('gold', 'sm')}>
                  Pilih Menu
                </Link>
              </>
            }
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
            {filteredOrders.map((o) => (
              <div
                key={o.id}
                className="bg-white border border-line rounded-2xl p-5 sm:p-6 shadow-card hover:shadow-dropdown transition-all space-y-3.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="font-mono font-bold text-sm text-ink block tracking-tight">
                      {o.number}
                    </span>
                    <span className="text-2xs text-subtle">
                      {formatDateTimeWIB(o.created)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    <Badge variant={PAYMENT_BADGE[o.payment].variant} size="sm">
                      {PAYMENT_BADGE[o.payment].text}
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
                        {FULFILLMENT_LABEL[o.fulfillment]}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Info Jadwal Ambil */}
                <div className="flex items-center gap-2.5 text-xs text-ink bg-surface-muted p-3 rounded-2xl border border-line">
                  <Clock className="w-4 h-4 text-icon shrink-0" />
                  <span>
                    Jadwal ambil: <strong>{formatTimeWIB(o.pickup)} WIB</strong> ({o.mode === 'asap' ? 'Secepatnya' : 'Terjadwal'})
                  </span>
                </div>

                {/* Ringkasan Item Menu */}
                <p className="text-xs text-muted line-clamp-1 leading-relaxed">
                  {o.items.map((it) => `${it.qty}x ${it.name}`).join(', ')}
                </p>

                {/* Total dan Tombol Buka Bukti */}
                <div className="pt-3 border-t border-line-soft flex items-center justify-between">
                  <div>
                    <span className="text-2xs text-subtle block">Total Tagihan</span>
                    <strong className="text-sm sm:text-base font-bold text-ink">
                      {formatRupiah(o.total)}
                    </strong>
                  </div>

                  <Link href={`/order/${o.token}`} className={buttonClass('gold', 'sm')}>
                    Buka Bukti
                    <ArrowRight className="w-4 h-4" />
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
