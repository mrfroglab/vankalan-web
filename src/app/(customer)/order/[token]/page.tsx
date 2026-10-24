'use client';

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Order, OrderPaymentStatus } from '@/types';
import { formatRupiah, formatDateTimeWIB, formatTimeWIB } from '@/lib/constants';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { getOrders, saveOrders, getStoreSettings } from '@/lib/store';
import { PaymentModal } from '@/components/customer/PaymentModal';
import {
  Copy,
  ArrowLeft,
  AlertCircle,
  Clock,
  XCircle,
  RotateCcw,
  History,
} from 'lucide-react';

function OrderTrackingContent() {
  const params = useParams();
  const token = params.token as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);

  const loadCurrentOrder = useCallback(() => {
    try {
      const orders = getOrders();
      const found = orders.find((o) => o.token === token);
      if (found) {
        setOrder(found);
      }
    } catch (e) {
      console.warn('Gagal memuat order', e);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadCurrentOrder();

    const handleUpdate = () => {
      loadCurrentOrder();
    };

    window.addEventListener('storage', handleUpdate);
    window.addEventListener('pv_storage_update', handleUpdate);

    return () => {
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('pv_storage_update', handleUpdate);
    };
  }, [loadCurrentOrder]);

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleRetryPaymentOutcome = (outcome: OrderPaymentStatus) => {
    if (!order) return;

    const settings = getStoreSettings();
    const orders = getOrders();
    const now = Date.now();

    const updatedOrders = orders.map((o) => {
      if (o.id === order.id) {
        if (outcome === 'PAID') {
          return {
            ...o,
            payment: 'PAID' as const,
            paidAt: now,
            pickup: o.mode === 'asap' ? now + o.estimate * 60 * 1000 : o.pickup,
            notification: (settings.waConnected ? 'SENT' : 'FAILED') as Order['notification'],
            attempts: (o.attempts || 0) + 1,
          };
        }
        return {
          ...o,
          payment: outcome,
        };
      }
      return o;
    });

    saveOrders(updatedOrders);
    setIsPaymentModalOpen(false);
    loadCurrentOrder();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center p-4">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-3 border-brand-green border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-text-muted">Memuat data pesanan...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-6 rounded-2xl border border-border-line text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-danger-red mx-auto" />
          <h1 className="text-xl font-bold text-ink">Pesanan Tidak Ditemukan</h1>
          <p className="text-sm text-text-muted">
            Tautan pesanan ini tidak valid atau belum tercatat pada browser ini.
          </p>
          <div className="pt-2 flex flex-col gap-2">
            <Link href="/history">
              <Button variant="outline" fullWidth>
                Buka Riwayat Pesanan
              </Button>
            </Link>
            <Link href="/">
              <Button variant="primary" fullWidth>
                Kembali ke Menu
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const fulfillmentLabels: Record<Order['fulfillment'], string> = {
    NEW: 'Pesanan Diterima Dapur',
    PREPARING: 'Sedang Dimasak',
    READY: 'Siap Diambil di Warung',
    COMPLETED: 'Selesai Diambil',
    CANCELLED: 'Dibatalkan oleh Warung',
  };

  const paymentBadges: Record<Order['payment'], { text: string; variant: 'success' | 'warning' | 'danger' }> = {
    PAID: { text: 'Lunas', variant: 'success' },
    PENDING: { text: 'Menunggu Pembayaran', variant: 'warning' },
    FAILED: { text: 'Pembayaran Gagal', variant: 'danger' },
    EXPIRED: { text: 'Kedaluwarsa', variant: 'danger' },
  };

  const isUnpaid = order.payment === 'PENDING' || order.payment === 'FAILED' || order.payment === 'EXPIRED';

  return (
    <div className="min-h-screen bg-paper py-6 sm:py-10 px-4 sm:px-6">
      <div className="max-w-xl mx-auto space-y-6">
        {/* Navigasi Cepat */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-muted hover:text-ink transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Menu</span>
          </Link>

          <Link
            href="/history"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-green hover:underline transition-colors"
          >
            <History className="w-4 h-4" />
            <span>Riwayat Pesanan</span>
          </Link>
        </div>

        {/* Banner Status Pembayaran Belum Lunas */}
        {isUnpaid && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-3">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-bold text-amber-900">
                  {order.payment === 'PENDING'
                    ? 'Pesanan Belum Dilunasi'
                    : order.payment === 'FAILED'
                    ? 'Pembayaran Gagal Diproses'
                    : 'Waktu Pembayaran Telah Kedaluwarsa'}
                </p>
                <p className="text-amber-800 leading-relaxed">
                  Dapur hanya menyiapkan pesanan setelah pembayaran terverifikasi lunas.
                </p>
              </div>
            </div>

            <Button
              variant="primary"
              size="sm"
              fullWidth
              onClick={() => setIsPaymentModalOpen(true)}
            >
              <RotateCcw className="w-4 h-4 mr-1.5" />
              {order.payment === 'PENDING' ? 'Lanjutkan Pembayaran' : 'Coba Bayar Ulang'}
            </Button>
          </div>
        )}

        {/* Banner Pesanan Dibatalkan */}
        {order.fulfillment === 'CANCELLED' && (
          <div className="p-4 bg-danger-red/10 border border-danger-red/30 rounded-2xl space-y-2">
            <div className="flex items-start gap-2.5">
              <XCircle className="w-5 h-5 text-danger-red shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-bold text-danger-red">Pesanan Dibatalkan oleh Penjaga</p>
                <p className="text-text-muted">
                  Alasan: <strong>{order.cancelReason || 'Bahan baku habis atau warung tutup sementara.'}</strong>
                </p>
                {order.refund && order.refund.status !== 'NONE' && (
                  <p className="text-brand-green font-semibold pt-1">
                    Status Refund: {order.refund.status === 'FULL_REFUNDED' ? 'Lunas Ditransfer' : 'Menunggu Transfer'} ({formatRupiah(order.refund.amount)})
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Card Ringkasan Status Pesanan */}
        <section className="bg-white p-6 rounded-3xl border border-border-line shadow-xs space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                Bukti Pesanan Warmindo
              </span>
              <h1 className="text-xl sm:text-2xl font-black font-mono text-ink mt-0.5">
                {order.number}
              </h1>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <Badge variant={paymentBadges[order.payment].variant} size="md">
                {paymentBadges[order.payment].text}
              </Badge>
              {order.payment === 'PAID' && (
                <Badge
                  variant={
                    order.fulfillment === 'COMPLETED'
                      ? 'success'
                      : order.fulfillment === 'CANCELLED'
                      ? 'danger'
                      : 'info'
                  }
                  size="sm"
                >
                  {fulfillmentLabels[order.fulfillment]}
                </Badge>
              )}
            </div>
          </div>

          {/* Estimasi Jam Ambil */}
          <div className="p-4 bg-soft-green/30 border border-brand-green/20 rounded-2xl space-y-1">
            <span className="text-xs font-semibold text-brand-green">
              Waktu Pengambilan di Warung
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl font-black text-ink">
                {formatTimeWIB(order.pickup)} WIB
              </span>
              <span className="text-xs text-text-muted">
                ({formatDateTimeWIB(order.pickup)})
              </span>
            </div>
            <p className="text-[11px] text-text-muted pt-0.5">
              Makanan disiapkan mendekati jam ini agar tetap hangat dan fresh saat kamu tiba.
            </p>
          </div>

          {/* Rincian Pemesan */}
          <div className="grid grid-cols-2 gap-4 text-xs pt-1 border-t border-border-line">
            <div>
              <span className="text-text-muted block">Nama Pemesan</span>
              <strong className="text-ink text-sm">{order.name}</strong>
            </div>
            <div>
              <span className="text-text-muted block">WhatsApp</span>
              <strong className="text-ink text-sm">{order.phone}</strong>
            </div>
          </div>

          {/* Rincian Menu */}
          <div className="space-y-3 pt-3 border-t border-border-line">
            <span className="text-xs font-bold uppercase tracking-wider text-ink">
              Rincian Menu yang Dipesan
            </span>

            <div className="divide-y divide-border-line">
              {order.items.map((it, idx) => (
                <div key={idx} className="py-2.5 flex justify-between items-start text-xs">
                  <div>
                    <span className="font-bold text-ink">
                      {it.qty}x {it.name}
                    </span>
                    <div className="text-text-muted space-x-1 mt-0.5">
                      {it.temp && <span>[{it.temp}]</span>}
                      {it.egg && <span>[+Telur]</span>}
                      {it.note && <span>({it.note})</span>}
                    </div>
                  </div>
                  <span className="font-semibold text-ink">
                    {formatRupiah(it.unit * it.qty)}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-border-line flex justify-between items-center text-sm font-black text-ink">
              <span>Total Tagihan</span>
              <span className="text-brand-green text-base">
                {formatRupiah(order.total)}
              </span>
            </div>
          </div>

          {/* Tautan Privat & Bagikan */}
          <div className="pt-4 border-t border-border-line space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-ink">
                Simpan Tautan Pesanan
              </span>
              {copied && (
                <span className="text-[11px] text-brand-green font-bold">
                  Tautan disalin ke clipboard!
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={handleCopyLink}
              className="w-full min-h-[44px] px-3.5 py-2.5 bg-paper hover:bg-neutral-100 border border-border-line rounded-xl text-xs font-semibold text-ink flex items-center justify-between transition-colors cursor-pointer"
            >
              <span className="truncate font-mono text-[11px] text-text-muted pr-2">
                {typeof window !== 'undefined' ? window.location.href : order.token}
              </span>
              <div className="flex items-center gap-1.5 shrink-0 text-brand-green">
                <Copy className="w-4 h-4" />
                <span>Salin</span>
              </div>
            </button>
            <p className="text-[11px] text-text-muted">
              Kamu bisa membuka halaman ini kapan saja dari perangkat ini lewat menu Riwayat Pesanan.
            </p>
          </div>
        </section>

        {/* Modal Simulasi Pembayaran Ulang */}
        <PaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          orderNumber={order.number}
          customerName={order.name}
          totalAmount={order.total}
          onSelectOutcome={handleRetryPaymentOutcome}
        />
      </div>
    </div>
  );
}

export default function OrderTrackingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-paper flex items-center justify-center p-4">
          <div className="w-8 h-8 border-3 border-brand-green border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <OrderTrackingContent />
    </Suspense>
  );
}
