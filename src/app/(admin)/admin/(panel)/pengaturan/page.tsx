'use client';

import { inputClass, sectionTitleClass } from '@/components/ui/styles';
import { PageHeader } from '@/components/ui/PageHeader';
import { buttonClass } from '@/components/ui/Button';
import { demoToolsEnabled } from '@/services/client';
import { makeSaveGuard } from '@/lib/saveGuard';
import React, { useState, useEffect } from 'react';
import { StoreSettings } from '@/types';
import { settingsService } from '@/services/settings';
import { orderService } from '@/services/orders';
import { WhatsAppLoginCard } from '@/components/admin/WhatsAppLoginCard';
import {
  Power,
  Clock,
  Wifi,
  WifiOff,
  RotateCcw,
  CheckCircle2,
  Sparkles,
  Egg,
  Store,
  AlertTriangle,
} from 'lucide-react';

export default function AdminPengaturanPage() {
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [estimate, setEstimate] = useState<number>(10);
  const [eggPrice, setEggPrice] = useState<number>(4000);
  const [isOpen, setIsOpen] = useState<boolean>(true);
  const [waConnected, setWaConnected] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const s = await settingsService.getStoreSettings();
      setSettings(s);
      setEstimate(s.estimate);
      setEggPrice(s.eggPrice);
      setIsOpen(s.open);
      setWaConnected(s.waConnected);
    } catch (e) {
      console.warn('Gagal memuat settings di AdminPengaturanPage:', e);
    }
  };

  useEffect(() => {
    loadData();

    const handleUpdate = () => {
      loadData();
    };

    window.addEventListener('storage', handleUpdate);
    window.addEventListener('pv_storage_update', handleUpdate);

    return () => {
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('pv_storage_update', handleUpdate);
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const guard = makeSaveGuard(showToast, loadData);

  const handleToggleOpen = guard(async () => {
    if (!settings) return;
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);
    await settingsService.saveStoreSettings({ ...settings, open: nextOpen });
    showToast(
      nextOpen
        ? 'Pemesanan online dibuka. Pelanggan dapat membuat pesanan baru.'
        : 'Pemesanan online ditutup sementara.'
    );
  });

  const handleToggleWa = guard(async () => {
    if (!settings) return;
    const nextWa = !waConnected;
    setWaConnected(nextWa);
    await settingsService.saveStoreSettings({ ...settings, waConnected: nextWa });
    showToast(
      nextWa
        ? 'Koneksi WAHA dipulihkan. Notifikasi WhatsApp aktif normal.'
        : 'Koneksi WAHA diputus. Notifikasi pesanan baru masuk ke status Gagal.'
    );
  });

  const handleSaveOperational = guard(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    await settingsService.saveStoreSettings({
      ...settings,
      estimate: Number(estimate),
      eggPrice: Number(eggPrice),
    });
    showToast('Pengaturan operasional berhasil disimpan.');
  });

  const handleSeedDemoOrders = guard(async () => {
    await orderService.seedDemoOrders();
    showToast('6 contoh pesanan demo berhasil dimuat ulang ke antrean dapur.');
  });

  const handleResetDemo = guard(async () => {
    if (
      confirm(
        'Yakin ingin mereset seluruh data demo? Semua perubahan menu, order lokal, dan sif akan dikembalikan ke setelan pabrik.'
      )
    ) {
      await settingsService.resetAllData();
      await loadData();
      showToast('Seluruh data demo berhasil direset ke kondisi awal.');
    }
  });

  if (!settings) return null;

  return (
    <div>
      <div className="space-y-6">

        {toastMessage && (
          <div
            role="status"
            className="p-3 px-4 bg-ink text-white text-xs font-semibold rounded-full shadow-dropdown flex items-center gap-2 animate-fade-in"
          >
            <CheckCircle2 className="w-4 h-4 text-gold shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        <PageHeader
          title="Pengaturan Toko & WhatsApp"
          description="Status pemesanan online, estimasi dapur, dan login WhatsApp notifikasi."
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Kolom Kiri: Section 1 & Section 2 */}
          <div className="space-y-6">
            {/* Section 1: Status Pemesanan Online */}
            <section className="bg-white border border-line rounded-2xl p-5 shadow-card space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-cream flex items-center justify-center text-ink">
                  <Store className="w-4 h-4" />
                </div>
                <div>
                  <h3 className={sectionTitleClass}>
                    Status Pemesanan Online
                  </h3>
                  <span className="text-xs text-muted">
                    Kontrol ketersediaan checkout untuk pelanggan
                  </span>
                </div>
              </div>

              <div className="p-4 bg-surface-muted rounded-2xl border border-line space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-ink">
                    Status Gerai:
                  </span>
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-full shadow-xs inline-flex items-center gap-1.5 ${
                      isOpen
                        ? 'bg-success-soft text-success-ink border border-success-line/70'
                        : 'bg-danger/10 text-danger border border-danger/30'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isOpen ? 'bg-success animate-pulse' : 'bg-danger'
                      }`}
                    />
                    <span>{isOpen ? 'Buka (Menerima Pesanan)' : 'Tutup Sementara'}</span>
                  </span>
                </div>

                <p className="text-xs text-muted leading-relaxed">
                  {isOpen
                    ? 'Pelanggan dapat melakukan checkout pesanan mandiri via web.'
                    : 'Checkout dibatasi sementara. Pelanggan hanya dapat melihat katalog menu tanpa menyelesaikan pesanan.'}
                </p>

                <div className="pt-1">
                  <button
                    type="button"
                    onClick={handleToggleOpen}
                    className={`w-full min-h-11 px-4 py-2 text-xs sm:text-sm font-bold rounded-full transition-colors cursor-pointer inline-flex items-center justify-center gap-2 shadow-xs ${
                      isOpen
                        ? 'bg-danger/10 hover:bg-danger/20 text-danger border border-danger/30'
                        : 'bg-gold hover:bg-gold-hover text-ink'
                    }`}
                  >
                    <Power className="w-4 h-4" />
                    <span>{isOpen ? 'Tutup Pesanan Online' : 'Buka Pesanan Online'}</span>
                  </button>
                </div>
              </div>
            </section>

            {/* Section 2: Operasional & Tarif Tambahan */}
            <section className="bg-white border border-line rounded-2xl p-5 shadow-card space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-cream flex items-center justify-center text-ink">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className={sectionTitleClass}>
                    Operasional & Tarif Tambahan
                  </h3>
                  <span className="text-xs text-muted">
                    Estimasi durasi memasak dan tarif varian telur
                  </span>
                </div>
              </div>

              <form onSubmit={handleSaveOperational} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-ink flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-subtle" />
                    <span>Estimasi Menit Persiapan Masak</span>
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={60}
                    step={1}
                    required
                    value={estimate}
                    onChange={(e) => setEstimate(Number(e.target.value))}
                    className={inputClass}
                  />
                  <p className="text-2xs text-muted">
                    Durasi ini digunakan sebagai acuan estimasi selesai saat pelanggan memilih opsi Secepatnya.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-ink flex items-center gap-1.5">
                    <Egg className="w-3.5 h-3.5 text-subtle" />
                    <span>Harga Tambahan Telur (Rp)</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={500}
                    required
                    value={eggPrice}
                    onChange={(e) => setEggPrice(Number(e.target.value))}
                    className={inputClass}
                  />
                  <p className="text-2xs text-muted">
                    Biaya tambahan flat yang dikenakan saat pelanggan memilih varian telur.
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className={buttonClass('gold', 'md', 'w-full justify-center')}
                  >
                    <span>Simpan Pengaturan Operasional</span>
                  </button>
                </div>
              </form>
            </section>
          </div>

          {/* Kolom Kanan: Section 3 & Section 4 */}
          <div className="space-y-6">
            {/* Login WhatsApp (scan QR WAHA) */}
            <WhatsAppLoginCard />

            {/* Section 3: Simulator Koneksi WAHA WhatsApp */}
            <section className="bg-white border border-line rounded-2xl p-5 shadow-card space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-cream flex items-center justify-center text-ink">
                  {waConnected ? (
                    <Wifi className="w-4 h-4 text-success" />
                  ) : (
                    <WifiOff className="w-4 h-4 text-danger" />
                  )}
                </div>
                <div>
                  <h3 className={sectionTitleClass}>
                    Simulator Koneksi WAHA WhatsApp
                  </h3>
                  <span className="text-xs text-muted">
                    Simulasi pengiriman notifikasi WhatsApp otomatis
                  </span>
                </div>
              </div>

              <div className="p-4 bg-surface-muted rounded-2xl border border-line space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-ink">
                    Status Sesi WAHA:
                  </span>
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-full shadow-xs inline-flex items-center gap-1.5 ${
                      waConnected
                        ? 'bg-success-soft text-success-ink border border-success-line/70'
                        : 'bg-danger/10 text-danger border border-danger/30'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        waConnected ? 'bg-success' : 'bg-danger'
                      }`}
                    />
                    <span>{waConnected ? 'Terhubung Normal' : 'Simulasi Terputus'}</span>
                  </span>
                </div>

                <p className="text-xs text-muted leading-relaxed">
                  Saat status terhubung, pesanan yang telah lunas otomatis mengirim pesan notifikasi ke WhatsApp penjaga aktif. Ketika disimulasikan terputus, pesan akan masuk status Gagal dan memicu opsi Kirim Ulang Manual pada layar antrean.
                </p>

                <div className="pt-1">
                  <button
                    type="button"
                    onClick={handleToggleWa}
                    className={`w-full min-h-11 px-4 py-2 text-xs sm:text-sm font-bold rounded-full transition-colors cursor-pointer inline-flex items-center justify-center gap-2 shadow-xs ${
                      waConnected
                        ? 'bg-white hover:bg-surface-muted text-danger border border-danger/40'
                        : 'bg-gold hover:bg-gold-hover text-ink'
                    }`}
                  >
                    {waConnected ? (
                      <>
                        <WifiOff className="w-4 h-4" />
                        <span>Simulasikan WA Terputus</span>
                      </>
                    ) : (
                      <>
                        <Wifi className="w-4 h-4" />
                        <span>Pulihkan Sesi WA Terhubung</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </section>

            {/* Section 4: Data Demo & Reset (hanya mode demo / development) */}
            {demoToolsEnabled() && (
            <section className="bg-white border border-line rounded-2xl p-5 shadow-card space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-cream flex items-center justify-center text-ink">
                  <Sparkles className="w-4 h-4 text-ink" />
                </div>
                <div>
                  <h3 className={sectionTitleClass}>
                    Data Demo & Reset
                  </h3>
                  <span className="text-xs text-muted">
                    Alat pengujian antrean dan pemulihan kondisi awal
                  </span>
                </div>
              </div>

              <div className="p-4 bg-surface-muted rounded-2xl border border-line space-y-3">
                <p className="text-xs text-muted leading-relaxed">
                  Muat ulang 6 contoh skenario pesanan (pesanan baru, sedang dimasak, siap diambil, WA gagal, dan pembatalan dengan refund) untuk menguji seluruh alur kerja dapur.
                </p>

                <div className="space-y-2.5 pt-1">
                  <button
                    type="button"
                    onClick={handleSeedDemoOrders}
                    className={buttonClass('outline', 'md', 'w-full justify-center')}
                  >
                    <Sparkles className="w-4 h-4 text-gold" />
                    <span>Muat 6 Pesanan Demo</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleResetDemo}
                    className={buttonClass('danger', 'md', 'w-full justify-center')}
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Reset Total Seluruh Data</span>
                  </button>
                </div>

                <div className="flex items-center gap-1.5 text-2xs text-subtle pt-1">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>Reset total akan mengembalikan menu, antrean, dan sif ke setelan bawaan.</span>
                </div>
              </div>
            </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
