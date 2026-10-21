import React from 'react';
import { Badge } from '@/components/ui/Badge';
import { Clock, MapPin } from 'lucide-react';

interface StoreHeaderProps {
  isOpen: boolean;
  estimateMinutes: number;
}

export function StoreHeader({ isOpen, estimateMinutes }: StoreHeaderProps) {
  return (
    <header className="space-y-4">
      {/* Baris Status Utama */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-border-line">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-ink tracking-tight">
              Warmindo Putra Vangkalan
            </h1>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-text-muted mt-1">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span>Pesan dulu secara online, tinggal ambil saat matang</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {isOpen ? (
            <Badge variant="success" dot>
              Buka Sekarang
            </Badge>
          ) : (
            <Badge variant="danger" dot>
              Tutup Sementara
            </Badge>
          )}

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-soft-green text-xs font-semibold text-brand-green border border-border-line">
            <Clock className="w-3.5 h-3.5" />
            <span>Siap ~{estimateMinutes} menit</span>
          </div>
        </div>
      </div>

      {/* Banner Peringatan Bila Toko Tutup */}
      {!isOpen ? (
        <div
          role="alert"
          className="p-4 rounded-2xl bg-[#fff2de] border border-[#f4d5a7] text-[#7a4b08] text-sm flex items-start gap-3"
        >
          <div className="font-bold text-base shrink-0">⚠️</div>
          <div>
            <strong className="block font-bold">
              Pemesanan online sedang dinonaktifkan
            </strong>
            <p className="mt-0.5 text-xs sm:text-sm">
              Dapur sedang dalam pembersihan atau pergantian sif. Kamu tetap bisa
              melihat menu dan menyimpan keranjang untuk pemesanan berikutnya.
            </p>
          </div>
        </div>
      ) : null}
    </header>
  );
}
