'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Order } from '@/types';
import { getOrders, seedDemoOrders } from '@/lib/store';
import { formatRupiah, formatDateTimeWIB, formatTimeWIB } from '@/lib/constants';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  ArrowLeft,
  Clock,
  ShoppingBag,
  ArrowRight,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';

export default function CustomerHistoryPage() {
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
    return true; // SEMUA
  });

  return (
    <div className="min-h-screen bg-paper py-6 sm:py-10 px-4 sm:px-6">
      <div className="max-w-xl mx-auto space-y-6">
        {/* Navigasi Kembali & Aksi Seed Demo */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-muted hover:text-ink transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Menu</span>
          </Link>

          <button
            type="button"
            onClick={handleReloadSeeds}
            className="text-xs font-semibold text-brand-green hover:underline flex items-center gap-1 cursor-pointer"
            title="Muat ulang 6 contoh riwayat pesanan demo"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Muat Contoh Demo</span>
          </button>
        </div>

        {toastMsg && (
          <div
            role="status"
            className="p-3 bg-brand-green text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-2 animate-fade-in"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* Judul Halaman */}
        <div>
          <h1 className="text-2xl font-black text-ink">Riwayat Pesanan</h1>
          <p className="text-xs text-text-muted mt-1">
            Daftar pesanan yang pernah dibuat dari browser perangkat ini tanpa perlu login.
          </p>
        </div>

        {/* Filter Tab Riwayat */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {[
            { id: 'SEMUA' as const, label: 'Semua' },
            { id: 'AKTIF' as const, label: 'Sedang Berjalan' },
            { id: 'SELESAI' as const, label: 'Selesai' },
            { id: 'BATAL' as const, label: 'Batal / Gagal' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveFilter(tab.id)}
              className={`min-h-[36px] px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer shrink-0 ${
                activeFilter === tab.id
                  ? 'bg-brand-green text-white border-brand-green'
                  : 'bg-white text-text-muted hover:text-ink border-border-line'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Daftar Pesanan */}
        {isLoading ? (
          <div className="py-16 text-center">
            <div className="w-8 h-8 border-3 border-brand-green border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-text-muted mt-2">Memuat riwayat...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white p-8 rounded-3xl border border-border-line text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-soft-green flex items-center justify-center mx-auto text-brand-green">
              <ShoppingBag className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-bold text-ink">Belum Ada Pesanan di Kategori Ini</h2>
              <p className="text-xs text-text-muted max-w-sm mx-auto">
                Kamu bisa membuat pesanan baru dari menu atau memuat contoh data simulasi untuk mencoba tampilan bukti pesanan.
              </p>
            </div>
            <div className="pt-2 flex flex-col sm:flex-row justify-center gap-2">
              <Button variant="outline" size="sm" onClick={handleReloadSeeds}>
                <Sparkles className="w-4 h-4 mr-1.5 text-brand-green" />
                <span>Muat Contoh Demo</span>
              </Button>
              <Link href="/">
                <Button variant="primary" size="sm">
                  Pilih Menu Warmindo
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-3.5">
            {filteredOrders.map((o) => (
              <div
                key={o.id}
                className="bg-white p-5 rounded-2xl border border-border-line shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono font-bold text-sm text-ink block">
                      {o.number}
                    </span>
                    <span className="text-[11px] text-text-muted">
                      {formatDateTimeWIB(o.created)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
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
                            : 'info'
                        }
                        size="sm"
                      >
                        {fulfillmentLabels[o.fulfillment]}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Info Ambil */}
                <div className="flex items-center gap-2 text-xs text-ink bg-paper p-2.5 rounded-xl border border-border-line">
                  <Clock className="w-4 h-4 text-brand-green shrink-0" />
                  <span>
                    Jadwal ambil: <strong>{formatTimeWIB(o.pickup)} WIB</strong> ({o.mode === 'asap' ? 'Secepatnya' : 'Terjadwal'})
                  </span>
                </div>

                {/* Ringkasan Item */}
                <p className="text-xs text-text-muted line-clamp-1">
                  {o.items.map((it) => `${it.qty}x ${it.name}`).join(', ')}
                </p>

                {/* Total & Link */}
                <div className="pt-2 border-t border-border-line flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-text-muted block">Total Tagihan</span>
                    <strong className="text-sm font-black text-ink">
                      {formatRupiah(o.total)}
                    </strong>
                  </div>

                  <Link href={`/order/${o.token}`}>
                    <Button variant="outline" size="sm">
                      <span>Buka Bukti</span>
                      <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
