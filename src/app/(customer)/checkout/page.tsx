'use client';

import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { inputClass, textareaClass } from '@/components/ui/styles';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { buttonClass } from '@/components/ui/Button';
import { formatRupiah, formatTimeWIB } from '@/lib/constants';
import { checkoutFormSchema } from '@/lib/validations/order';
import { Order, OrderPaymentStatus } from '@/types';
import { orderService } from '@/services/orders';
import { ApiError } from '@/services/client';
import { triggerSnapPayment } from '@/lib/midtrans';
import { FoodlyHeader } from '@/components/customer/FoodlyHeader';
import { FoodlyFooter } from '@/components/customer/FoodlyFooter';
import { CartDrawer } from '@/components/customer/CartDrawer';
import { PaymentModal } from '@/components/customer/PaymentModal';
import { ShoppingBag, ShieldCheck } from 'lucide-react';

export default function CheckoutPage() {
  const router = useRouter();
  const { items, totalAmount, clearCart, isStoreOpen, estimateMinutes, totalItems } = useCart();
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState<boolean>(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!isStoreOpen) {
      setFormError('Pemesanan online sedang ditutup sementara.');
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
      const result = await orderService.createOrder({
        name: name.trim(),
        phone: validationResult.data.phone,
        mode,
        pickup: pickupTimestamp,
        estimate: estimateMinutes,
        note: note.trim() || undefined,
        total: totalAmount,
        items: items.map((it) => ({
          name: it.menuItem.name,
          qty: it.qty,
          unit: it.unitPrice,
          egg: it.egg,
          temp: it.temp,
          note: it.note,
        })),
      });

      const order = result.order;

      // snapToken hanya ada bila server membuat transaksi Midtrans. Browser TIDAK menandai
      // lunas: status PAID datang dari webhook server; halaman order memantau perubahannya.
      if (result.snapToken) {
        const snapTriggered = await triggerSnapPayment(result.snapToken, {
          onSuccess: () => {
            clearCart();
            router.push(`/order/${order.token}`);
          },
          onPending: () => {
            clearCart();
            router.push(`/order/${order.token}`);
          },
          onError: () => {
            router.push(`/order/${order.token}`);
          },
          onClose: () => {
            router.push(`/order/${order.token}`);
          },
        });

        if (snapTriggered) {
          setIsSubmitting(false);
          return;
        }
      }

      // Fallback ke modal simulasi jika snapToken kosong atau Snap SDK tidak tersedia
      setPendingOrder(order);
      setIsPaymentModalOpen(true);
      setIsSubmitting(false);
    } catch (err) {
      console.error(err);
      setFormError(
        err instanceof ApiError && err.statusCode >= 400
          ? err.message
          : 'Terjadi gangguan saat memproses pesanan. Silakan coba lagi.'
      );
      setIsSubmitting(false);
    }
  };

  const handlePaymentOutcome = async (outcome: OrderPaymentStatus) => {
    if (!pendingOrder) return;

    try {
      await orderService.updateOrderPayment(pendingOrder.id, outcome);
    } catch (err) {
      console.warn('Gagal update payment outcome di service:', err);
    }

    setIsPaymentModalOpen(false);

    if (outcome === 'PAID') {
      clearCart();
    }

    router.push(`/order/${pendingOrder.token}`);
  };

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
        <Breadcrumb items={[{ label: 'Beranda', href: '/' }, { label: 'Checkout' }]} />

        {items.length === 0 && !isPaymentModalOpen ? (
          <EmptyState
            icon={ShoppingBag}
            title="Keranjang masih kosong"
            description="Belum ada menu yang dipilih. Pilih menu favoritmu dulu, lalu kembali ke sini."
            action={
              <Link href="/" className={buttonClass('gold', 'md')}>
                Kembali ke Menu
              </Link>
            }
          />
        ) : (
          <>
            <PageHeader
              title="Checkout Pesanan"
              description="Lengkapi identitas pemesan dan tentukan waktu ambil di warung."
            />

            {formError && (
              <div
                className="p-4 bg-danger-soft border border-danger-line rounded-2xl text-danger-ink text-xs font-semibold animate-fade-in"
                role="alert"
              >
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Seksi 1: Data Pemesan */}
              <section className="bg-white p-5 sm:p-6 rounded-2xl border border-line space-y-4 shadow-card">
                <h2 className="text-2xs font-semibold uppercase tracking-wider text-muted">
                  1. Identitas Pemesan
                </h2>

                <div className="space-y-1.5">
                  <label htmlFor="customer-name" className="text-xs font-semibold text-ink">
                    Nama Lengkap / Panggilan <span className="text-danger">*</span>
                  </label>
                  <input
                    id="customer-name"
                    type="text"
                    required
                    maxLength={60}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Contoh: Budi Santoso"
                    className={inputClass}
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="customer-phone" className="text-xs font-semibold text-ink">
                    Nomor WhatsApp Aktif <span className="text-danger">*</span>
                  </label>
                  <input
                    id="customer-phone"
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Contoh: 081234567890"
                    className={inputClass}
                  />
                  <p className="text-2xs text-subtle">
                    Penjaga warung akan mengirim konfirmasi dan notifikasi pesanan siap via WhatsApp.
                  </p>
                </div>
              </section>

              {/* Seksi 2: Waktu Pengambilan */}
              <section className="bg-white p-5 sm:p-6 rounded-2xl border border-line space-y-4 shadow-card">
                <h2 className="text-2xs font-semibold uppercase tracking-wider text-muted">
                  2. Waktu Pengambilan (Pickup)
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label
                    className={`flex flex-col p-4 border rounded-2xl cursor-pointer transition-all ${
                      mode === 'asap'
                        ? 'border-gold bg-gold-tint shadow-xs'
                        : 'border-line bg-surface-muted hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="radio"
                        name="mode"
                        value="asap"
                        checked={mode === 'asap'}
                        onChange={() => setMode('asap')}
                        className="accent-gold w-4 h-4"
                      />
                      <span className="font-bold text-sm text-ink">Secepatnya</span>
                    </div>
                    <span className="text-xs text-muted mt-1.5 pl-6 leading-relaxed">
                      Estimasi siap dalam ±{estimateMinutes} menit setelah lunas.
                    </span>
                  </label>

                  <label
                    className={`flex flex-col p-4 border rounded-2xl cursor-pointer transition-all ${
                      mode === 'scheduled'
                        ? 'border-gold bg-gold-tint shadow-xs'
                        : 'border-line bg-surface-muted hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="radio"
                        name="mode"
                        value="scheduled"
                        checked={mode === 'scheduled'}
                        onChange={() => setMode('scheduled')}
                        className="accent-gold w-4 h-4"
                      />
                      <span className="font-bold text-sm text-ink">Pilih Jam</span>
                    </div>
                    <span className="text-xs text-muted mt-1.5 pl-6 leading-relaxed">
                      Tentukan jam ambil khusus (maksimal 1 jam ke depan).
                    </span>
                  </label>
                </div>

                {mode === 'scheduled' && (
                  <div className="space-y-1.5 pt-2 animate-fade-in">
                    <label
                      htmlFor="scheduled-time"
                      className="text-xs font-semibold text-ink"
                    >
                      Pilih Jam Ambil (WIB) <span className="text-danger">*</span>
                    </label>
                    <select
                      id="scheduled-time"
                      value={selectedPickupTime}
                      onChange={(e) => setSelectedPickupTime(e.target.value)}
                      className={inputClass}
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
                    Catatan Khusus untuk Warung (Opsional)
                  </label>
                  <textarea
                    id="order-note"
                    rows={2}
                    maxLength={200}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Contoh: sambal dipisah ya mas, kuah jangan terlalu asin"
                    className={`${textareaClass} resize-none`}
                  />
                </div>
              </section>

              {/* Seksi 3: Ringkasan Pesanan */}
              <section className="bg-white p-5 sm:p-6 rounded-2xl border border-line space-y-4 shadow-card">
                <h2 className="text-2xs font-semibold uppercase tracking-wider text-muted">
                  3. Ringkasan Pesanan
                </h2>

                <div className="divide-y divide-line-soft">
                  {items.map((it) => (
                    <div key={it.id} className="py-3 flex justify-between items-start text-xs">
                      <div>
                        <span className="font-bold text-ink">
                          {it.qty}x {it.menuItem.name}
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
                        {formatRupiah(it.unitPrice * it.qty)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="pt-3 border-t border-line-soft flex justify-between items-center text-sm font-bold text-ink">
                  <span>Total Tagihan</span>
                  <span className="text-base sm:text-lg font-extrabold text-ink">
                    {formatRupiah(totalAmount)}
                  </span>
                </div>

                <div className="p-3.5 bg-surface-muted border border-line rounded-2xl flex items-center gap-2.5 text-xs text-muted">
                  <ShieldCheck className="w-4 h-4 text-ink shrink-0" />
                  <span>Biaya gateway ditanggung warung. Tidak ada tambahan biaya admin.</span>
                </div>
              </section>

              {/* Tombol Lanjut ke Pembayaran */}
              <button
                type="submit"
                disabled={isSubmitting || !isStoreOpen}
                className={buttonClass('gold', 'lg', 'w-full justify-center')}
              >
                {isSubmitting ? (
                  <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                ) : null}
                <span>Lanjut ke Pembayaran ({formatRupiah(totalAmount)})</span>
              </button>
            </form>
          </>
        )}

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
      </main>

      <FoodlyFooter />

      <CartDrawer
        isOpen={isCartDrawerOpen}
        onClose={() => setIsCartDrawerOpen(false)}
      />
    </div>
  );
}
