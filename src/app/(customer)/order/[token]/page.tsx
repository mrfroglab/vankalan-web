'use client';

import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { FULFILLMENT_LABEL, PAYMENT_BADGE } from '@/lib/statusLabels';
import React, { useState, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Order, OrderPaymentStatus } from '@/types';
import { formatRupiah, formatDateTimeWIB, formatTimeWIB, formatPhone } from '@/lib/constants';
import { Badge } from '@/components/ui/Badge';
import { Button, buttonClass } from '@/components/ui/Button';
import { orderService } from '@/services/orders';
import { ApiError } from '@/services/client';
import { useAutoPolling } from '@/hooks/useAutoPolling';
import { triggerSnapPayment } from '@/lib/midtrans';
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
  const [loadError, setLoadError] = useState<boolean>(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const loadCurrentOrder = useCallback(async () => {
    try {
      const found = await orderService.getOrderByToken(token);
      if (found) {
        setOrder(found);
      }
      setLoadError(false);
    } catch (e) {
      console.warn('Gagal memuat pesanan', e);
      setLoadError(true);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  // Terminal state optimization: hentikan polling jika pesanan COMPLETED atau CANCELLED
  const isTerminal = order?.fulfillment === 'COMPLETED' || order?.fulfillment === 'CANCELLED';

  useAutoPolling(loadCurrentOrder, {
    intervalMs: 10000, // 10 detik polling sesuai PRD
    enabled: Boolean(token) && !isTerminal,
    immediate: true,
    listenStorage: true,
  });

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleRetryPaymentClick = async () => {
    if (!order) return;
    setPaymentError(null);
    // Snap hanya dibuka di browser; status lunas tetap datang dari webhook server,
    // jadi setiap callback cukup memuat ulang pesanan.
    const reload = () => {
      void loadCurrentOrder();
    };
    try {
      const start = await orderService.startPayment(token);
      const snapToken = start?.snapToken ?? order.snapToken;
      if (snapToken) {
        const snapTriggered = await triggerSnapPayment(snapToken, {
          onSuccess: reload,
          onPending: reload,
          onError: reload,
          onClose: reload,
        });
        if (snapTriggered) return;
      }
    } catch (err) {
      console.warn('Gagal memulai pembayaran:', err);
      // 503 = Midtrans belum dikonfigurasi (dev): lanjut ke modal simulasi yang dijaga server.
      if (err instanceof ApiError && err.statusCode !== 503) {
        setPaymentError(err.message);
        return;
      }
    }

    setIsPaymentModalOpen(true);
  };

  const handleRetryPaymentOutcome = async (outcome: OrderPaymentStatus) => {
    if (!order) return;

    try {
      await orderService.updateOrderPayment(order.id, outcome);
    } catch (err) {
      console.warn('Gagal update payment status di service:', err);
    }

    setIsPaymentModalOpen(false);
    await loadCurrentOrder();
  };

  if (isLoading) {
    return (
      <div className="bg-canvas min-h-screen flex flex-col">
        <FoodlyHeader
          isOpen={isStoreOpen}
          estimateMinutes={estimateMinutes}
          totalCartItems={totalItems}
          onOpenCart={() => setIsCartDrawerOpen(true)}
        />
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="text-center space-y-3">
            <div className="w-8 h-8 border-3 border-gold border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-subtle">Memuat data pesanan...</p>
          </div>
        </main>
        <FoodlyFooter />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="bg-canvas min-h-screen flex flex-col">
        <FoodlyHeader
          isOpen={isStoreOpen}
          estimateMinutes={estimateMinutes}
          totalCartItems={totalItems}
          onOpenCart={() => setIsCartDrawerOpen(true)}
        />
        <main className="max-w-md mx-auto w-full px-4 sm:px-6 py-12 flex-1 flex items-center justify-center">
          <div className="w-full bg-white p-8 sm:p-10 rounded-2xl border border-line text-center space-y-4 shadow-card">
            <div className="w-16 h-16 rounded-full bg-danger-soft border border-danger-line flex items-center justify-center mx-auto text-danger-ink">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold font-editorial text-ink">
              {loadError ? 'Belum Bisa Memuat Pesanan' : 'Pesanan Tidak Ditemukan'}
            </h1>
            <p className="text-xs sm:text-sm text-muted leading-relaxed">
              {loadError
                ? 'Koneksi ke warung sedang terganggu. Pesananmu tetap tersimpan; coba muat lagi sebentar.'
                : 'Tautan pesanan ini tidak valid atau belum tersimpan pada browser perangkat ini.'}
            </p>
            <div className="pt-2 flex flex-col gap-2.5">
              {loadError && (
                <Button
                  variant="gold"
                  fullWidth
                  size="md"
                 
                  onClick={() => {
                    setIsLoading(true);
                    loadCurrentOrder();
                  }}
                >
                  Coba Lagi
                </Button>
              )}
              <Link href="/history" className={buttonClass('outline', 'md', 'w-full')}>
                Buka Riwayat Pesanan
              </Link>
              <Link href="/" className={buttonClass(loadError ? 'outline' : 'gold', 'md', 'w-full')}>
                Kembali ke Menu
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
    <div className="bg-canvas min-h-screen flex flex-col">
      <FoodlyHeader
        isOpen={isStoreOpen}
        estimateMinutes={estimateMinutes}
        totalCartItems={totalItems}
        onOpenCart={() => setIsCartDrawerOpen(true)}
      />

      <main className="max-w-2xl mx-auto w-full px-4 sm:px-6 py-8 flex-1 space-y-6">
        {/* Breadcrumb */}
        <Breadcrumb items={[{ label: 'Beranda', href: '/' }, { label: 'Bukti Pesanan' }]} />

        {/* Navigasi Cepat Antar Halaman */}
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-ink transition-colors min-h-11"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Menu</span>
          </Link>

          <Link
            href="/history"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink hover:underline underline-offset-4 transition-colors min-h-11"
          >
            <History className="w-4 h-4 text-icon" />
            <span>Riwayat Pesanan</span>
          </Link>
        </div>

        {/* Banner Status Pembayaran Belum Lunas */}
        {isUnpaid && (
          <div className="p-5 bg-gold-tint border border-gold/40 rounded-2xl space-y-3.5 shadow-xs animate-fade-in">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-ink shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-bold text-ink text-sm">
                  {order.payment === 'PENDING'
                    ? 'Pesanan Belum Dilunasi'
                    : order.payment === 'FAILED'
                    ? 'Pembayaran Gagal Diproses'
                    : 'Waktu Pembayaran Telah Kedaluwarsa'}
                </p>
                <p className="text-muted leading-relaxed">
                  Dapur hanya mulai menyiapkan pesanan setelah pembayaran terverifikasi lunas.
                </p>
              </div>
            </div>

            {paymentError && (
              <p role="alert" className="text-xs font-semibold text-danger-ink">
                {paymentError}
              </p>
            )}

            <button
              type="button"
              onClick={handleRetryPaymentClick}
              className={buttonClass('gold', 'md', 'w-full justify-center')}
            >
              <RotateCcw className="w-4 h-4" />
              <span>{order.payment === 'PENDING' ? 'Lanjutkan Pembayaran' : 'Coba Bayar Ulang'}</span>
            </button>
          </div>
        )}

        {/* Banner Pesanan Dibatalkan */}
        {order.fulfillment === 'CANCELLED' && (
          <div className="p-5 bg-danger-soft border border-danger-line rounded-2xl space-y-2 text-danger-ink animate-fade-in">
            <div className="flex items-start gap-2.5">
              <XCircle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-bold text-sm text-danger-ink">Pesanan Dibatalkan oleh Penjaga</p>
                <p className="text-muted leading-relaxed">
                  Alasan: <strong>{order.cancelReason || 'Bahan baku habis atau warung tutup sementara.'}</strong>
                </p>
                {order.refund && order.refund.status !== 'NONE' && (
                  <p className="text-success-ink font-semibold pt-1">
                    Status Refund: {order.refund.status === 'FULL_REFUNDED' ? 'Lunas Ditransfer' : 'Menunggu Transfer'} ({formatRupiah(order.refund.amount)})
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Card Utama Bukti Pesanan */}
        <section className="bg-white p-6 sm:p-8 rounded-2xl border border-line shadow-card space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="text-2xs font-semibold uppercase tracking-wider text-muted">
                Bukti Pesanan Warmindo
              </span>
              <h1 className="text-xl sm:text-2xl font-bold font-mono text-ink mt-0.5 tracking-tight">
                {order.number}
              </h1>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <Badge variant={PAYMENT_BADGE[order.payment].variant} size="md">
                {PAYMENT_BADGE[order.payment].text}
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
                  {FULFILLMENT_LABEL[order.fulfillment]}
                </Badge>
              )}
            </div>
          </div>

          {/* Kotak Estimasi Jam Ambil */}
          <div className="p-4 sm:p-5 bg-surface-muted border border-line rounded-2xl space-y-1.5">
            <span className="text-xs font-semibold text-muted block">
              Waktu Pengambilan di Warung
            </span>
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-2xl sm:text-3xl font-extrabold text-ink">
                {formatTimeWIB(order.pickup)} WIB
              </span>
              <span className="text-xs text-subtle">
                ({formatDateTimeWIB(order.pickup)})
              </span>
            </div>
            <p className="text-2xs text-muted pt-0.5 leading-relaxed">
              Makanan disiapkan mendekati jam ini agar tetap hangat dan segar saat kamu tiba di warung.
            </p>
          </div>

          {/* Rincian Pemesan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-1 border-t border-line-soft">
            <div>
              <span className="text-subtle block mb-0.5">Nama Pemesan</span>
              <strong className="text-ink text-sm">{order.name}</strong>
            </div>
            <div>
              <span className="text-subtle block mb-0.5">Nomor WhatsApp</span>
              <strong className="text-ink text-sm tabular-nums">{formatPhone(order.phone)}</strong>
            </div>
          </div>

          {/* Rincian Menu yang Dipesan */}
          <div className="space-y-3 pt-3 border-t border-line-soft">
            <span className="text-2xs font-semibold uppercase tracking-wider text-muted">
              Rincian Menu yang Dipesan
            </span>

            <div className="divide-y divide-line-soft">
              {order.items.map((it, idx) => (
                <div key={idx} className="py-3 flex justify-between items-start text-xs">
                  <div>
                    <span className="font-bold text-ink">
                      {it.qty}x {it.name}
                    </span>
                    <div className="text-muted space-x-1.5 mt-0.5">
                      {it.temp && (
                        <span className="bg-surface-muted px-2 py-0.5 rounded-full text-2xs border border-line">
                          {it.temp}
                        </span>
                      )}
                      {it.egg && (
                        <span className="bg-surface-muted px-2 py-0.5 rounded-full text-2xs border border-line">
                          + Telur
                        </span>
                      )}
                      {it.note && <span>({it.note})</span>}
                    </div>
                  </div>
                  <span className="font-bold text-ink">
                    {formatRupiah(it.unit * it.qty)}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-line-soft flex justify-between items-center text-sm font-bold text-ink">
              <span>Total Tagihan</span>
              <span className="text-base sm:text-lg font-extrabold text-ink">
                {formatRupiah(order.total)}
              </span>
            </div>
          </div>

          {/* Tautan Privat dan Salin Link */}
          <div className="pt-4 border-t border-line-soft space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-ink">
                Simpan Tautan Pesanan
              </span>
              {copied && (
                <span className="text-2xs text-success-ink font-bold flex items-center gap-1 animate-fade-in">
                  <Check className="w-3.5 h-3.5" />
                  <span>Tautan disalin ke clipboard!</span>
                </span>
              )}
            </div>

            <div className="p-1.5 pl-4 bg-canvas border border-line rounded-full flex items-center justify-between gap-2">
              <span className="truncate font-mono text-xs text-muted px-1 select-all">
                {typeof window !== 'undefined' ? window.location.href : order.token}
              </span>
              <button
                type="button"
                onClick={handleCopyLink}
                className={buttonClass('outline', 'sm', 'shrink-0')}
              >
                <Copy className="w-3.5 h-3.5 text-icon" />
                <span>{copied ? 'Tersalin' : 'Salin'}</span>
              </button>
            </div>

            <p className="text-2xs text-subtle leading-relaxed">
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
        <div className="bg-canvas min-h-screen flex items-center justify-center p-6">
          <div className="w-8 h-8 border-3 border-gold border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <OrderTrackingContent />
    </Suspense>
  );
}
