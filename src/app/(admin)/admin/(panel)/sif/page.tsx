'use client';

import { FULFILLMENT_LABEL, NOTIFICATION_LABEL } from '@/lib/statusLabels';
import { inputClass, iconButtonClass } from '@/components/ui/styles';
import { PageHeader } from '@/components/ui/PageHeader';
import { buttonClass } from '@/components/ui/Button';
import { makeSaveGuard } from '@/lib/saveGuard';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Shift, Order } from '@/types';
import { settingsService } from '@/services/settings';
import { orderService } from '@/services/orders';
import { Modal } from '@/components/ui/Modal';
import { formatTimeWIB, formatPhone } from '@/lib/constants';
import { HandoverSummary, needsHandover, openPaidOrders, runHandover } from '@/lib/handover';
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
  Send,
} from 'lucide-react';


/** ID sementara untuk item baru (di luar komponen: dipanggil saat aksi, bukan saat render). */
function newLocalId(prefix: string): string {
  return prefix + Date.now();
}

export default function AdminSifPage() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [activeShiftId, setActiveShiftId] = useState<string>('s1');
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Serah terima: konfirmasi setelah mengganti sif + hasil pengiriman ke penjaga pengganti
  const [handoverPrompt, setHandoverPrompt] = useState<Shift | null>(null);
  const [isHandingOver, setIsHandingOver] = useState<boolean>(false);
  const [handoverResult, setHandoverResult] = useState<HandoverSummary | null>(null);

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
      setPendingOrders(openPaidOrders(orders));
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

  const guard = makeSaveGuard(showToast, loadData);

  const handleActivateShift = guard(async (shiftId: string) => {
    const settings = await settingsService.getStoreSettings();
    const shift = shifts.find((s) => s.id === shiftId);
    await settingsService.saveStoreSettings({ ...settings, recipientShiftId: shiftId });
    setActiveShiftId(shiftId);
    if (shift) {
      showToast(`Sif aktif berhasil dialihkan ke ${shift.name}.`);
      // Pengiriman ke penjaga pengganti harus eksplisit: tawarkan, jangan kirim otomatis.
      if (pendingOrders.some((o) => needsHandover(o, shiftId))) {
        setHandoverResult(null);
        setHandoverPrompt(shift);
      }
    }
  });

  const ordersToHandOver = pendingOrders.filter((o) => needsHandover(o, activeShiftId));
  const activeShift = shifts.find((s) => s.id === activeShiftId);

  const handleSendHandover = guard(async () => {
    setIsHandingOver(true);
    try {
      const summary = await runHandover(ordersToHandOver, (id) => orderService.retryWhatsApp(id));
      setHandoverResult(summary);
      await loadData();
    } finally {
      setIsHandingOver(false);
    }
  });

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

  const handleSaveShift = guard(async (e: React.FormEvent) => {
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
        id: newLocalId('s_'),
        name: formName.trim(),
        phone: cleanPhone,
      };
      const updated = [...shifts, newShift];
      setShifts(updated);
      await settingsService.saveShifts(updated);
      showToast(`Penjaga baru ${formName.trim()} berhasil ditambahkan.`);
    }

    setIsModalOpen(false);
  });

  const handleDeleteShift = guard(async (id: string) => {
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
  });

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
          title="Penjaga & Sif"
          description="Kelola petugas jaga warung dan serah terima pesanan aktif antar-sif."
          actions={
            <button type="button" onClick={openAddModal} className={buttonClass('gold', 'md')}>
              <Plus className="w-4 h-4" />
              Tambah Penjaga
            </button>
          }
        />

        {/* Grid 2 Kolom: Sif Cards & Handover Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Kolom Kiri: Sif Cards (7/12) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-2xs font-semibold uppercase tracking-wider text-muted">
                Daftar Penjaga Terdaftar ({shifts.length})
              </h3>
              <span className="text-2xs text-muted">
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
                        ? 'border-gold ring-2 ring-gold/30'
                        : 'border-line hover:border-subtle/40'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <strong className="text-base font-bold text-ink">
                            {s.name}
                          </strong>

                          {isActive ? (
                            <span className="bg-gold text-ink text-2xs font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 shadow-xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                              <span>Sif Aktif</span>
                            </span>
                          ) : (
                            <span className="bg-cream text-muted text-2xs font-semibold px-2 py-0.5 rounded-full border border-line">
                              Standby
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 text-xs text-muted">
                          <Phone className="w-3.5 h-3.5 text-subtle" />
                          <span className="text-xs tabular-nums">{formatPhone(s.phone)}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-center">
                        {!isActive ? (
                          <button
                            type="button"
                            onClick={() => handleActivateShift(s.id)}
                            className={buttonClass('outline', 'sm')}
                          >
                            <UserCheck className="w-3.5 h-3.5 text-gold" />
                            <span>Aktifkan Sif Ini</span>
                          </button>
                        ) : null}

                        <button
                          type="button"
                          onClick={() => openEditModal(s)}
                          className={iconButtonClass}
                          title="Edit penjaga"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {!isActive ? (
                          <button
                            type="button"
                            onClick={() => handleDeleteShift(s.id)}
                            className={`${iconButtonClass} hover:!text-danger hover:!bg-danger-soft hover:border-danger-line`}
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
              <h3 className="text-2xs font-semibold uppercase tracking-wider text-muted">
                Serah Terima Sif
              </h3>
              <span className="text-xs font-semibold text-muted">
                {pendingOrders.length} pesanan aktif
              </span>
            </div>

            {/* Warm alert box */}
            <div className="bg-surface-muted border border-line rounded-2xl p-5 shadow-card space-y-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-ink" />
                <h4 className="text-sm font-bold text-ink">
                  Pemberitahuan Pergantian Sif
                </h4>
              </div>

              <p className="text-xs text-muted leading-relaxed">
                Pergantian sif tidak membatalkan order yang sedang berjalan. Pastikan penjaga yang baru mulai bertugas mengecek seluruh pesanan aktif berikut:
              </p>

              {pendingOrders.length === 0 ? (
                <div className="py-8 px-4 text-center text-xs text-muted bg-white rounded-2xl border border-line">
                  <ShieldCheck className="w-8 h-8 text-success mx-auto mb-2 opacity-80" />
                  <strong className="block text-ink font-bold">
                    Dapur Bersih
                  </strong>
                  <span>Semua pesanan lunas telah selesai diserahkan ke pelanggan.</span>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                  {pendingOrders.map((o) => (
                    <div
                      key={o.id}
                      className="p-3 bg-white rounded-2xl border border-line space-y-1.5 text-xs shadow-xs"
                    >
                      <div className="flex justify-between items-center">
                        <strong className="font-mono text-xs font-bold text-ink">
                          {o.number}
                        </strong>
                        <span className="font-bold text-xs text-ink bg-cream px-2 py-0.5 rounded-full">
                          {formatTimeWIB(o.pickup)} WIB
                        </span>
                      </div>

                      <div className="flex justify-between text-muted text-2xs">
                        <span>Pelanggan: <strong className="text-ink">{o.name}</strong></span>
                        <span>{o.items.length} menu · {FULFILLMENT_LABEL[o.fulfillment]}</span>
                      </div>

                      <div className="text-2xs text-muted">
                        {needsHandover(o, activeShiftId) ? (
                          <span className="text-danger-ink font-semibold">
                            Belum diberi tahu ke sif aktif
                            {o.notificationDetail?.recipientName
                              ? ` (terakhir ke ${o.notificationDetail.recipientName}: ${NOTIFICATION_LABEL[o.notification].toLowerCase()})`
                              : ''}
                          </span>
                        ) : (
                          <span>Notifikasi terkirim ke sif aktif.</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {ordersToHandOver.length > 0 && (
                <button
                  type="button"
                  onClick={handleSendHandover}
                  disabled={isHandingOver}
                  className={buttonClass('gold', 'sm', 'w-full justify-center')}
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>
                    {isHandingOver
                      ? 'Mengirim...'
                      : `Kirim ${ordersToHandOver.length} pesanan ke ${activeShift?.name ?? 'sif aktif'}`}
                  </span>
                </button>
              )}

              {handoverResult && (
                <div role="status" className="p-3 bg-white rounded-2xl border border-line text-xs space-y-1">
                  <p className="font-bold text-ink">
                    {handoverResult.sent} dari {handoverResult.total} pesanan terkirim ke sif aktif.
                  </p>
                  {handoverResult.unresolved.map((u) => (
                    <p key={u.orderId} className="text-danger-ink">
                      {u.number}: {u.reason}
                    </p>
                  ))}
                </div>
              )}

              <Link href="/admin/antrean" className="block pt-1">
                <button
                  type="button"
                  className={buttonClass('outline', 'sm', 'w-full justify-center')}
                >
                  <span>Buka Antrean Dapur Lengkap</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </button>
              </Link>
            </div>
          </div>
        </div>

        {/* Konfirmasi serah terima setelah ganti sif */}
        <Modal
          isOpen={handoverPrompt !== null}
          onClose={() => setHandoverPrompt(null)}
          title="Serah Terima Pesanan Aktif"
        >
          <div className="space-y-4 text-sm text-ink">
            <p>
              Ada <strong>{pendingOrders.length} pesanan lunas</strong> yang belum selesai. Kirim
              rinciannya ke <strong>{handoverPrompt?.name}</strong> sekarang?
            </p>
            <p className="text-xs text-muted">
              Pesan ditandai &quot;KIRIM ULANG&quot; supaya tidak dikira pesanan baru. Pesanan tidak
              berubah dan pembayaran tidak terpengaruh.
            </p>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-line-soft">
              <button
                type="button"
                onClick={() => setHandoverPrompt(null)}
                className={buttonClass('outline', 'sm')}
              >
                Nanti
              </button>
              <button
                type="button"
                onClick={async () => {
                  setHandoverPrompt(null);
                  await handleSendHandover();
                }}
                className={buttonClass('gold', 'sm')}
              >
                Kirim Sekarang
              </button>
            </div>
          </div>
        </Modal>

        {/* Modal Tambah / Edit Penjaga */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingShift ? 'Edit Data Penjaga' : 'Tambah Penjaga Baru'}
        >
          <form onSubmit={handleSaveShift} className="space-y-4">
            {formError && (
              <div className="p-3 bg-danger/10 border border-danger/30 rounded-2xl text-danger text-xs font-semibold">
                {formError}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink">
                Nama Penjaga <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={50}
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Contoh: Aa Iis"
                className={inputClass}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink">
                Nomor WhatsApp <span className="text-danger">*</span>
              </label>
              <input
                type="tel"
                required
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                placeholder="Contoh: 081234567890"
                className={inputClass}
              />
              <p className="text-2xs text-muted">
                Format nomor otomatis dinormalisasi menggunakan awalan kode negara 62.
              </p>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-line-soft">
              {editingShift && editingShift.id !== activeShiftId ? (
                <button
                  type="button"
                  onClick={() => handleDeleteShift(editingShift.id)}
                  className={buttonClass('danger', 'sm')}
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
                  className={buttonClass('outline', 'sm')}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className={buttonClass('gold', 'md')}
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
