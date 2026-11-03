'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { Button } from '@/components/ui/Button';
import { formatRupiah, formatTimeWIB } from '@/lib/constants';
import { checkoutFormSchema } from '@/lib/validations/order';
import { Order, OrderPaymentStatus } from '@/types';
import { orderService } from '@/services/orders';
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

      // Jika snapToken tersedia, jalankan Midtrans Snap SDK
      if (result.snapToken) {
        const snapTriggered = await triggerSnapPayment(result.snapToken, {
          onSuccess: async () => {
            await orderService.updateOrderPayment(order.id, 'PAID');
            clearCart();
            router.push(`/order/${order.token}`);
          },
          onPending: async () => {
            await orderService.updateOrderPayment(order.id, 'PENDING');
            router.push(`/order/${order.token}`);
          },
          onError: async () => {
            await orderService.updateOrderPayment(order.id, 'FAILED');
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
      setFormError('Terjadi gangguan saat memproses pesanan. Silakan coba lagi.');
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
          <span className="text-[#242321] font-semibold">Checkout Pesanan</span>
        </nav>

        {items.length === 0 && !isPaymentModalOpen ? (
          <div className="bg-white p-8 sm:p-12 rounded-2xl border border-[#e9e5df] text-center space-y-4 shadow-card my-6">
            <div className="w-16 h-16 rounded-full bg-[#fbf9f5] border border-[#e9e5df] flex items-center justify-center mx-auto text-[#77736d]">
              <ShoppingBag className="w-8 h-8" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold font-editorial text-[#242321]">
              Keranjang Belanja Kosong
            </h1>
            <p className="text-xs sm:text-sm text-[#68645e] max-w-sm mx-auto leading-relaxed">
              Belum ada sajian yang dipilih untuk checkout. Silakan pilih menu warmindo favoritmu terlebih dahulu.
            </p>
            <div className="pt-2 max-w-xs mx-auto">
              <Link href="/">
                <Button variant="gold" fullWidth size="lg" className="rounded-full font-bold">
                  Kembali ke Menu
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Tajuk Halaman Checkout */}
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold font-editorial text-[#242321]">
                Checkout Pesanan
              </h1>
              <p className="text-xs sm:text-sm text-[#68645e] mt-1">
                Lengkapi identitas pemesan dan tentukan estimasi waktu ambil di warung.
              </p>
            </div>

            {formError && (
              <div
                className="p-4 bg-[#fde7e4] border border-[#f7c5be] rounded-2xl text-[#91251c] text-xs font-semibold animate-fade-in"
                role="alert"
              >
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Seksi 1: Data Pemesan */}
              <section className="bg-white p-5 sm:p-6 rounded-2xl border border-[#e9e5df] space-y-4 shadow-card">
                <h2 className="text-xs uppercase tracking-wider font-bold text-[#242321]">
                  1. Identitas Pemesan
                </h2>

                <div className="space-y-1.5">
                  <label htmlFor="customer-name" className="text-xs font-semibold text-[#242321]">
                    Nama Lengkap / Panggilan <span className="text-[#d94b3d]">*</span>
                  </label>
                  <input
                    id="customer-name"
                    type="text"
                    required
                    maxLength={60}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Contoh: Budi Santoso"
                    className="w-full min-h-[46px] px-4 text-sm bg-[#fbf9f5] border border-[#e9e5df] rounded-full focus:outline-none focus:border-[#f5c943] text-[#242321] transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="customer-phone" className="text-xs font-semibold text-[#242321]">
                    Nomor WhatsApp Aktif <span className="text-[#d94b3d]">*</span>
                  </label>
                  <input
                    id="customer-phone"
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Contoh: 081234567890"
                    className="w-full min-h-[46px] px-4 text-sm bg-[#fbf9f5] border border-[#e9e5df] rounded-full focus:outline-none focus:border-[#f5c943] text-[#242321] transition-colors"
                  />
                  <p className="text-[11px] text-[#918c84]">
                    Penjaga warung akan mengirim konfirmasi dan notifikasi pesanan siap via WhatsApp.
                  </p>
                </div>
              </section>

              {/* Seksi 2: Waktu Pengambilan */}
              <section className="bg-white p-5 sm:p-6 rounded-2xl border border-[#e9e5df] space-y-4 shadow-card">
                <h2 className="text-xs uppercase tracking-wider font-bold text-[#242321]">
                  2. Waktu Pengambilan (Pickup)
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label
                    className={`flex flex-col p-4 border rounded-2xl cursor-pointer transition-all ${
                      mode === 'asap'
                        ? 'border-[#f5c943] bg-[#fef8e8] shadow-xs'
                        : 'border-[#e9e5df] bg-[#fbf9f5] hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="radio"
                        name="mode"
                        value="asap"
                        checked={mode === 'asap'}
                        onChange={() => setMode('asap')}
                        className="accent-[#f5c943] w-4 h-4"
                      />
                      <span className="font-bold text-sm text-[#242321]">Secepatnya</span>
                    </div>
                    <span className="text-xs text-[#68645e] mt-1.5 pl-6 leading-relaxed">
                      Estimasi siap dalam ±{estimateMinutes} menit setelah lunas.
                    </span>
                  </label>

                  <label
                    className={`flex flex-col p-4 border rounded-2xl cursor-pointer transition-all ${
                      mode === 'scheduled'
                        ? 'border-[#f5c943] bg-[#fef8e8] shadow-xs'
                        : 'border-[#e9e5df] bg-[#fbf9f5] hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="radio"
                        name="mode"
                        value="scheduled"
                        checked={mode === 'scheduled'}
                        onChange={() => setMode('scheduled')}
                        className="accent-[#f5c943] w-4 h-4"
                      />
                      <span className="font-bold text-sm text-[#242321]">Pilih Jam</span>
                    </div>
                    <span className="text-xs text-[#68645e] mt-1.5 pl-6 leading-relaxed">
                      Tentukan jam ambil khusus (maksimal 1 jam ke depan).
                    </span>
                  </label>
                </div>

                {mode === 'scheduled' && (
                  <div className="space-y-1.5 pt-2 animate-fade-in">
                    <label
                      htmlFor="scheduled-time"
                      className="text-xs font-semibold text-[#242321]"
                    >
                      Pilih Jam Ambil (WIB) <span className="text-[#d94b3d]">*</span>
                    </label>
                    <select
                      id="scheduled-time"
                      value={selectedPickupTime}
                      onChange={(e) => setSelectedPickupTime(e.target.value)}
                      className="w-full min-h-[46px] px-4 text-sm bg-[#fbf9f5] border border-[#e9e5df] rounded-full focus:outline-none focus:border-[#f5c943] text-[#242321] transition-colors"
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
                  <label htmlFor="order-note" className="text-xs font-semibold text-[#242321]">
                    Catatan Khusus untuk Warung (Opsional)
                  </label>
                  <textarea
                    id="order-note"
                    rows={2}
                    maxLength={200}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Contoh: sambal dipisah ya mas, kuah jangan terlalu asin"
                    className="w-full p-3.5 text-sm bg-[#fbf9f5] border border-[#e9e5df] rounded-2xl focus:outline-none focus:border-[#f5c943] text-[#242321] transition-colors resize-none"
                  />
                </div>
              </section>

              {/* Seksi 3: Ringkasan Pesanan */}
              <section className="bg-white p-5 sm:p-6 rounded-2xl border border-[#e9e5df] space-y-4 shadow-card">
                <h2 className="text-xs uppercase tracking-wider font-bold text-[#242321]">
                  3. Ringkasan Pesanan
                </h2>

                <div className="divide-y divide-[#eeeae4]">
                  {items.map((it) => (
                    <div key={it.id} className="py-3 flex justify-between items-start text-xs">
                      <div>
                        <span className="font-bold text-[#242321]">
                          {it.qty}x {it.menuItem.name}
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
                        {formatRupiah(it.unitPrice * it.qty)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="pt-3 border-t border-[#eeeae4] flex justify-between items-center text-sm font-bold text-[#242321]">
                  <span>Total Tagihan</span>
                  <span className="text-base sm:text-lg font-extrabold text-[#242321]">
                    {formatRupiah(totalAmount)}
                  </span>
                </div>

                <div className="p-3.5 bg-[#fbf9f5] border border-[#e9e5df] rounded-2xl flex items-center gap-2.5 text-xs text-[#68645e]">
                  <ShieldCheck className="w-4 h-4 text-[#242321] shrink-0" />
                  <span>Biaya gateway ditanggung warung. Tidak ada tambahan biaya admin.</span>
                </div>
              </section>

              {/* Tombol Lanjut ke Pembayaran */}
              <button
                type="submit"
                disabled={isSubmitting || !isStoreOpen}
                className="w-full min-h-[48px] bg-[#f5c943] hover:bg-[#e8b82b] text-[#242321] font-bold text-sm sm:text-base py-3.5 px-6 rounded-full shadow-xs active:scale-95 transition-all flex items-center justify-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
