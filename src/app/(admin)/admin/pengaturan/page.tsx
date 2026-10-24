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
    showToast(
      nextOpen
        ? 'Pemesanan online dibuka. Pelanggan dapat membuat pesanan baru.'
        : 'Pemesanan online ditutup sementara.'
    );
  };

  const handleToggleWa = () => {
    if (!settings) return;
    const nextWa = !waConnected;
    setWaConnected(nextWa);
    saveStoreSettings({ ...settings, waConnected: nextWa });
    showToast(
      nextWa
        ? 'Koneksi WAHA dipulihkan. Notifikasi WhatsApp aktif normal.'
        : 'Koneksi WAHA diputus. Notifikasi pesanan baru masuk ke status Gagal.'
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
    showToast('6 contoh pesanan demo berhasil dimuat ulang ke antrean dapur.');
  };

  const handleResetDemo = () => {
    if (
      confirm(
        'Yakin ingin mereset seluruh data demo? Semua perubahan menu, order lokal, dan sif akan dikembalikan ke setelan pabrik.'
      )
    ) {
      resetAllData();
      loadData();
      showToast('Seluruh data demo berhasil direset ke kondisi awal.');
    }
  };

  if (!settings) return null;

  return (
    <div className="bg-[#f5f2ed] min-h-screen py-6 sm:py-8 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <AdminHeader />

        {toastMessage && (
          <div
            role="status"
            className="p-3.5 bg-[#242321] text-white text-xs font-semibold rounded-xl shadow-dropdown flex items-center gap-2 animate-fade-in"
          >
            <CheckCircle2 className="w-4 h-4 text-[#f5c943] shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Section Header */}
        <div className="bg-white p-5 sm:p-6 rounded-[12px] border border-[#e9e5df] shadow-card">
          <h2 className="text-2xl sm:text-3xl font-bold font-editorial text-[#242321]">
            Pengaturan Toko & WhatsApp
          </h2>
          <p className="text-xs sm:text-sm text-[#68645e] mt-1 leading-normal">
            Konfigurasi status penerimaan pesanan online, durasi estimasi dapur, serta simulasi integrasi WhatsApp.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Kolom Kiri: Section 1 & Section 2 */}
          <div className="space-y-6">
            {/* Section 1: Status Pemesanan Online */}
            <section className="bg-white border border-[#e9e5df] rounded-[12px] p-5 shadow-card space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#f1ede7] flex items-center justify-center text-[#242321]">
                  <Store className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#242321]">
                    Status Pemesanan Online
                  </h3>
                  <span className="text-xs text-[#68645e]">
                    Kontrol ketersediaan checkout untuk pelanggan
                  </span>
                </div>
              </div>

              <div className="p-4 bg-[#fbf9f5] rounded-xl border border-[#e9e5df] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#242321]">
                    Status Gerai:
                  </span>
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-full shadow-xs inline-flex items-center gap-1.5 ${
                      isOpen
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/70'
                        : 'bg-[#d94b3d]/10 text-[#d94b3d] border border-[#d94b3d]/30'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isOpen ? 'bg-emerald-600 animate-pulse' : 'bg-[#d94b3d]'
                      }`}
                    />
                    <span>{isOpen ? 'Buka (Menerima Pesanan)' : 'Tutup Sementara'}</span>
                  </span>
                </div>

                <p className="text-xs text-[#68645e] leading-relaxed">
                  {isOpen
                    ? 'Pelanggan dapat melakukan checkout pesanan mandiri via web.'
                    : 'Checkout dibatasi sementara. Pelanggan hanya dapat melihat katalog menu tanpa menyelesaikan pesanan.'}
                </p>

                <div className="pt-1">
                  <button
                    type="button"
                    onClick={handleToggleOpen}
                    className={`w-full min-h-[44px] px-4 py-2 text-xs sm:text-sm font-bold rounded-full transition-colors cursor-pointer inline-flex items-center justify-center gap-2 shadow-xs ${
                      isOpen
                        ? 'bg-[#d94b3d]/10 hover:bg-[#d94b3d]/20 text-[#d94b3d] border border-[#d94b3d]/30'
                        : 'bg-[#f5c943] hover:bg-[#e8b82b] text-[#242321]'
                    }`}
                  >
                    <Power className="w-4 h-4" />
                    <span>{isOpen ? 'Tutup Pesanan Online' : 'Buka Pesanan Online'}</span>
                  </button>
                </div>
              </div>
            </section>

            {/* Section 2: Operasional & Tarif Tambahan */}
            <section className="bg-white border border-[#e9e5df] rounded-[12px] p-5 shadow-card space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#f1ede7] flex items-center justify-center text-[#242321]">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#242321]">
                    Operasional & Tarif Tambahan
                  </h3>
                  <span className="text-xs text-[#68645e]">
                    Estimasi durasi memasak dan tarif varian telur
                  </span>
                </div>
              </div>

              <form onSubmit={handleSaveOperational} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#242321] flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#918c84]" />
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
                    className="w-full min-h-[44px] px-3.5 text-sm bg-[#fbf9f5] border border-[#e9e5df] rounded-xl text-[#242321] focus:outline-none focus:border-[#f5c943] focus:ring-1 focus:ring-[#f5c943]"
                  />
                  <p className="text-[11px] text-[#68645e]">
                    Durasi ini digunakan sebagai acuan estimasi selesai saat pelanggan memilih opsi Secepatnya.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#242321] flex items-center gap-1.5">
                    <Egg className="w-3.5 h-3.5 text-[#918c84]" />
                    <span>Harga Tambahan Telur (Rp)</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={500}
                    required
                    value={eggPrice}
                    onChange={(e) => setEggPrice(Number(e.target.value))}
                    className="w-full min-h-[44px] px-3.5 text-sm bg-[#fbf9f5] border border-[#e9e5df] rounded-xl text-[#242321] focus:outline-none focus:border-[#f5c943] focus:ring-1 focus:ring-[#f5c943]"
                  />
                  <p className="text-[11px] text-[#68645e]">
                    Biaya tambahan flat yang dikenakan saat pelanggan memilih varian telur.
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full min-h-[44px] px-5 py-2.5 bg-[#f5c943] hover:bg-[#e8b82b] text-[#242321] font-bold text-xs sm:text-sm rounded-full shadow-xs inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <span>Simpan Pengaturan Operasional</span>
                  </button>
                </div>
              </form>
            </section>
          </div>

          {/* Kolom Kanan: Section 3 & Section 4 */}
          <div className="space-y-6">
            {/* Section 3: Simulator Koneksi WAHA WhatsApp */}
            <section className="bg-white border border-[#e9e5df] rounded-[12px] p-5 shadow-card space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#f1ede7] flex items-center justify-center text-[#242321]">
                  {waConnected ? (
                    <Wifi className="w-4 h-4 text-emerald-700" />
                  ) : (
                    <WifiOff className="w-4 h-4 text-[#d94b3d]" />
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#242321]">
                    Simulator Koneksi WAHA WhatsApp
                  </h3>
                  <span className="text-xs text-[#68645e]">
                    Simulasi pengiriman notifikasi WhatsApp otomatis
                  </span>
                </div>
              </div>

              <div className="p-4 bg-[#fbf9f5] rounded-xl border border-[#e9e5df] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#242321]">
                    Status Sesi WAHA:
                  </span>
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-full shadow-xs inline-flex items-center gap-1.5 ${
                      waConnected
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/70'
                        : 'bg-[#d94b3d]/10 text-[#d94b3d] border border-[#d94b3d]/30'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        waConnected ? 'bg-emerald-600' : 'bg-[#d94b3d]'
                      }`}
                    />
                    <span>{waConnected ? 'Terhubung Normal' : 'Simulasi Terputus'}</span>
                  </span>
                </div>

                <p className="text-xs text-[#68645e] leading-relaxed">
                  Saat status terhubung, pesanan yang telah lunas otomatis mengirim pesan notifikasi ke WhatsApp penjaga aktif. Ketika disimulasikan terputus, pesan akan masuk status Gagal dan memicu opsi Kirim Ulang Manual pada layar antrean.
                </p>

                <div className="pt-1">
                  <button
                    type="button"
                    onClick={handleToggleWa}
                    className={`w-full min-h-[44px] px-4 py-2 text-xs sm:text-sm font-bold rounded-full transition-colors cursor-pointer inline-flex items-center justify-center gap-2 shadow-xs ${
                      waConnected
                        ? 'bg-white hover:bg-[#fbf9f5] text-[#d94b3d] border border-[#d94b3d]/40'
                        : 'bg-[#f5c943] hover:bg-[#e8b82b] text-[#242321]'
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

            {/* Section 4: Data Demo & Reset */}
            <section className="bg-white border border-[#e9e5df] rounded-[12px] p-5 shadow-card space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#f1ede7] flex items-center justify-center text-[#242321]">
                  <Sparkles className="w-4 h-4 text-[#242321]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#242321]">
                    Data Demo & Reset
                  </h3>
                  <span className="text-xs text-[#68645e]">
                    Alat pengujian antrean dan pemulihan kondisi awal
                  </span>
                </div>
              </div>

              <div className="p-4 bg-[#fbf9f5] rounded-xl border border-[#e9e5df] space-y-3">
                <p className="text-xs text-[#68645e] leading-relaxed">
                  Muat ulang 6 contoh skenario pesanan (pesanan baru, sedang dimasak, siap diambil, WA gagal, dan pembatalan dengan refund) untuk menguji seluruh alur kerja dapur.
                </p>

                <div className="space-y-2.5 pt-1">
                  <button
                    type="button"
                    onClick={handleSeedDemoOrders}
                    className="w-full min-h-[44px] px-4 py-2 bg-white hover:bg-[#fbf9f5] text-[#242321] border border-[#e9e5df] font-bold text-xs sm:text-sm rounded-full shadow-xs inline-flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    <Sparkles className="w-4 h-4 text-[#f5c943]" />
                    <span>Muat 6 Pesanan Demo</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleResetDemo}
                    className="w-full min-h-[44px] px-4 py-2 bg-white hover:bg-[#d94b3d]/10 text-[#d94b3d] border border-[#d94b3d]/30 font-bold text-xs sm:text-sm rounded-full shadow-xs inline-flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Reset Total Seluruh Data</span>
                  </button>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-[#918c84] pt-1">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>Reset total akan mengembalikan menu, antrean, dan sif ke setelan bawaan.</span>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
