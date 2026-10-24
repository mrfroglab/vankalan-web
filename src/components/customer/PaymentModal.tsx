'use client';

import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
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
        <div className="p-3.5 bg-neutral-100 border border-neutral-200 rounded-2xl flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-brand-green shrink-0 mt-0.5" />
          <div className="text-xs text-text-muted space-y-0.5">
            <p className="font-semibold text-ink">Kotak Pasir Demo (Sandbox)</p>
            <p>
              Pilih salah satu skenario untuk menguji respon sistem terhadap status pembayaran. Tidak ada transaksi perbankan nyata.
            </p>
          </div>
        </div>

        {/* Ringkasan Tagihan */}
        <div className="bg-white p-4 rounded-2xl border border-border-line space-y-2">
          <div className="flex justify-between items-center text-xs text-text-muted">
            <span>Nomor Pesanan</span>
            <span className="font-mono font-semibold text-ink">{orderNumber}</span>
          </div>
          <div className="flex justify-between items-center text-xs text-text-muted">
            <span>Nama Pemesan</span>
            <span className="font-medium text-ink">{customerName}</span>
          </div>
          <div className="pt-2 border-t border-border-line flex justify-between items-center">
            <span className="text-sm font-bold text-ink">Total Tagihan</span>
            <span className="text-base font-black text-brand-green">
              {formatRupiah(totalAmount)}
            </span>
          </div>
        </div>

        {/* Pilihan Hasil Simulasi */}
        <div className="space-y-2.5">
          <p className="text-xs font-bold uppercase tracking-wider text-text-muted">
            Pilih Hasil Pembayaran
          </p>

          <button
            type="button"
            onClick={() => onSelectOutcome('PAID')}
            className="w-full min-h-[48px] px-5 py-3 bg-brand-green text-white font-bold rounded-full text-sm flex items-center justify-between hover:bg-forest-green transition-colors cursor-pointer"
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
            className="w-full min-h-[48px] px-5 py-3 bg-white border border-danger-red/40 text-danger-red font-bold rounded-full text-sm flex items-center justify-between hover:bg-danger-red/5 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <XCircle className="w-5 h-5" />
              <span>Simulasikan Pembayaran Gagal</span>
            </div>
            <span className="text-xs bg-danger-red/10 px-2.5 py-0.5 rounded-full font-mono">
              FAILED
            </span>
          </button>

          <button
            type="button"
            onClick={() => onSelectOutcome('EXPIRED')}
            className="w-full min-h-[48px] px-5 py-3 bg-white border border-border-line text-ink font-semibold rounded-full text-sm flex items-center justify-between hover:bg-neutral-50 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <Clock className="w-5 h-5 text-text-muted" />
              <span>Simulasikan Kedaluwarsa (Expired)</span>
            </div>
            <span className="text-xs bg-neutral-100 text-text-muted px-2.5 py-0.5 rounded-full font-mono">
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
