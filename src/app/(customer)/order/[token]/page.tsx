'use client';

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Order, OrderPaymentStatus } from '@/types';
import { formatRupiah, formatDateTimeWIB, formatTimeWIB } from '@/lib/constants';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { getOrders, saveOrders, getStoreSettings } from '@/lib/store';
import { FoodlyHeader } from '@/components/customer/FoodlyHeader';
import { FoodlyFooter } from '@/components/customer/FoodlyFooter';
import { CartDrawer } from '@/components/customer/CartDrawer';
import { PaymentModal } from '@/components/customer/PaymentModal';
import { useCart } from '@/context/CartContext';
import {
  Copy,
  ArrowLeft,
  AlertCircle,
  Clock,
  XCircle,
  RotateCcw,
  History,
  Check,
} from 'lucide-react';

function OrderTrackingContent() {
  const params = useParams();
  const token = params.token as string;

  const { isStoreOpen, estimateMinutes, totalItems } = useCart();
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState<boolean>(false);

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
      console.warn('Gagal memuat pesanan', e);
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

  const fulfillmentLabels: Record<Order['fulfillment'], string> = {
    NEW: 'Diterima Dapur',
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

  if (isLoading) {
    return (
      <div className="bg-[#f5f2ed] min-h-screen flex flex-col">
        <FoodlyHeader
          isOpen={isStoreOpen}
          estimateMinutes={estimateMinutes}
          totalCartItems={totalItems}
          onOpenCart={() => setIsCartDrawerOpen(true)}
        />
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="text-center space-y-3">
            <div className="w-8 h-8 border-3 border-[#f5c943] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-[#918c84]">Memuat data pesanan...</p>
          </div>
        </main>
        <FoodlyFooter />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="bg-[#f5f2ed] min-h-screen flex flex-col">
        <FoodlyHeader
          isOpen={isStoreOpen}
          estimateMinutes={estimateMinutes}
          totalCartItems={totalItems}
          onOpenCart={() => setIsCartDrawerOpen(true)}
        />
        <main className="max-w-md mx-auto w-full px-4 sm:px-6 py-12 flex-1 flex items-center justify-center">
          <div className="w-full bg-white p-8 sm:p-10 rounded-[16px] border border-[#e9e5df] text-center space-y-4 shadow-card">
            <div className="w-16 h-16 rounded-full bg-[#fde7e4] border border-[#f7c5be] flex items-center justify-center mx-auto text-[#91251c]">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold font-editorial text-[#242321]">
              Pesanan Tidak Ditemukan
            </h1>
            <p className="text-xs sm:text-sm text-[#68645e] leading-relaxed">
              Tautan pesanan ini tidak valid atau belum tersimpan pada browser perangkat ini.
            </p>
            <div className="pt-2 flex flex-col gap-2.5">
              <Link href="/history" className="block">
                <Button variant="outline" fullWidth size="md" className="rounded-full">
                  Buka Riwayat Pesanan
                </Button>
              </Link>
              <Link href="/" className="block">
                <Button variant="gold" fullWidth size="md" className="rounded-full font-bold">
                  Kembali ke Menu
                </Button>
              </Link>
            </div>
          </div>
        </main>
        <FoodlyFooter />
      </div>
    );
  }

  const isUnpaid = order.payment === 'PENDING' || order.payment === 'FAILED' || order.payment === 'EXPIRED';

  return (
    <div className="bg-[#f5f2ed] min-h-screen flex flex-col">
      <FoodlyHeader
        isOpen={isStoreOpen}
        estimateMinutes={estimateMinutes}
        totalCartItems={totalItems}
        onOpenCart={() => setIsCartDrawerOpen(true)}
      />

      <main className="max-w-2xl mx-auto w-full px-4 sm:px-6 py-8 flex-1 space-y-6">
        {/* Breadcrumb */}
        <nav
          aria-label="Breadcrumb"
          className="text-[10px] text-[#918c84] uppercase tracking-wide font-medium flex items-center gap-1.5"
        >
          <Link href="/" className="hover:text-[#242321] transition-colors">
            Beranda
          </Link>
          <span>/</span>
          <span className="text-[#242321] font-semibold">Bukti Pesanan</span>
        </nav>

        {/* Navigasi Cepat Antar Halaman */}
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#68645e] hover:text-[#242321] transition-colors min-h-[44px]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Menu</span>
          </Link>

          <Link
            href="/history"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#242321] hover:underline underline-offset-4 transition-colors min-h-[44px]"
          >
            <History className="w-4 h-4 text-[#77736d]" />
            <span>Riwayat Pesanan</span>
          </Link>
        </div>

        {/* Banner Status Pembayaran Belum Lunas */}
        {isUnpaid && (
          <div className="p-5 bg-[#fef8e8] border border-[#f5c943]/40 rounded-2xl space-y-3.5 shadow-xs animate-fade-in">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-[#242321] shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-bold text-[#242321] text-sm">
                  {order.payment === 'PENDING'
                    ? 'Pesanan Belum Dilunasi'
                    : order.payment === 'FAILED'
                    ? 'Pembayaran Gagal Diproses'
                    : 'Waktu Pembayaran Telah Kedaluwarsa'}
                </p>
                <p className="text-[#68645e] leading-relaxed">
                  Dapur hanya mulai menyiapkan pesanan setelah pembayaran terverifikasi lunas.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsPaymentModalOpen(true)}
              className="w-full min-h-[44px] bg-[#f5c943] hover:bg-[#e8b82b] text-[#242321] font-bold rounded-full py-2.5 px-4 flex items-center justify-center gap-2 transition-all text-xs sm:text-sm cursor-pointer shadow-xs active:scale-95"
            >
              <RotateCcw className="w-4 h-4" />
              <span>{order.payment === 'PENDING' ? 'Lanjutkan Pembayaran' : 'Coba Bayar Ulang'}</span>
            </button>
          </div>
        )}

        {/* Banner Pesanan Dibatalkan */}
        {order.fulfillment === 'CANCELLED' && (
          <div className="p-5 bg-[#fde7e4] border border-[#f7c5be] rounded-2xl space-y-2 text-[#91251c] animate-fade-in">
            <div className="flex items-start gap-2.5">
              <XCircle className="w-5 h-5 text-[#d94b3d] shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-bold text-sm text-[#91251c]">Pesanan Dibatalkan oleh Penjaga</p>
                <p className="text-[#68645e] leading-relaxed">
                  Alasan: <strong>{order.cancelReason || 'Bahan baku habis atau warung tutup sementara.'}</strong>
                </p>
                {order.refund && order.refund.status !== 'NONE' && (
                  <p className="text-[#1c4d25] font-semibold pt-1">
                    Status Refund: {order.refund.status === 'FULL_REFUNDED' ? 'Lunas Ditransfer' : 'Menunggu Transfer'} ({formatRupiah(order.refund.amount)})
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Card Utama Bukti Pesanan */}
        <section className="bg-white p-6 sm:p-8 rounded-[16px] border border-[#e9e5df] shadow-card space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#918c84]">
                Bukti Pesanan Warmindo
              </span>
              <h1 className="text-xl sm:text-2xl font-bold font-mono text-[#242321] mt-0.5 tracking-tight">
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
                      : 'gold'
                  }
                  size="sm"
                >
                  {fulfillmentLabels[order.fulfillment]}
                </Badge>
              )}
            </div>
          </div>

          {/* Kotak Estimasi Jam Ambil */}
          <div className="p-4 sm:p-5 bg-[#fbf9f5] border border-[#e9e5df] rounded-xl space-y-1.5">
            <span className="text-xs font-semibold text-[#68645e] block">
              Waktu Pengambilan di Warung
            </span>
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-2xl sm:text-3xl font-extrabold text-[#242321]">
                {formatTimeWIB(order.pickup)} WIB
              </span>
              <span className="text-xs text-[#918c84]">
                ({formatDateTimeWIB(order.pickup)})
              </span>
            </div>
            <p className="text-[11px] text-[#68645e] pt-0.5 leading-relaxed">
              Makanan disiapkan mendekati jam ini agar tetap hangat dan segar saat kamu tiba di warung.
            </p>
          </div>

          {/* Rincian Pemesan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-1 border-t border-[#eeeae4]">
            <div>
              <span className="text-[#918c84] block mb-0.5">Nama Pemesan</span>
              <strong className="text-[#242321] text-sm">{order.name}</strong>
            </div>
            <div>
              <span className="text-[#918c84] block mb-0.5">Nomor WhatsApp</span>
              <strong className="text-[#242321] text-sm">{order.phone}</strong>
            </div>
          </div>

          {/* Rincian Menu yang Dipesan */}
          <div className="space-y-3 pt-3 border-t border-[#eeeae4]">
            <span className="text-xs font-bold uppercase tracking-wider text-[#242321]">
              Rincian Menu yang Dipesan
            </span>

            <div className="divide-y divide-[#eeeae4]">
              {order.items.map((it, idx) => (
                <div key={idx} className="py-3 flex justify-between items-start text-xs">
                  <div>
                    <span className="font-bold text-[#242321]">
                      {it.qty}x {it.name}
                    </span>
                    <div className="text-[#68645e] space-x-1.5 mt-0.5">
                      {it.temp && (
                        <span className="bg-[#fbf9f5] px-1.5 py-0.5 rounded text-[11px] border border-[#e9e5df]">
                          {it.temp}
                        </span>
                      )}
                      {it.egg && (
                        <span className="bg-[#fbf9f5] px-1.5 py-0.5 rounded text-[11px] border border-[#e9e5df]">
                          + Telur
                        </span>
                      )}
                      {it.note && <span>({it.note})</span>}
                    </div>
                  </div>
                  <span className="font-bold text-[#242321]">
                    {formatRupiah(it.unit * it.qty)}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-[#eeeae4] flex justify-between items-center text-sm font-bold text-[#242321]">
              <span>Total Tagihan</span>
              <span className="text-base sm:text-lg font-extrabold text-[#242321]">
                {formatRupiah(order.total)}
              </span>
            </div>
          </div>

          {/* Tautan Privat dan Salin Link */}
          <div className="pt-4 border-t border-[#eeeae4] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#242321]">
                Simpan Tautan Pesanan
              </span>
              {copied && (
                <span className="text-[11px] text-[#1c4d25] font-bold flex items-center gap-1 animate-fade-in">
                  <Check className="w-3.5 h-3.5" />
                  <span>Tautan disalin ke clipboard!</span>
                </span>
              )}
            </div>

            <div className="p-2.5 bg-[#f5f2ed] border border-[#e9e5df] rounded-xl flex items-center justify-between gap-2">
              <span className="truncate font-mono text-xs text-[#68645e] px-1 select-all">
                {typeof window !== 'undefined' ? window.location.href : order.token}
              </span>
              <button
                type="button"
                onClick={handleCopyLink}
                className="min-h-[40px] px-3.5 py-2 rounded-lg bg-white border border-[#e9e5df] text-[#242321] font-semibold text-xs flex items-center gap-1.5 hover:bg-[#fbf9f5] transition-colors cursor-pointer shrink-0 shadow-xs"
              >
                <Copy className="w-3.5 h-3.5 text-[#77736d]" />
                <span>{copied ? 'Tersalin' : 'Salin'}</span>
              </button>
            </div>

            <p className="text-[11px] text-[#918c84] leading-relaxed">
              Kamu bisa membuka kembali halaman ini sewaktu-waktu dari peramban ini lewat menu Riwayat Pesanan.
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
      </main>

      <FoodlyFooter />

      <CartDrawer
        isOpen={isCartDrawerOpen}
        onClose={() => setIsCartDrawerOpen(false)}
      />
    </div>
  );
}

export default function OrderTrackingPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-[#f5f2ed] min-h-screen flex items-center justify-center p-6">
          <div className="w-8 h-8 border-3 border-[#f5c943] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <OrderTrackingContent />
    </Suspense>
  );
}
