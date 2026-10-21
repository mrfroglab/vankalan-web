'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Order } from '@/types';
import { formatRupiah, formatDateTimeWIB, formatTimeWIB } from '@/lib/constants';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  Copy,
  MessageCircle,
  ArrowLeft,
  AlertCircle,
} from 'lucide-react';

function OrderTrackingContent() {
  const params = useParams();
  const token = params.token as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    try {
      const ordersStr = localStorage.getItem('pv_orders_v2');
      if (ordersStr) {
        const orders: Order[] = JSON.parse(ordersStr);
        const found = orders.find((o) => o.token === token);
        if (found) {
          setOrder(found);
        }
      }
    } catch (e) {
      console.warn('Gagal memuat order', e);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
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
            Tautan pesanan ini tidak valid atau sudah kedaluwarsa dari penyimpanan browser.
          </p>
          <Link href="/">
            <Button variant="primary" fullWidth>
              Kembali ke Menu
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const fulfillmentLabels: Record<Order['fulfillment'], string> = {
    NEW: 'Pesanan Diterima Dapur',
    PREPARING: 'Sedang Dimasak',
    READY: 'Siap Diambil di Warung',
    COMPLETED: 'Selesai Diambil',
    CANCELLED: 'Dibatalkan',
  };

  // Teks chat WhatsApp ke penjaga
  const waContactUrl = `https://wa.me/6281234500001?text=${encodeURIComponent(
    `Halo Aa Iis, saya ingin tanya status pesanan ${order.number} atas nama ${order.name}.`
  )}`;

  return (
    <div className="min-h-screen bg-paper py-6 sm:py-10 px-4 sm:px-6">
      <div className="max-w-xl mx-auto space-y-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-text-muted hover:text-ink transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Halaman Menu</span>
        </Link>

        {/* Hero Card Status */}
        <div className="bg-brand-green text-white p-6 rounded-3xl space-y-4 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-white/70 font-semibold">
              Nomor Pesanan
            </span>
            <Badge variant="success" className="bg-white/20 text-white border-white/20">
              Lunas
            </Badge>
          </div>

          <div>
            <span className="text-xl sm:text-2xl font-black block tracking-tight">
              {order.number}
            </span>
            <span className="text-xs text-white/80 mt-1 block">
              Dipesan pada {formatDateTimeWIB(order.created)}
            </span>
          </div>

          <div className="pt-4 border-t border-white/15 flex items-center justify-between">
            <div>
              <span className="text-xs text-white/70 block">Target Waktu Ambil</span>
              <strong className="text-lg font-extrabold text-white">
                {formatTimeWIB(order.pickup)} WIB
              </strong>
            </div>

            <div className="text-right">
              <span className="text-xs text-white/70 block">Status Dapur</span>
              <span className="text-sm font-bold text-[#fef1dc]">
                {fulfillmentLabels[order.fulfillment]}
              </span>
            </div>
          </div>
        </div>

        {/* Bagian Tombol Aksi Penting: Tautan Privat & Chat */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Button
            variant="secondary"
            onClick={handleCopyLink}
            className="w-full text-xs"
          >
            <Copy className="w-4 h-4" />
            <span>{copied ? 'Tautan Tersalin!' : 'Salin Tautan Pesanan'}</span>
          </Button>

          <a
            href={waContactUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full"
          >
            <Button variant="primary" className="w-full text-xs">
              <MessageCircle className="w-4 h-4" />
              <span>Hubungi Penjaga Sif</span>
            </Button>
          </a>
        </div>

        {/* Rincian Pesanan */}
        <div className="bg-white p-5 rounded-2xl border border-border-line space-y-4">
          <h2 className="text-base font-bold text-ink border-b border-border-line pb-3">
            Rincian Menu ({order.items.length} item)
          </h2>

          <div className="divide-y divide-border-line text-sm">
            {order.items.map((item, idx) => (
              <div key={idx} className="py-2.5 flex justify-between gap-3">
                <div>
                  <span className="font-semibold text-ink">
                    {item.qty}x {item.name}
                  </span>
                  <div className="text-xs text-text-muted mt-0.5">
                    {item.egg ? '+ Telur, ' : ''}
                    {item.temp ? `${item.temp}, ` : ''}
                    {item.note ? `"${item.note}"` : ''}
                  </div>
                </div>
                <span className="font-bold text-ink">
                  {formatRupiah(item.unit * item.qty)}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-border-line flex justify-between items-center">
            <span className="text-sm text-text-muted">Total Pembayaran</span>
            <strong className="text-base font-extrabold text-brand-orange">
              {formatRupiah(order.total)}
            </strong>
          </div>
        </div>

        {/* Info Pemesan */}
        <div className="bg-white p-5 rounded-2xl border border-border-line space-y-2 text-xs sm:text-sm">
          <h3 className="font-bold text-ink mb-2">Informasi Pengambilan</h3>
          <p className="text-text-muted">
            Nama Pemesan: <strong className="text-ink">{order.name}</strong>
          </p>
          <p className="text-text-muted">
            WhatsApp: <strong className="text-ink">{order.phone}</strong>
          </p>
          {order.note ? (
            <p className="text-text-muted">
              Catatan: <strong className="text-ink">{order.note}</strong>
            </p>
          ) : null}
          <div className="mt-3 p-3 bg-soft-green rounded-xl text-brand-green text-xs leading-relaxed">
            Tunjukkan nomor pesanan <strong>{order.number}</strong> kepada penjaga saat mengambil makanan di warung.
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OrderTrackingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-paper flex items-center justify-center p-4">
          <div className="w-8 h-8 border-3 border-brand-green border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      }
    >
      <OrderTrackingContent />
    </Suspense>
  );
}
