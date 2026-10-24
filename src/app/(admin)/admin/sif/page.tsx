'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Shift, Order } from '@/types';
import {
  getShifts,
  saveShifts,
  getStoreSettings,
  saveStoreSettings,
  getOrders,
} from '@/lib/store';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatTimeWIB } from '@/lib/constants';
import {
  Plus,
  CheckCircle,
  Phone,
  ArrowRight,
  ShieldCheck,
  Edit2,
  Trash2,
} from 'lucide-react';

export default function AdminSifPage() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [activeShiftId, setActiveShiftId] = useState<string>('s1');
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);

  // State Modal Tambah / Edit Penjaga
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [formName, setFormName] = useState<string>('');
  const [formPhone, setFormPhone] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);

  const loadData = () => {
    const s = getShifts();
    const settings = getStoreSettings();
    const orders = getOrders();

    setShifts(s);
    setActiveShiftId(settings.recipientShiftId || s[0]?.id || 's1');

    // Pesanan lunas yang belum selesai diserahkan
    const unfulfilled = orders.filter(
      (o) => o.payment === 'PAID' && ['NEW', 'PREPARING', 'READY'].includes(o.fulfillment)
    );
    setPendingOrders(unfulfilled);
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

  const handleActivateShift = (shiftId: string) => {
    const settings = getStoreSettings();
    saveStoreSettings({ ...settings, recipientShiftId: shiftId });
    setActiveShiftId(shiftId);
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

  const handleSaveShift = (e: React.FormEvent) => {
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
      saveShifts(updated);
    } else {
      const newShift: Shift = {
        id: 's_' + Date.now(),
        name: formName.trim(),
        phone: cleanPhone,
      };
      const updated = [...shifts, newShift];
      setShifts(updated);
      saveShifts(updated);
    }

    setIsModalOpen(false);
  };

  const handleDeleteShift = (id: string) => {
    if (shifts.length <= 1) {
      alert('Harus ada minimal satu penjaga yang terdaftar.');
      return;
    }
    if (id === activeShiftId) {
      alert('Tidak bisa menghapus penjaga yang sedang bertugas aktif. Pindahkan sif aktif terlebih dahulu.');
      return;
    }
    if (confirm('Hapus penjaga ini?')) {
      const updated = shifts.filter((s) => s.id !== id);
      setShifts(updated);
      saveShifts(updated);
      setIsModalOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper py-6 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <AdminHeader />

        {/* Section Header */}
        <div className="bg-white p-5 rounded-2xl border border-border-line flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-ink">Penjaga & Sif Operasional</h2>
            <p className="text-xs text-text-muted mt-0.5">
              Pilih petugas yang bertugas saat ini. Notifikasi pesanan baru otomatis diarahkan ke nomor penjaga aktif.
            </p>
          </div>

          <Button variant="primary" size="sm" onClick={openAddModal}>
            <Plus className="w-4 h-4 mr-1.5" />
            <span>Tambah Penjaga</span>
          </Button>
        </div>

        {/* Layout 2 Kolom: Daftar Penjaga & Serah Terima Sif */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Kolom Kiri: Daftar Penjaga (7/12) */}
          <div className="lg:col-span-7 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-ink">
              Daftar Penjaga Warung
            </h3>

            <div className="space-y-3">
              {shifts.map((s) => {
                const isActive = s.id === activeShiftId;
                return (
                  <div
                    key={s.id}
                    className={`bg-white p-4 sm:p-5 rounded-2xl border transition-all ${
                      isActive
                        ? 'border-brand-green ring-2 ring-brand-green/20 shadow-xs'
                        : 'border-border-line'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <strong className="text-base font-bold text-ink">
                            {s.name}
                          </strong>
                          {isActive && (
                            <Badge variant="success" size="sm">
                              Sif Aktif
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 text-xs text-text-muted">
                          <Phone className="w-3.5 h-3.5" />
                          <span>{s.phone}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {!isActive ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleActivateShift(s.id)}
                          >
                            <CheckCircle className="w-3.5 h-3.5 mr-1" />
                            <span>Aktifkan Sif</span>
                          </Button>
                        ) : null}

                        <button
                          type="button"
                          onClick={() => openEditModal(s)}
                          className="w-8 h-8 rounded-lg border border-border-line hover:bg-neutral-50 flex items-center justify-center text-text-muted hover:text-ink cursor-pointer"
                          title="Edit data penjaga"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Kolom Kanan: Serah Terima Sif (5/12) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-ink">
                Serah Terima Sif
              </h3>
              <span className="text-xs font-semibold text-text-muted">
                {pendingOrders.length} pesanan aktif
              </span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-border-line space-y-4">
              <p className="text-xs text-text-muted">
                Pergantian sif tidak membatalkan order yang sudah berjalan. Pastikan penjaga pengganti memeriksa seluruh pesanan ini:
              </p>

              {pendingOrders.length === 0 ? (
                <div className="py-6 text-center text-xs text-text-muted">
                  <ShieldCheck className="w-8 h-8 text-brand-green mx-auto mb-2 opacity-80" />
                  <span>Semua pesanan lunas sudah selesai diambil. Dapur bersih.</span>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                  {pendingOrders.map((o) => (
                    <div
                      key={o.id}
                      className="p-3 bg-paper rounded-xl border border-border-line space-y-1.5 text-xs"
                    >
                      <div className="flex justify-between items-center">
                        <strong className="font-mono text-ink">{o.number}</strong>
                        <span className="font-bold text-brand-green">
                          {formatTimeWIB(o.pickup)} WIB
                        </span>
                      </div>
                      <div className="flex justify-between text-text-muted text-[11px]">
                        <span>Atas nama: {o.name}</span>
                        <span>{o.items.length} jenis menu</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <Link href="/admin/antrean" className="block pt-1">
                <Button variant="outline" size="sm" fullWidth>
                  <span>Buka Antrean Dapur Lengkap</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
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
              <div className="p-3 bg-danger-red/10 border border-danger-red/20 rounded-xl text-danger-red text-xs font-semibold">
                {formError}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold text-ink">
                Nama Penjaga <span className="text-danger-red">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={50}
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Contoh: Aa Iis"
                className="w-full min-h-[44px] px-3.5 text-sm bg-white border border-border-line rounded-xl focus:outline-none focus:border-brand-green"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-ink">
                Nomor WhatsApp <span className="text-danger-red">*</span>
              </label>
              <input
                type="tel"
                required
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                placeholder="Contoh: 081234567890"
                className="w-full min-h-[44px] px-3.5 text-sm bg-white border border-border-line rounded-xl focus:outline-none focus:border-brand-green"
              />
              <p className="text-[11px] text-text-muted">
                Format nomor otomatis dinormalisasi dengan kode negara 62.
              </p>
            </div>

            <div className="flex items-center justify-between pt-2">
              {editingShift && editingShift.id !== activeShiftId ? (
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={() => handleDeleteShift(editingShift.id)}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  <span>Hapus</span>
                </Button>
              ) : (
                <div />
              )}

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsModalOpen(false)}
                >
                  Batal
                </Button>
                <Button type="submit" variant="primary" size="sm">
                  Simpan Penjaga
                </Button>
              </div>
            </div>
          </form>
        </Modal>
      </div>
    </div>
  );
}
