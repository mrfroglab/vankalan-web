'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Shift, Order } from '@/types';
import { settingsService } from '@/services/settings';
import { orderService } from '@/services/orders';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { Modal } from '@/components/ui/Modal';
import { formatTimeWIB } from '@/lib/constants';
import {
  Plus,
  Phone,
  ArrowRight,
  ShieldCheck,
  Edit2,
  Trash2,
  CheckCircle2,
  Clock,
  UserCheck,
} from 'lucide-react';

export default function AdminSifPage() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [activeShiftId, setActiveShiftId] = useState<string>('s1');
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // State Modal Tambah / Edit Penjaga
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [formName, setFormName] = useState<string>('');
  const [formPhone, setFormPhone] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadData = async () => {
    try {
      const [s, settings, orders] = await Promise.all([
        settingsService.getShifts(),
        settingsService.getStoreSettings(),
        orderService.getOrders(),
      ]);

      setShifts(s);
      setActiveShiftId(settings.recipientShiftId || s[0]?.id || 's1');

      // Pesanan lunas yang belum selesai diserahkan
      const unfulfilled = orders.filter(
        (o) => o.payment === 'PAID' && ['NEW', 'PREPARING', 'READY'].includes(o.fulfillment)
      );
      setPendingOrders(unfulfilled);
    } catch (e) {
      console.warn('Gagal memuat data di AdminSifPage:', e);
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

  const handleActivateShift = async (shiftId: string) => {
    const settings = await settingsService.getStoreSettings();
    const shift = shifts.find((s) => s.id === shiftId);
    await settingsService.saveStoreSettings({ ...settings, recipientShiftId: shiftId });
    setActiveShiftId(shiftId);
    if (shift) {
      showToast(`Sif aktif berhasil dialihkan ke ${shift.name}.`);
    }
  };

  const openAddModal = () => {
    setEditingShift(null);
    setFormName('');
    setFormPhone('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (shift: Shift) => {
    setEditingShift(shift);
    setFormName(shift.name);
    setFormPhone(shift.phone);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSaveShift = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    let cleanPhone = formPhone.replace(/[\s()+-]/g, '');
    if (cleanPhone.startsWith('0')) cleanPhone = '62' + cleanPhone.slice(1);

    if (!/^62\d{8,13}$/.test(cleanPhone)) {
      setFormError('Masukkan nomor WhatsApp yang valid, misalnya 081234567890.');
      return;
    }

    if (editingShift) {
      const updated = shifts.map((s) =>
        s.id === editingShift.id
          ? { ...s, name: formName.trim(), phone: cleanPhone }
          : s
      );
      setShifts(updated);
      await settingsService.saveShifts(updated);
      showToast(`Data penjaga ${formName.trim()} berhasil diperbarui.`);
    } else {
      const newShift: Shift = {
        id: 's_' + Date.now(),
        name: formName.trim(),
        phone: cleanPhone,
      };
      const updated = [...shifts, newShift];
      setShifts(updated);
      await settingsService.saveShifts(updated);
      showToast(`Penjaga baru ${formName.trim()} berhasil ditambahkan.`);
    }

    setIsModalOpen(false);
  };

  const handleDeleteShift = async (id: string) => {
    if (shifts.length <= 1) {
      alert('Harus ada minimal satu penjaga yang terdaftar.');
      return;
    }
    if (id === activeShiftId) {
      alert('Tidak bisa menghapus penjaga yang sedang bertugas aktif. Pindahkan sif aktif terlebih dahulu.');
      return;
    }
    const target = shifts.find((s) => s.id === id);
    if (confirm(`Hapus penjaga ${target ? `"${target.name}"` : 'ini'}?`)) {
      const updated = shifts.filter((s) => s.id !== id);
      setShifts(updated);
      await settingsService.saveShifts(updated);
      setIsModalOpen(false);
      showToast('Penjaga berhasil dihapus.');
    }
  };

  return (
    <div className="bg-[#f5f2ed] min-h-screen py-6 sm:py-8 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <AdminHeader />

        {toastMessage && (
          <div
            role="status"
            className="p-3 px-4 bg-[#242321] text-white text-xs font-semibold rounded-full shadow-dropdown flex items-center gap-2 animate-fade-in"
          >
            <CheckCircle2 className="w-4 h-4 text-[#f5c943] shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Section Header */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-[#e9e5df] shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold font-editorial text-[#242321]">
              Penjaga & Manajemen Sif
            </h2>
            <p className="text-xs sm:text-sm text-[#68645e] mt-1 leading-normal">
              Kelola daftar petugas jaga warung dan koordinasi serah terima pesanan aktif antar-sif.
            </p>
          </div>

          <button
            type="button"
            onClick={openAddModal}
            className="min-h-[44px] px-5 py-2 bg-[#f5c943] hover:bg-[#e8b82b] text-[#242321] font-bold text-xs sm:text-sm rounded-full shadow-xs inline-flex items-center gap-1.5 cursor-pointer transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Penjaga Baru</span>
          </button>
        </div>

        {/* Grid 2 Kolom: Sif Cards & Handover Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Kolom Kiri: Sif Cards (7/12) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#918c84]">
                Daftar Penjaga Terdaftar ({shifts.length})
              </h3>
              <span className="text-[11px] text-[#68645e]">
                Notifikasi WhatsApp otomatis dikirim ke sif aktif
              </span>
            </div>

            <div className="space-y-3">
              {shifts.map((s) => {
                const isActive = s.id === activeShiftId;
                return (
                  <div
                    key={s.id}
                    className={`bg-white border rounded-2xl p-5 shadow-card space-y-3 transition-all ${
                      isActive
                        ? 'border-[#f5c943] ring-2 ring-[#f5c943]/30'
                        : 'border-[#e9e5df] hover:border-[#918c84]/40'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <strong className="text-base font-bold text-[#242321]">
                            {s.name}
                          </strong>

                          {isActive ? (
                            <span className="bg-[#f8d84f] text-[#242321] text-[10px] font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 shadow-xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-700 animate-pulse" />
                              <span>Sif Aktif</span>
                            </span>
                          ) : (
                            <span className="bg-[#f1ede7] text-[#68645e] text-[10px] font-semibold px-2 py-0.5 rounded-full border border-[#e9e5df]">
                              Standby
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 text-xs text-[#68645e]">
                          <Phone className="w-3.5 h-3.5 text-[#918c84]" />
                          <span className="font-mono text-xs">{s.phone}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-center">
                        {!isActive ? (
                          <button
                            type="button"
                            onClick={() => handleActivateShift(s.id)}
                            className="min-h-[38px] px-3.5 py-1.5 bg-white hover:bg-[#fbf9f5] border border-[#e9e5df] text-[#242321] font-bold text-xs rounded-full inline-flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                          >
                            <UserCheck className="w-3.5 h-3.5 text-[#f5c943]" />
                            <span>Aktifkan Sif Ini</span>
                          </button>
                        ) : null}

                        <button
                          type="button"
                          onClick={() => openEditModal(s)}
                          className="w-9 h-9 rounded-full border border-[#e9e5df] hover:bg-[#fbf9f5] flex items-center justify-center text-[#68645e] hover:text-[#242321] cursor-pointer transition-colors shadow-xs"
                          title="Edit penjaga"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {!isActive ? (
                          <button
                            type="button"
                            onClick={() => handleDeleteShift(s.id)}
                            className="w-9 h-9 rounded-full border border-[#e9e5df] hover:border-[#d94b3d]/30 hover:bg-[#d94b3d]/10 flex items-center justify-center text-[#68645e] hover:text-[#d94b3d] cursor-pointer transition-colors shadow-xs"
                            title="Hapus penjaga"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Kolom Kanan: Unfulfilled Handover Panel (5/12) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#918c84]">
                Serah Terima Sif
              </h3>
              <span className="text-xs font-semibold text-[#68645e]">
                {pendingOrders.length} pesanan aktif
              </span>
            </div>

            {/* Warm alert box */}
            <div className="bg-[#fbf9f5] border border-[#e9e5df] rounded-2xl p-5 shadow-card space-y-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#242321]" />
                <h4 className="text-sm font-bold text-[#242321]">
                  Pemberitahuan Pergantian Sif
                </h4>
              </div>

              <p className="text-xs text-[#68645e] leading-relaxed">
                Pergantian sif tidak membatalkan order yang sedang berjalan. Pastikan penjaga yang baru mulai bertugas mengecek seluruh pesanan aktif berikut:
              </p>

              {pendingOrders.length === 0 ? (
                <div className="py-8 px-4 text-center text-xs text-[#68645e] bg-white rounded-2xl border border-[#e9e5df]">
                  <ShieldCheck className="w-8 h-8 text-emerald-600 mx-auto mb-2 opacity-80" />
                  <strong className="block text-[#242321] font-bold">
                    Dapur Bersih
                  </strong>
                  <span>Semua pesanan lunas telah selesai diserahkan ke pelanggan.</span>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                  {pendingOrders.map((o) => (
                    <div
                      key={o.id}
                      className="p-3 bg-white rounded-2xl border border-[#e9e5df] space-y-1.5 text-xs shadow-xs"
                    >
                      <div className="flex justify-between items-center">
                        <strong className="font-mono text-xs font-bold text-[#242321]">
                          {o.number}
                        </strong>
                        <span className="font-bold text-xs text-[#242321] bg-[#f1ede7] px-2 py-0.5 rounded-full">
                          {formatTimeWIB(o.pickup)} WIB
                        </span>
                      </div>

                      <div className="flex justify-between text-[#68645e] text-[11px]">
                        <span>Pelanggan: <strong className="text-[#242321]">{o.name}</strong></span>
                        <span>{o.items.length} menu ({o.fulfillment})</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <Link href="/admin/antrean" className="block pt-1">
                <button
                  type="button"
                  className="w-full min-h-[42px] px-4 py-2 bg-white hover:bg-[#fbf9f5] text-[#242321] border border-[#e9e5df] font-bold text-xs rounded-full shadow-xs inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <span>Buka Antrean Dapur Lengkap</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </button>
              </Link>
            </div>
          </div>
        </div>

        {/* Modal Tambah / Edit Penjaga */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingShift ? 'Edit Data Penjaga' : 'Tambah Penjaga Baru'}
        >
          <form onSubmit={handleSaveShift} className="space-y-4">
            {formError && (
              <div className="p-3 bg-[#d94b3d]/10 border border-[#d94b3d]/30 rounded-2xl text-[#d94b3d] text-xs font-semibold">
                {formError}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#242321]">
                Nama Penjaga <span className="text-[#d94b3d]">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={50}
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Contoh: Aa Iis"
                className="w-full min-h-[44px] px-4 text-sm bg-[#fbf9f5] border border-[#e9e5df] rounded-full text-[#242321] placeholder-[#918c84] focus:outline-none focus:border-[#f5c943] focus:ring-1 focus:ring-[#f5c943]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#242321]">
                Nomor WhatsApp <span className="text-[#d94b3d]">*</span>
              </label>
              <input
                type="tel"
                required
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                placeholder="Contoh: 081234567890"
                className="w-full min-h-[44px] px-4 text-sm bg-[#fbf9f5] border border-[#e9e5df] rounded-full text-[#242321] placeholder-[#918c84] focus:outline-none focus:border-[#f5c943] focus:ring-1 focus:ring-[#f5c943]"
              />
              <p className="text-[11px] text-[#68645e]">
                Format nomor otomatis dinormalisasi menggunakan awalan kode negara 62.
              </p>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[#eeeae4]">
              {editingShift && editingShift.id !== activeShiftId ? (
                <button
                  type="button"
                  onClick={() => handleDeleteShift(editingShift.id)}
                  className="min-h-[42px] px-4 py-2 bg-[#d94b3d]/10 hover:bg-[#d94b3d]/20 text-[#d94b3d] border border-[#d94b3d]/30 font-bold text-xs rounded-full inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus</span>
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="min-h-[42px] px-4 py-2 bg-white hover:bg-[#fbf9f5] text-[#68645e] border border-[#e9e5df] font-bold text-xs rounded-full cursor-pointer transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="min-h-[42px] px-5 py-2 bg-[#f5c943] hover:bg-[#e8b82b] text-[#242321] font-bold text-xs sm:text-sm rounded-full shadow-xs cursor-pointer transition-colors"
                >
                  Simpan Penjaga
                </button>
              </div>
            </div>
          </form>
        </Modal>
      </div>
    </div>
  );
}
