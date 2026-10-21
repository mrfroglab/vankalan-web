'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { Button } from '@/components/ui/Button';
import { formatRupiah, formatTimeWIB } from '@/lib/constants';
import { checkoutFormSchema } from '@/lib/validations/order';
import { ArrowLeft, ShoppingBag, ShieldCheck } from 'lucide-react';
import { Order } from '@/types';

export default function CheckoutPage() {
  const router = useRouter();
  const { items, totalAmount, clearCart, isStoreOpen, estimateMinutes } = useCart();

  const [name, setName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [mode, setMode] = useState<'asap' | 'scheduled'>('asap');
  const [selectedPickupTime, setSelectedPickupTime] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const [scheduledTimeOptions, setScheduledTimeOptions] = useState<
    { label: string; timestamp: number }[]
  >([]);

  useEffect(() => {
    const options: { label: string; timestamp: number }[] = [];
    const now = Date.now();
    const minTime = now + estimateMinutes * 60 * 1000;
    const maxTime = now + 60 * 60 * 1000; // maksimal 1 jam ke depan sesuai PRD

    let current = Math.ceil(minTime / (5 * 60 * 1000)) * (5 * 60 * 1000);
    while (current <= maxTime) {
      options.push({
        label: formatTimeWIB(current) + ' WIB',
        timestamp: current,
      });
      current += 10 * 60 * 1000;
    }
    setScheduledTimeOptions(options);
  }, [estimateMinutes]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!isStoreOpen) {
      setFormError('Pemesanan online sedang ditutup.');
      return;
    }

    if (items.length === 0) {
      setFormError('Keranjang belanja masih kosong.');
      return;
    }

    let pickupTimestamp = Date.now() + estimateMinutes * 60 * 1000;
    if (mode === 'scheduled') {
      const foundOption = scheduledTimeOptions.find((opt) => opt.label === selectedPickupTime);
      if (!foundOption) {
        setFormError('Silakan tentukan jam pengambilan terjadwal.');
        return;
      }
      pickupTimestamp = foundOption.timestamp;
    }

    // Validasi Zod
    const validationResult = checkoutFormSchema.safeParse({
      name,
      phone,
      mode,
      note: note || undefined,
      pickupTimestamp,
    });

    if (!validationResult.success) {
      const firstIssue = validationResult.error.issues[0];
      setFormError(firstIssue.message);
      return;
    }

    setIsSubmitting(true);

    try {
      const now = Date.now();
      const randomToken = 'pv_' + Math.random().toString(36).slice(2, 10);
      const orderDateStr = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Jakarta',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
        .format(new Date(now))
        .replace(/-/g, '');
      const orderNumber = `PV-${orderDateStr}-${Math.floor(1000 + Math.random() * 9000)}`;

      const newOrder: Order = {
        id: 'ord_' + now,
        token: randomToken,
        number: orderNumber,
        created: now,
        pickup: pickupTimestamp,
        estimate: estimateMinutes,
        mode,
        name: name.trim(),
        phone: validationResult.data.phone,
        note: note.trim() || undefined,
        payment: 'PAID', // Simulasi MVP lunas
        fulfillment: 'NEW',
        notification: 'SENT',
        recipientShiftId: 's1',
        total: totalAmount,
        paidAt: now,
        items: items.map((it) => ({
          name: it.menuItem.name,
          qty: it.qty,
          unit: it.unitPrice,
          egg: it.egg,
          temp: it.temp,
          note: it.note,
        })),
      };

      // Simpan riwayat order di localStorage
      const existingOrdersStr = localStorage.getItem('pv_orders_v2');
      const existingOrders: Order[] = existingOrdersStr ? JSON.parse(existingOrdersStr) : [];
      localStorage.setItem('pv_orders_v2', JSON.stringify([newOrder, ...existingOrders]));

      clearCart();
      router.push(`/order/${randomToken}`);
    } catch (err) {
      console.error(err);
      setFormError('Terjadi gangguan saat memproses pesanan. Silakan coba lagi.');
      setIsSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-6 sm:p-8 rounded-2xl border border-border-line text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-soft-green flex items-center justify-center mx-auto text-brand-green">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold text-ink">Keranjangmu Kosong</h1>
          <p className="text-sm text-text-muted">
            Belum ada menu yang dipilih untuk checkout.
          </p>
          <Link href="/" className="block">
            <Button variant="primary" fullWidth size="lg">
              Kembali ke Menu
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper py-6 sm:py-10 px-4 sm:px-6">
      <div className="max-w-xl mx-auto space-y-6">
        {/* Tombol Kembali */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-text-muted hover:text-ink transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Menu</span>
        </Link>

        <div>
          <h1 className="text-2xl font-black text-ink tracking-tight">
            Checkout Pesanan
          </h1>
          <p className="text-xs sm:text-sm text-text-muted mt-0.5">
            Pastikan data kontak dan estimasi jam ambil sudah benar.
          </p>
        </div>

        {formError ? (
          <div
            role="alert"
            className="p-4 rounded-xl bg-danger-red/10 border border-danger-red/20 text-danger-red text-sm font-medium"
          >
            {formError}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Card 1: Data Pemesan */}
          <section className="bg-white p-5 rounded-2xl border border-border-line space-y-4">
            <h2 className="text-base font-bold text-ink border-b border-border-line pb-3">
              1. Identitas Pemesan
            </h2>

            <div>
              <label
                htmlFor="customer-name"
                className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5"
              >
                Nama Lengkap / Panggilan *
              </label>
              <input
                id="customer-name"
                type="text"
                required
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Bang Jan / Mas Arya"
                className="w-full min-h-[48px] px-3.5 text-sm bg-white border border-border-line rounded-xl focus:outline-none focus:border-brand-green"
              />
            </div>

            <div>
              <label
                htmlFor="customer-phone"
                className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5"
              >
                Nomor WhatsApp Aktif *
              </label>
              <input
                id="customer-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="081234567890"
                className="w-full min-h-[48px] px-3.5 text-sm bg-white border border-border-line rounded-xl focus:outline-none focus:border-brand-green"
              />
              <span className="text-[11px] text-text-muted mt-1 block">
                Penjaga akan menghubungi nomor ini jika ada konfirmasi menu atau saat pesanan siap.
              </span>
            </div>
          </section>

          {/* Card 2: Waktu Pengambilan */}
          <section className="bg-white p-5 rounded-2xl border border-border-line space-y-4">
            <h2 className="text-base font-bold text-ink border-b border-border-line pb-3">
              2. Waktu Pengambilan (Ambil Sendiri)
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                className={`min-h-[56px] p-3.5 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
                  mode === 'asap'
                    ? 'border-brand-green bg-soft-green text-brand-green font-bold'
                    : 'border-border-line bg-white text-ink'
                }`}
              >
                <input
                  type="radio"
                  name="pickup-mode"
                  checked={mode === 'asap'}
                  onChange={() => setMode('asap')}
                  className="w-4 h-4 accent-brand-green"
                />
                <div>
                  <span className="text-sm block">Secepatnya</span>
                  <span className="text-xs opacity-75 font-normal">
                    Estimasi siap ~{estimateMinutes} menit
                  </span>
                </div>
              </label>

              <label
                className={`min-h-[56px] p-3.5 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
                  mode === 'scheduled'
                    ? 'border-brand-green bg-soft-green text-brand-green font-bold'
                    : 'border-border-line bg-white text-ink'
                }`}
              >
                <input
                  type="radio"
                  name="pickup-mode"
                  checked={mode === 'scheduled'}
                  onChange={() => setMode('scheduled')}
                  className="w-4 h-4 accent-brand-green"
                />
                <div>
                  <span className="text-sm block">Jadwalkan Jam</span>
                  <span className="text-xs opacity-75 font-normal">
                    Maksimal 1 jam ke depan
                  </span>
                </div>
              </label>
            </div>

            {mode === 'scheduled' ? (
              <div className="pt-2">
                <label
                  htmlFor="pickup-time-select"
                  className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5"
                >
                  Pilih Jam Ambil (WIB)
                </label>
                <select
                  id="pickup-time-select"
                  value={selectedPickupTime}
                  onChange={(e) => setSelectedPickupTime(e.target.value)}
                  className="w-full min-h-[48px] px-3.5 text-sm bg-white border border-border-line rounded-xl focus:outline-none focus:border-brand-green cursor-pointer"
                >
                  <option value="">Pilih perkiraan jam datang...</option>
                  {scheduledTimeOptions.map((opt) => (
                    <option key={opt.label} value={opt.label}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </section>

          {/* Card 3: Catatan Khusus */}
          <section className="bg-white p-5 rounded-2xl border border-border-line space-y-3">
            <h2 className="text-base font-bold text-ink">
              3. Catatan Pesanan Tambahan (Opsional)
            </h2>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Contoh: jangan pakai saus tomat, tolong pisahkan sendok..."
              rows={2}
              maxLength={200}
              className="w-full p-3 text-sm bg-white border border-border-line rounded-xl focus:outline-none focus:border-brand-green resize-none"
            />
          </section>

          {/* Card 4: Ringkasan Rincian Menu */}
          <section className="bg-white p-5 rounded-2xl border border-border-line space-y-3">
            <h2 className="text-base font-bold text-ink border-b border-border-line pb-3">
              Ringkasan Item
            </h2>

            <div className="divide-y divide-border-line text-sm">
              {items.map((item) => (
                <div key={item.id} className="py-2.5 flex justify-between gap-3">
                  <div>
                    <span className="font-semibold text-ink">
                      {item.qty}x {item.menuItem.name}
                    </span>
                    <div className="text-xs text-text-muted">
                      {item.egg ? '+ Telur, ' : ''}
                      {item.temp ? `${item.temp}, ` : ''}
                      {item.note ? `"${item.note}"` : ''}
                    </div>
                  </div>
                  <span className="font-bold text-ink">
                    {formatRupiah(item.unitPrice * item.qty)}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-border-line flex justify-between items-center text-base font-extrabold text-ink">
              <span>Total Tagihan</span>
              <span className="text-brand-orange text-lg">
                {formatRupiah(totalAmount)}
              </span>
            </div>
          </section>

          {/* Tombol Submit Pembayaran */}
          <div className="space-y-3">
            <Button
              type="submit"
              variant="orange"
              size="lg"
              fullWidth
              isLoading={isSubmitting}
            >
              Bayar Sekarang ({formatRupiah(totalAmount)})
            </Button>

            <div className="flex items-center justify-center gap-1.5 text-xs text-text-muted">
              <ShieldCheck className="w-4 h-4 text-brand-green" />
              <span>Pembayaran terverifikasi otomatis. Tanpa biaya admin tambahan.</span>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
