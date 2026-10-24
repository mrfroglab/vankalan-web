'use client';

import React, { useState, useEffect } from 'react';
import { StoreSettings } from '@/types';
import {
  getStoreSettings,
  saveStoreSettings,
  resetAllData,
  seedDemoOrders,
} from '@/lib/store';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { Button } from '@/components/ui/Button';
import {
  Power,
  Clock,
  Wifi,
  WifiOff,
  RotateCcw,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

export default function AdminPengaturanPage() {
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [estimate, setEstimate] = useState<number>(10);
  const [eggPrice, setEggPrice] = useState<number>(4000);
  const [isOpen, setIsOpen] = useState<boolean>(true);
  const [waConnected, setWaConnected] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadData = () => {
    const s = getStoreSettings();
    setSettings(s);
    setEstimate(s.estimate);
    setEggPrice(s.eggPrice);
    setIsOpen(s.open);
    setWaConnected(s.waConnected);
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

  const handleToggleOpen = () => {
    if (!settings) return;
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);
    saveStoreSettings({ ...settings, open: nextOpen });
    showToast(nextOpen ? 'Pemesanan online dibuka.' : 'Pemesanan online ditutup sementara.');
  };

  const handleToggleWa = () => {
    if (!settings) return;
    const nextWa = !waConnected;
    setWaConnected(nextWa);
    saveStoreSettings({ ...settings, waConnected: nextWa });
    showToast(
      nextWa
        ? 'Koneksi WAHA demo dipulihkan.'
        : 'Koneksi WAHA demo diputus. Notifikasi order baru akan gagal dan masuk antrean retry.'
    );
  };

  const handleSaveOperational = (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    saveStoreSettings({
      ...settings,
      estimate: Number(estimate),
      eggPrice: Number(eggPrice),
    });
    showToast('Pengaturan operasional berhasil disimpan.');
  };

  const handleSeedDemoOrders = () => {
    seedDemoOrders();
    showToast('6 contoh pesanan demo berhasil dimuat ulang ke antrean.');
  };

  const handleResetDemo = () => {
    if (
      confirm(
        'Yakin ingin mereset seluruh data demo? Semua perubahan menu, order lokal, dan sif akan dikembalikan ke setelan awal pabrik.'
      )
    ) {
      resetAllData();
      loadData();
      showToast('Seluruh data demo berhasil direset ke kondisi awal.');
    }
  };

  if (!settings) return null;

  return (
    <div className="min-h-screen bg-paper py-6 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <AdminHeader />

        {toastMessage && (
          <div
            role="status"
            className="p-3 bg-brand-green text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-2 animate-fade-in"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Section Header */}
        <div>
          <h2 className="text-xl font-black text-ink">Pengaturan Operasional & WA</h2>
          <p className="text-xs text-text-muted mt-0.5">
            Kelola ketersediaan pemesanan online, durasi estimasi dapur, serta simulasi kegagalan koneksi WhatsApp.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Kolom Kiri: Pengaturan Operasional */}
          <div className="space-y-6">
            {/* Card Buka / Tutup Toko */}
            <section className="bg-white p-5 rounded-2xl border border-border-line space-y-4 shadow-xs">
              <h3 className="text-sm font-bold uppercase tracking-wider text-ink flex items-center gap-2">
                <Power className="w-4 h-4 text-brand-green" />
                <span>Penerimaan Pesanan Online</span>
              </h3>

              <div className="p-4 bg-paper rounded-xl border border-border-line flex items-center justify-between">
                <div>
                  <strong className="text-sm text-ink block">
                    Status: {isOpen ? 'Online (Menerima Pesanan)' : 'Tutup Sementara'}
                  </strong>
                  <span className="text-xs text-text-muted">
                    {isOpen
                      ? 'Pelanggan dapat melakukan checkout pesanan pickup.'
                      : 'Checkout diblokir. Pelanggan hanya bisa melihat katalog.'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleToggleOpen}
                  className={`min-h-[40px] px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isOpen
                      ? 'bg-danger-red/10 hover:bg-danger-red/20 text-danger-red border border-danger-red/30'
                      : 'bg-brand-green hover:bg-forest-green text-white'
                  }`}
                >
                  {isOpen ? 'Tutup Online' : 'Buka Online'}
                </button>
              </div>
            </section>

            {/* Form Estimasi & Telur */}
            <form
              onSubmit={handleSaveOperational}
              className="bg-white p-5 rounded-2xl border border-border-line space-y-4 shadow-xs"
            >
              <h3 className="text-sm font-bold uppercase tracking-wider text-ink flex items-center gap-2">
                <Clock className="w-4 h-4 text-brand-green" />
                <span>Estimasi & Biaya Tambahan</span>
              </h3>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-ink">
                  Estimasi Persiapan Masak (Menit)
                </label>
                <input
                  type="number"
                  min={5}
                  max={60}
                  step={1}
                  required
                  value={estimate}
                  onChange={(e) => setEstimate(Number(e.target.value))}
                  className="w-full min-h-[44px] px-3.5 text-sm bg-paper border border-border-line rounded-xl focus:outline-none focus:border-brand-green"
                />
                <p className="text-[11px] text-text-muted">
                  Berlaku untuk checkout baru pilihan &quot;Secepatnya&quot;. Pesanan lunas sebelumnya tidak diubah.
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-ink">
                  Biaya Tambahan Telur (Rp)
                </label>
                <input
                  type="number"
                  min={0}
                  step={500}
                  required
                  value={eggPrice}
                  onChange={(e) => setEggPrice(Number(e.target.value))}
                  className="w-full min-h-[44px] px-3.5 text-sm bg-paper border border-border-line rounded-xl focus:outline-none focus:border-brand-green"
                />
              </div>

              <Button type="submit" variant="primary" size="sm">
                Simpan Perubahan
              </Button>
            </form>
          </div>

          {/* Kolom Kanan: Simulator WAHA & Reset Data */}
          <div className="space-y-6">
            {/* Card Simulator WAHA */}
            <section className="bg-white p-5 rounded-2xl border border-border-line space-y-4 shadow-xs">
              <h3 className="text-sm font-bold uppercase tracking-wider text-ink flex items-center gap-2">
                {waConnected ? (
                  <Wifi className="w-4 h-4 text-brand-green" />
                ) : (
                  <WifiOff className="w-4 h-4 text-danger-red" />
                )}
                <span>Simulator Koneksi WAHA</span>
              </h3>

              <div className="p-4 bg-paper rounded-xl border border-border-line space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-ink">Koneksi WhatsApp</span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      waConnected
                        ? 'bg-soft-green text-brand-green border border-brand-green/30'
                        : 'bg-danger-red/10 text-danger-red border border-danger-red/30'
                    }`}
                  >
                    {waConnected ? 'Terhubung' : 'Terputus'}
                  </span>
                </div>

                <p className="text-xs text-text-muted leading-relaxed">
                  Gunakan tombol di bawah untuk menyimulasikan sesi WAHA yang terputus (misal token kedaluwarsa atau homeserver offline). Saat terputus, pesanan yang dilunasi akan menandai notifikasi sebagai <strong>FAILED</strong>, sehingga kamu bisa mencoba fitur &quot;Kirim Ulang WA&quot; di dapur.
                </p>

                <Button
                  type="button"
                  variant={waConnected ? 'danger' : 'primary'}
                  size="sm"
                  fullWidth
                  onClick={handleToggleWa}
                >
                  {waConnected ? 'Simulasikan WA Terputus' : 'Pulihkan Koneksi WA'}
                </Button>
              </div>
            </section>

            {/* Card Reset Data Demo */}
            <section className="bg-white p-5 rounded-2xl border border-border-line space-y-3 shadow-xs">
              <h3 className="text-sm font-bold uppercase tracking-wider text-ink flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brand-green" />
                <span>Simulasi & Contoh Data</span>
              </h3>

              <p className="text-xs text-text-muted leading-relaxed">
                Muat ulang 6 contoh pesanan demo (pesanan baru, sedang dimasak, siap diambil, WA gagal, dan pembatalan dengan refund) untuk menguji seluruh antrean.
              </p>

              <div className="space-y-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  fullWidth
                  onClick={handleSeedDemoOrders}
                >
                  <Sparkles className="w-4 h-4 mr-1.5 text-brand-green" />
                  <span>Muat Contoh Pesanan Demo</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  fullWidth
                  onClick={handleResetDemo}
                  className="text-danger-red hover:bg-danger-red/10 border-danger-red/30"
                >
                  <RotateCcw className="w-4 h-4 mr-1.5" />
                  <span>Reset Semua Data ke Awal</span>
                </Button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
