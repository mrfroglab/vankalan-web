'use client';

import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button, buttonClass } from '@/components/ui/Button';
import { formatRupiah } from '@/lib/constants';
import { CheckCircle2, XCircle, Clock, ShieldCheck } from 'lucide-react';
import { OrderPaymentStatus } from '@/types';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderNumber: string;
  customerName: string;
  totalAmount: number;
  onSelectOutcome: (outcome: OrderPaymentStatus) => void;
}

export function PaymentModal({
  isOpen,
  onClose,
  orderNumber,
  customerName,
  totalAmount,
  onSelectOutcome,
}: PaymentModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Simulasi Pembayaran Midtrans Snap"
    >
      <div className="space-y-5 p-1">
        {/* Banner Simulasi Sandbox */}
        <div className="p-3.5 bg-cream border border-line rounded-2xl flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-ink shrink-0 mt-0.5" />
          <div className="text-xs text-muted space-y-0.5">
            <p className="font-semibold text-ink">Kotak Pasir Demo (Sandbox)</p>
            <p>
              Pilih salah satu skenario untuk menguji respon sistem terhadap status pembayaran. Tidak ada transaksi perbankan nyata.
            </p>
          </div>
        </div>

        {/* Ringkasan Tagihan */}
        <div className="bg-white p-4 rounded-2xl border border-line space-y-2">
          <div className="flex justify-between items-center text-xs text-muted">
            <span>Nomor Pesanan</span>
            <span className="font-mono font-semibold text-ink">{orderNumber}</span>
          </div>
          <div className="flex justify-between items-center text-xs text-muted">
            <span>Nama Pemesan</span>
            <span className="font-medium text-ink">{customerName}</span>
          </div>
          <div className="pt-2 border-t border-line flex justify-between items-center">
            <span className="text-sm font-bold text-ink">Total Tagihan</span>
            <span className="text-base font-black text-ink">
              {formatRupiah(totalAmount)}
            </span>
          </div>
        </div>

        {/* Pilihan Hasil Simulasi */}
        <div className="space-y-2.5">
          <p className="text-2xs font-semibold uppercase tracking-wider text-muted">
            Pilih Hasil Pembayaran
          </p>

          <button
            type="button"
            onClick={() => onSelectOutcome('PAID')}
            className={buttonClass('dark', 'lg', 'w-full justify-between')}
          >
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5" />
              <span>Simulasikan Berhasil (Lunas)</span>
            </div>
            <span className="text-xs bg-white/20 px-2.5 py-0.5 rounded-full font-mono">
              PAID
            </span>
          </button>

          <button
            type="button"
            onClick={() => onSelectOutcome('FAILED')}
            className={buttonClass('danger', 'lg', 'w-full justify-between')}
          >
            <div className="flex items-center gap-2.5">
              <XCircle className="w-5 h-5" />
              <span>Simulasikan Pembayaran Gagal</span>
            </div>
            <span className="text-xs bg-danger/10 px-2.5 py-0.5 rounded-full font-mono">
              FAILED
            </span>
          </button>

          <button
            type="button"
            onClick={() => onSelectOutcome('EXPIRED')}
            className={buttonClass('outline', 'lg', 'w-full justify-between')}
          >
            <div className="flex items-center gap-2.5">
              <Clock className="w-5 h-5 text-muted" />
              <span>Simulasikan Kedaluwarsa (Expired)</span>
            </div>
            <span className="text-xs bg-cream text-muted px-2.5 py-0.5 rounded-full font-mono">
              EXPIRED
            </span>
          </button>
        </div>

        <div className="text-center pt-1">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Batalkan Pembayaran
          </Button>
        </div>
      </div>
    </Modal>
  );
}
