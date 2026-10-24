'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { Button } from '@/components/ui/Button';
import { formatRupiah, formatTimeWIB } from '@/lib/constants';
import { checkoutFormSchema } from '@/lib/validations/order';
import { ArrowLeft, ShoppingBag, ShieldCheck } from 'lucide-react';
import { Order, OrderPaymentStatus } from '@/types';
import { getStoreSettings, getOrders, saveOrders } from '@/lib/store';
import { PaymentModal } from '@/components/customer/PaymentModal';

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

  // State untuk modal pembayaran simulasi
  const [pendingOrder, setPendingOrder] = useState<Order | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);

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
      const settings = getStoreSettings();
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
        payment: 'PENDING',
        fulfillment: 'NEW',
        notification: 'QUEUED',
        recipientShiftId: settings.recipientShiftId || 's1',
        total: totalAmount,
        items: items.map((it) => ({
          name: it.menuItem.name,
          qty: it.qty,
          unit: it.unitPrice,
          egg: it.egg,
          temp: it.temp,
          note: it.note,
        })),
      };

      const existingOrders = getOrders();
      saveOrders([newOrder, ...existingOrders]);

      setPendingOrder(newOrder);
      setIsPaymentModalOpen(true);
      setIsSubmitting(false);
    } catch (err) {
      console.error(err);
      setFormError('Terjadi gangguan saat memproses pesanan. Silakan coba lagi.');
      setIsSubmitting(false);
    }
  };

  const handlePaymentOutcome = (outcome: OrderPaymentStatus) => {
    if (!pendingOrder) return;

    const settings = getStoreSettings();
    const orders = getOrders();
    const now = Date.now();

    const updatedOrders = orders.map((o) => {
      if (o.id === pendingOrder.id) {
        if (outcome === 'PAID') {
          return {
            ...o,
            payment: 'PAID' as const,
            paidAt: now,
            pickup: o.mode === 'asap' ? now + o.estimate * 60 * 1000 : o.pickup,
            notification: (settings.waConnected ? 'SENT' : 'FAILED') as Order['notification'],
            attempts: 1,
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

    if (outcome === 'PAID') {
      clearCart();
    }

    router.push(`/order/${pendingOrder.token}`);
  };

  if (items.length === 0 && !isPaymentModalOpen) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-6 sm:p-8 rounded-2xl border border-border-line text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-soft-green flex items-center justify-center mx-auto text-brand-green">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold text-ink">Keranjang Belanja Kosong</h1>
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
        {/* Tombol Navigasi Kembali */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-text-muted hover:text-ink transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Menu</span>
        </Link>

        {/* Header Checkout */}
        <div>
          <h1 className="text-2xl font-black text-ink">Checkout Pesanan</h1>
          <p className="text-xs text-text-muted mt-1">
            Lengkapi data pemesan dan pilih waktu pengambilan di warung.
          </p>
        </div>

        {formError && (
          <div
            className="p-4 bg-danger-red/10 border border-danger-red/20 rounded-xl text-danger-red text-xs font-semibold"
            role="alert"
          >
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Card Data Pemesan */}
          <section className="bg-white p-5 rounded-2xl border border-border-line space-y-4 shadow-xs">
            <h2 className="text-sm font-bold text-ink uppercase tracking-wider">
              1. Identitas Pemesan
            </h2>

            <div className="space-y-1.5">
              <label htmlFor="customer-name" className="text-xs font-semibold text-ink">
                Nama Lengkap / Panggilan <span className="text-danger-red">*</span>
              </label>
              <input
                id="customer-name"
                type="text"
                required
                maxLength={60}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Budi Santoso"
                className="w-full min-h-[48px] px-3.5 text-sm bg-paper border border-border-line rounded-xl focus:outline-none focus:border-brand-green"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="customer-phone" className="text-xs font-semibold text-ink">
                Nomor WhatsApp Aktif <span className="text-danger-red">*</span>
              </label>
              <input
                id="customer-phone"
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Contoh: 081234567890"
                className="w-full min-h-[48px] px-3.5 text-sm bg-paper border border-border-line rounded-xl focus:outline-none focus:border-brand-green"
              />
              <p className="text-[11px] text-text-muted">
                Penjaga warung akan menghubungi via WhatsApp ketika pesanan siap diambil.
              </p>
            </div>
          </section>

          {/* Card Waktu Pengambilan */}
          <section className="bg-white p-5 rounded-2xl border border-border-line space-y-4 shadow-xs">
            <h2 className="text-sm font-bold text-ink uppercase tracking-wider">
              2. Waktu Pengambilan (Pickup)
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                className={`flex flex-col p-3.5 border rounded-xl cursor-pointer transition-colors ${
                  mode === 'asap'
                    ? 'border-brand-green bg-soft-green/30'
                    : 'border-border-line bg-paper'
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="mode"
                    value="asap"
                    checked={mode === 'asap'}
                    onChange={() => setMode('asap')}
                    className="accent-brand-green"
                  />
                  <span className="font-bold text-sm text-ink">Secepatnya</span>
                </div>
                <span className="text-xs text-text-muted mt-1.5 pl-5">
                  Estimasi siap dalam ±{estimateMinutes} menit setelah lunas.
                </span>
              </label>

              <label
                className={`flex flex-col p-3.5 border rounded-xl cursor-pointer transition-colors ${
                  mode === 'scheduled'
                    ? 'border-brand-green bg-soft-green/30'
                    : 'border-border-line bg-paper'
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="mode"
                    value="scheduled"
                    checked={mode === 'scheduled'}
                    onChange={() => setMode('scheduled')}
                    className="accent-brand-green"
                  />
                  <span className="font-bold text-sm text-ink">Pilih Jam</span>
                </div>
                <span className="text-xs text-text-muted mt-1.5 pl-5">
                  Tentukan jam ambil (maksimal 1 jam ke depan).
                </span>
              </label>
            </div>

            {mode === 'scheduled' && (
              <div className="space-y-1.5 pt-2">
                <label
                  htmlFor="scheduled-time"
                  className="text-xs font-semibold text-ink"
                >
                  Pilih Jam Ambil (WIB) <span className="text-danger-red">*</span>
                </label>
                <select
                  id="scheduled-time"
                  value={selectedPickupTime}
                  onChange={(e) => setSelectedPickupTime(e.target.value)}
                  className="w-full min-h-[48px] px-3.5 text-sm bg-paper border border-border-line rounded-xl focus:outline-none focus:border-brand-green"
                >
                  <option value="">Pilih jam pengambilan...</option>
                  {scheduledTimeOptions.map((opt) => (
                    <option key={opt.label} value={opt.label}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-1.5 pt-2">
              <label htmlFor="order-note" className="text-xs font-semibold text-ink">
                Catatan Tambahan untuk Warung (Opsional)
              </label>
              <textarea
                id="order-note"
                rows={2}
                maxLength={200}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Contoh: sambal dipisah ya mas"
                className="w-full p-3 text-sm bg-paper border border-border-line rounded-xl focus:outline-none focus:border-brand-green"
              />
            </div>
          </section>

          {/* Ringkasan Belanja */}
          <section className="bg-white p-5 rounded-2xl border border-border-line space-y-3 shadow-xs">
            <h2 className="text-sm font-bold text-ink uppercase tracking-wider">
              3. Ringkasan Pesanan
            </h2>

            <div className="divide-y divide-border-line">
              {items.map((it) => (
                <div key={it.id} className="py-2.5 flex justify-between items-start text-xs">
                  <div>
                    <span className="font-bold text-ink">
                      {it.qty}x {it.menuItem.name}
                    </span>
                    <div className="text-text-muted space-x-1 mt-0.5">
                      {it.temp && <span>[{it.temp}]</span>}
                      {it.egg && <span>[+Telur]</span>}
                      {it.note && <span>({it.note})</span>}
                    </div>
                  </div>
                  <span className="font-semibold text-ink">
                    {formatRupiah(it.unitPrice * it.qty)}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-border-line flex justify-between items-center text-sm font-black text-ink">
              <span>Total Pembayaran</span>
              <span className="text-brand-green text-base">
                {formatRupiah(totalAmount)}
              </span>
            </div>

            <div className="p-3 bg-neutral-100 rounded-xl flex items-center gap-2 text-xs text-text-muted">
              <ShieldCheck className="w-4 h-4 text-brand-green shrink-0" />
              <span>Biaya gateway ditanggung warung. Tidak ada biaya admin tambahan.</span>
            </div>
          </section>

          <Button
            type="submit"
            variant="primary"
            fullWidth
            size="lg"
            isLoading={isSubmitting}
            disabled={isSubmitting || !isStoreOpen}
          >
            Lanjut ke Pembayaran ({formatRupiah(totalAmount)})
          </Button>
        </form>

        {/* Modal Simulasi Pembayaran Midtrans Snap */}
        {pendingOrder && (
          <PaymentModal
            isOpen={isPaymentModalOpen}
            onClose={() => {
              setIsPaymentModalOpen(false);
              router.push(`/order/${pendingOrder.token}`);
            }}
            orderNumber={pendingOrder.number}
            customerName={pendingOrder.name}
            totalAmount={pendingOrder.total}
            onSelectOutcome={handlePaymentOutcome}
          />
        )}
      </div>
    </div>
  );
}
