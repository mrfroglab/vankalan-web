'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Order,
  OrderFulfillmentStatus,
  Shift,
  StoreSettings,
  RefundStatus,
} from '@/types';
import {
  getOrders,
  saveOrders,
  getStoreSettings,
  getShifts,
  seedDemoOrders,
} from '@/lib/store';
import { formatTimeWIB, formatDateTimeWIB, formatRupiah } from '@/lib/constants';
import { buildKitchenOrderWhatsAppMessage } from '@/lib/waha';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  Utensils,
  CheckCircle,
  RefreshCw,
  Search,
  MessageSquare,
  RotateCcw,
  Copy,
  Phone,
  Ban,
  Check,
  Sparkles,
} from 'lucide-react';

export default function AdminAntreanPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [activeTab, setActiveTab] = useState<
    'SEMUA' | 'PERLU_DITANGANI' | 'WA_GAGAL' | 'SELESAI' | 'BATAL'
  >('PERLU_DITANGANI');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [lastUpdated, setLastUpdated] = useState<string>('');

  // Modal Detail Order
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);

  // Modal Batalkan Pesanan
  const [isCancelModalOpen, setIsCancelModalOpen] = useState<boolean>(false);
  const [cancelReason, setCancelReason] = useState<string>('');

  // Modal Refund Manual
  const [isRefundModalOpen, setIsRefundModalOpen] = useState<boolean>(false);
  const [refundAmount, setRefundAmount] = useState<number>(0);
  const [refundReason, setRefundReason] = useState<string>('');
  const [refundStatus, setRefundStatus] = useState<RefundStatus>('FULL_REFUNDED');

  // Modal WhatsApp Preview
  const [isWaPreviewModalOpen, setIsWaPreviewModalOpen] = useState<boolean>(false);
  const [copiedDraft, setCopiedDraft] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const loadData = useCallback(() => {
    const ords = getOrders();
    const sett = getStoreSettings();
    const shfs = getShifts();
    setOrders(ords);
    setSettings(sett);
    setShifts(shfs);
    setLastUpdated(formatTimeWIB(Date.now()));
  }, []);

  useEffect(() => {
    loadData();

    // Auto-refresh setiap 20 detik (FR-47)
    const interval = setInterval(() => {
      loadData();
    }, 20000);

    const handleUpdate = () => {
      loadData();
    };

    window.addEventListener('storage', handleUpdate);
    window.addEventListener('pv_storage_update', handleUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('pv_storage_update', handleUpdate);
    };
  }, [loadData]);

  const updateOrderStatus = (orderId: string, nextStatus: OrderFulfillmentStatus) => {
    const updated = orders.map((o) => {
      if (o.id === orderId) {
        return {
          ...o,
          fulfillment: nextStatus,
          completedAt: nextStatus === 'COMPLETED' ? Date.now() : o.completedAt,
        };
      }
      return o;
    });
    setOrders(updated);
    saveOrders(updated);

    if (selectedOrder?.id === orderId) {
      setSelectedOrder((prev) =>
        prev
          ? {
              ...prev,
              fulfillment: nextStatus,
              completedAt: nextStatus === 'COMPLETED' ? Date.now() : prev.completedAt,
            }
          : null
      );
    }
    showToast(`Status pesanan berhasil diubah menjadi: ${nextStatus}`);
  };

  // Retry kirim notifikasi WA ke sif aktif (FR-35, FR-51)
  const handleRetryWhatsApp = (order: Order) => {
    const currentSettings = getStoreSettings();
    const updated = orders.map((o) => {
      if (o.id === order.id) {
        const isSuccess = currentSettings.waConnected;
        return {
          ...o,
          recipientShiftId: currentSettings.recipientShiftId || o.recipientShiftId,
          notification: (isSuccess ? 'SENT' : 'FAILED') as Order['notification'],
          attempts: (o.attempts || 1) + 1,
        };
      }
      return o;
    });

    setOrders(updated);
    saveOrders(updated);

    if (selectedOrder?.id === order.id) {
      const found = updated.find((it) => it.id === order.id) || null;
      setSelectedOrder(found);
    }

    if (currentSettings.waConnected) {
      showToast('Notifikasi WhatsApp berhasil dikirim ulang ke sif aktif.');
    } else {
      showToast('Pengiriman ulang gagal: simulasi koneksi WAHA sedang terputus.');
    }
  };

  // Buka form batalkan order
  const handleOpenCancelModal = (order: Order) => {
    setSelectedOrder(order);
    setCancelReason('');
    setIsCancelModalOpen(true);
  };

  // Konfirmasi pembatalan order
  const handleConfirmCancel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !cancelReason.trim()) return;

    const updated = orders.map((o) => {
      if (o.id === selectedOrder.id) {
        return {
          ...o,
          fulfillment: 'CANCELLED' as const,
          cancelReason: cancelReason.trim(),
          refund: {
            status: 'PENDING' as const,
            amount: o.total,
            reason: cancelReason.trim(),
          },
        };
      }
      return o;
    });

    setOrders(updated);
    saveOrders(updated);
    setSelectedOrder((prev) =>
      prev
        ? {
            ...prev,
            fulfillment: 'CANCELLED',
            cancelReason: cancelReason.trim(),
            refund: {
              status: 'PENDING',
              amount: prev.total,
              reason: cancelReason.trim(),
            },
          }
        : null
    );

    setIsCancelModalOpen(false);
    showToast('Pesanan dibatalkan. Status refund dicatat PENDING.');
  };

  // Buka form catat refund
  const handleOpenRefundModal = (order: Order) => {
    setSelectedOrder(order);
    setRefundAmount(order.refund?.amount || order.total);
    setRefundReason(order.refund?.reason || order.cancelReason || 'Bahan habis');
    setRefundStatus(order.refund?.status === 'PARTIAL_REFUNDED' ? 'PARTIAL_REFUNDED' : 'FULL_REFUNDED');
    setIsRefundModalOpen(true);
  };

  // Simpan record refund manual
  const handleSaveRefund = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    const updated = orders.map((o) => {
      if (o.id === selectedOrder.id) {
        return {
          ...o,
          refund: {
            status: refundStatus,
            amount: Number(refundAmount),
            reason: refundReason.trim(),
            confirmedAt: Date.now(),
          },
        };
      }
      return o;
    });

    setOrders(updated);
    saveOrders(updated);
    setSelectedOrder((prev) =>
      prev
        ? {
            ...prev,
            refund: {
              status: refundStatus,
              amount: Number(refundAmount),
              reason: refundReason.trim(),
              confirmedAt: Date.now(),
            },
          }
        : null
    );

    setIsRefundModalOpen(false);
    showToast('Pencatatan refund manual berhasil disimpan.');
  };

  // Salin draft chat siap ke pelanggan (FR-48)
  const handleCopyCustomerReadyDraft = (order: Order) => {
    const draftText = `Halo kak ${order.name}, pesanan ${order.number} dari Warmindo Putra Vangkalan sudah siap diambil di warung. Terima kasih banyak ya!`;
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(draftText);
      setCopiedDraft(true);
      setTimeout(() => setCopiedDraft(false), 2500);
      showToast('Draft pesan pelanggan berhasil disalin!');
    }
  };

  // Filter pesanan sesuai tab dan pencarian
  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.phone.includes(searchQuery);

    if (!matchesSearch) return false;

    if (activeTab === 'PERLU_DITANGANI') {
      return o.payment === 'PAID' && ['NEW', 'PREPARING', 'READY'].includes(o.fulfillment);
    }
    if (activeTab === 'WA_GAGAL') {
      return o.notification === 'FAILED';
    }
    if (activeTab === 'SELESAI') {
      return o.fulfillment === 'COMPLETED';
    }
    if (activeTab === 'BATAL') {
      return o.fulfillment === 'CANCELLED' || o.payment !== 'PAID';
    }
    return true; // SEMUA
  });

  const activeShift =
    shifts.find((s) => s.id === settings?.recipientShiftId) || shifts[0] || {
      id: 's1',
      name: 'Aa Iis',
      phone: '6281234500001',
    };

  const handleReloadSeeds = () => {
    seedDemoOrders();
    loadData();
    showToast('6 contoh pesanan demo berhasil dimuat ulang!');
  };

  const countNeedCooking = orders.filter(
    (o) => o.payment === 'PAID' && ['NEW', 'PREPARING'].includes(o.fulfillment)
  ).length;
  const countReady = orders.filter(
    (o) => o.payment === 'PAID' && o.fulfillment === 'READY'
  ).length;
  const countWaFailed = orders.filter(
    (o) => o.notification === 'FAILED'
  ).length;
  const countCompleted = orders.filter(
    (o) => o.fulfillment === 'COMPLETED'
  ).length;

  return (
    <div className="min-h-screen bg-paper py-6 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <AdminHeader />

        {toastMsg && (
          <div
            role="status"
            className="p-3 bg-brand-green text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-2 animate-fade-in"
          >
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* Ringkasan Statistik Cepat */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white p-3.5 rounded-2xl border border-border-line">
            <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted block">
              Perlu Dimasak
            </span>
            <strong className="text-xl font-black text-ink mt-0.5 block">
              {countNeedCooking}
            </strong>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-border-line">
            <span className="text-[11px] font-bold uppercase tracking-wider text-brand-green block">
              Siap Diambil
            </span>
            <strong className="text-xl font-black text-brand-green mt-0.5 block">
              {countReady}
            </strong>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-border-line">
            <span className="text-[11px] font-bold uppercase tracking-wider text-danger-red block">
              WA Gagal
            </span>
            <strong className="text-xl font-black text-danger-red mt-0.5 block">
              {countWaFailed}
            </strong>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-border-line">
            <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted block">
              Selesai Hari Ini
            </span>
            <strong className="text-xl font-black text-ink mt-0.5 block">
              {countCompleted}
            </strong>
          </div>
        </div>

        {/* Baris Kontrol Tab & Pencarian */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-border-line space-y-3.5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black text-ink">Antrean Pesanan Dapur</h2>
              <p className="text-xs text-text-muted mt-0.5">
                Data diperbarui: <strong>{lastUpdated} WIB</strong> (Auto-refresh aktif).
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleReloadSeeds}
                title="Muat ulang contoh data antrean demo"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1.5 text-brand-green" />
                <span>Muat Contoh Order</span>
              </Button>

              <Button variant="outline" size="sm" onClick={loadData}>
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                <span>Segarkan</span>
              </Button>
            </div>
          </div>

          {/* Filter Tab & Input Cari */}
          <div className="flex flex-col md:flex-row gap-3 pt-1">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 flex-1">
              {[
                { id: 'PERLU_DITANGANI' as const, label: 'Perlu Ditangani' },
                { id: 'WA_GAGAL' as const, label: 'WA Gagal' },
                { id: 'SELESAI' as const, label: 'Selesai' },
                { id: 'BATAL' as const, label: 'Batal / Refund' },
                { id: 'SEMUA' as const, label: 'Semua' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`min-h-[36px] px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer shrink-0 ${
                    activeTab === tab.id
                      ? 'bg-brand-green text-white border-brand-green'
                      : 'bg-paper text-text-muted hover:text-ink border-border-line'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative w-full md:w-64">
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nomor / nama..."
                className="w-full min-h-[38px] pl-9 pr-3 text-xs bg-paper border border-border-line rounded-xl focus:outline-none focus:border-brand-green"
              />
              <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Daftar Kartu Antrean */}
        {filteredOrders.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl border border-border-line text-center space-y-3">
            <Utensils className="w-12 h-12 text-text-muted mx-auto opacity-70" />
            <h3 className="text-base font-bold text-ink">Tidak Ada Pesanan</h3>
            <p className="text-xs text-text-muted max-w-sm mx-auto">
              Tidak ada pesanan yang sesuai dengan filter atau kata kunci saat ini.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => {
              const isPreparing = order.fulfillment === 'PREPARING';
              const isReady = order.fulfillment === 'READY';
              const isDone = order.fulfillment === 'COMPLETED';
              const isCancelled = order.fulfillment === 'CANCELLED';
              const isWaFailed = order.notification === 'FAILED';

              return (
                <article
                  key={order.id}
                  className={`bg-white rounded-2xl border p-5 space-y-4 shadow-xs transition-all ${
                    isWaFailed
                      ? 'border-danger-red/40 ring-1 ring-danger-red/20'
                      : 'border-border-line'
                  }`}
                >
                  {/* Baris Info Utama */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border-line pb-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-base text-ink">
                          {order.number}
                        </span>
                        <Badge
                          variant={order.payment === 'PAID' ? 'success' : 'warning'}
                          size="sm"
                        >
                          {order.payment}
                        </Badge>
                        {isWaFailed && (
                          <Badge variant="danger" size="sm">
                            WA Gagal
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-text-muted">
                        Pemesan: <strong className="text-ink">{order.name}</strong> ({order.phone})
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <span className="text-[11px] text-text-muted block">
                          Waktu Ambil (WIB)
                        </span>
                        <strong className="text-sm font-black text-brand-green">
                          {formatTimeWIB(order.pickup)}
                        </strong>
                      </div>

                      <a
                        href={`https://wa.me/${order.phone}`}
                        target="_blank"
                        rel="noreferrer"
                        className="w-8 h-8 rounded-lg bg-soft-green text-brand-green hover:bg-brand-green hover:text-white flex items-center justify-center transition-colors"
                        title="Chat WA Pelanggan"
                      >
                        <Phone className="w-4 h-4" />
                      </a>
                    </div>
                  </div>

                  {/* Rincian Menu Pesanan */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted block">
                      Rincian Masakan
                    </span>
                    <div className="divide-y divide-border-line">
                      {order.items.map((it, idx) => (
                        <div
                          key={idx}
                          className="py-1.5 flex justify-between items-center text-xs"
                        >
                          <div>
                            <span className="font-bold text-ink">
                              {it.qty}x {it.name}
                            </span>
                            <span className="text-text-muted ml-2">
                              {it.temp && `[${it.temp}] `}
                              {it.egg && '[+Telur] '}
                              {it.note && `("${it.note}")`}
                            </span>
                          </div>
                          <span className="font-semibold text-ink">
                            {formatRupiah(it.unit * it.qty)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {order.note && (
                      <p className="text-xs bg-amber-50 text-amber-900 p-2 rounded-lg border border-amber-200">
                        Catatan Order: {order.note}
                      </p>
                    )}
                  </div>

                  {/* Baris Aksi Pesanan */}
                  <div className="pt-2 border-t border-border-line flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedOrder(order);
                          setIsDetailModalOpen(true);
                        }}
                      >
                        <span>Aksi & Detail</span>
                      </Button>

                      {isWaFailed && (
                        <button
                          type="button"
                          onClick={() => handleRetryWhatsApp(order)}
                          className="min-h-[34px] px-3 py-1 bg-danger-red/10 hover:bg-danger-red/20 text-danger-red font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer border border-danger-red/20"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Kirim Ulang WA</span>
                        </button>
                      )}
                    </div>

                    {/* Tombol Perubahan Tahapan Status */}
                    {!isDone && !isCancelled && (
                      <div className="flex items-center gap-2">
                        {order.fulfillment === 'NEW' && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => updateOrderStatus(order.id, 'PREPARING')}
                          >
                            <Utensils className="w-3.5 h-3.5 mr-1" />
                            <span>Mulai Masak</span>
                          </Button>
                        )}

                        {isPreparing && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => updateOrderStatus(order.id, 'READY')}
                          >
                            <Check className="w-3.5 h-3.5 mr-1" />
                            <span>Siap Diambil</span>
                          </Button>
                        )}

                        {isReady && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => updateOrderStatus(order.id, 'COMPLETED')}
                          >
                            <CheckCircle className="w-3.5 h-3.5 mr-1" />
                            <span>Selesai Diambil</span>
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* Modal Detail & Aksi Order Lengkap */}
        {selectedOrder && (
          <Modal
            isOpen={isDetailModalOpen}
            onClose={() => setIsDetailModalOpen(false)}
            title={`Detail Pesanan: ${selectedOrder.number}`}
          >
            <div className="space-y-4">
              {/* Rincian Status */}
              <div className="p-3 bg-paper rounded-xl border border-border-line space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-text-muted">Status Pembayaran</span>
                  <strong className="text-ink">{selectedOrder.payment}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Status Dapur</span>
                  <strong className="text-brand-green">{selectedOrder.fulfillment}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Status Notifikasi WA</span>
                  <strong
                    className={
                      selectedOrder.notification === 'FAILED'
                        ? 'text-danger-red'
                        : 'text-brand-green'
                    }
                  >
                    {selectedOrder.notification} (Percobaan: {selectedOrder.attempts || 1})
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Target Jam Ambil</span>
                  <strong className="text-ink">
                    {formatTimeWIB(selectedOrder.pickup)} WIB ({formatDateTimeWIB(selectedOrder.pickup)})
                  </strong>
                </div>
              </div>

              {/* Aksi Cepat WhatsApp */}
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-text-muted">
                  Komunikasi & WhatsApp
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setIsWaPreviewModalOpen(true)}
                    className="p-2.5 bg-paper hover:bg-neutral-100 border border-border-line rounded-xl text-xs font-semibold text-ink flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-brand-green" />
                      <span>Lihat Pesan WA Penjaga</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCopyCustomerReadyDraft(selectedOrder)}
                    className="p-2.5 bg-paper hover:bg-neutral-100 border border-border-line rounded-xl text-xs font-semibold text-ink flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Copy className="w-4 h-4 text-brand-green" />
                      <span>{copiedDraft ? 'Tersalin!' : 'Salin Chat Siap Ambil'}</span>
                    </div>
                  </button>
                </div>

                {selectedOrder.notification === 'FAILED' && (
                  <Button
                    variant="outline"
                    size="sm"
                    fullWidth
                    onClick={() => handleRetryWhatsApp(selectedOrder)}
                    className="text-danger-red border-danger-red/30 hover:bg-danger-red/10"
                  >
                    <RotateCcw className="w-4 h-4 mr-1.5" />
                    <span>Kirim Ulang Notifikasi WA ke Sif Aktif</span>
                  </Button>
                )}
              </div>

              {/* Penanganan Masalah & Refund */}
              <div className="pt-2 border-t border-border-line space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-text-muted">
                  Penanganan Masalah & Refund
                </p>

                {selectedOrder.fulfillment !== 'CANCELLED' && (
                  <Button
                    variant="danger"
                    size="sm"
                    fullWidth
                    onClick={() => {
                      setIsDetailModalOpen(false);
                      handleOpenCancelModal(selectedOrder);
                    }}
                  >
                    <Ban className="w-4 h-4 mr-1.5" />
                    <span>Batalkan Pesanan (Bahan Habis)</span>
                  </Button>
                )}

                {selectedOrder.refund && (
                  <div className="p-3 bg-neutral-50 rounded-xl border border-border-line space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-text-muted">Pencatatan Refund</span>
                      <Badge
                        variant={
                          selectedOrder.refund.status === 'FULL_REFUNDED'
                            ? 'success'
                            : 'warning'
                        }
                        size="sm"
                      >
                        {selectedOrder.refund.status}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-text-muted">
                      Nominal: <strong>{formatRupiah(selectedOrder.refund.amount)}</strong> · Alasan: {selectedOrder.refund.reason}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      fullWidth
                      onClick={() => {
                        setIsDetailModalOpen(false);
                        handleOpenRefundModal(selectedOrder);
                      }}
                    >
                      <span>Perbarui Catatan Refund Manual</span>
                    </Button>
                  </div>
                )}
              </div>

              <div className="text-right pt-2 border-t border-border-line">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsDetailModalOpen(false)}
                >
                  Tutup
                </Button>
              </div>
            </div>
          </Modal>
        )}

        {/* Modal Batalkan Pesanan */}
        <Modal
          isOpen={isCancelModalOpen}
          onClose={() => setIsCancelModalOpen(false)}
          title="Batalkan Pesanan"
        >
          <form onSubmit={handleConfirmCancel} className="space-y-4">
            <div className="p-3 bg-danger-red/10 border border-danger-red/20 rounded-xl text-danger-red text-xs">
              Pembatalan tidak mentransfer uang otomatis. Hubungi pelanggan via WhatsApp untuk nomor rekening dan catat refund manual.
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-ink">
                Alasan Pembatalan <span className="text-danger-red">*</span>
              </label>
              <textarea
                rows={3}
                required
                maxLength={200}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Contoh: Stok mie soto habis dan pelanggan konfirmasi batal."
                className="w-full p-3 text-xs bg-white border border-border-line rounded-xl focus:outline-none focus:border-danger-red"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCancelModalOpen(false)}
              >
                Kembali
              </Button>
              <Button type="submit" variant="danger" size="sm">
                Konfirmasi Batalkan
              </Button>
            </div>
          </form>
        </Modal>

        {/* Modal Catat Refund Manual */}
        <Modal
          isOpen={isRefundModalOpen}
          onClose={() => setIsRefundModalOpen(false)}
          title="Pencatatan Refund Manual"
        >
          <form onSubmit={handleSaveRefund} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-ink">
                Nominal Pengembalian Dana (Rp) <span className="text-danger-red">*</span>
              </label>
              <input
                type="number"
                min={0}
                required
                value={refundAmount}
                onChange={(e) => setRefundAmount(Number(e.target.value))}
                className="w-full min-h-[44px] px-3.5 text-xs bg-white border border-border-line rounded-xl focus:outline-none focus:border-brand-green"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-ink">
                Status Transfer Penjaga
              </label>
              <select
                value={refundStatus}
                onChange={(e) => setRefundStatus(e.target.value as RefundStatus)}
                className="w-full min-h-[44px] px-3.5 text-xs bg-white border border-border-line rounded-xl focus:outline-none focus:border-brand-green"
              >
                <option value="PENDING">Pending (Belum Ditransfer)</option>
                <option value="FULL_REFUNDED">Sudah Ditransfer Penuh (Lunas)</option>
                <option value="PARTIAL_REFUNDED">Sudah Ditransfer Sebagian</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-ink">
                Keterangan / Alasan Refund
              </label>
              <input
                type="text"
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="Contoh: Ditransfer via BCA ke pelanggan"
                className="w-full min-h-[44px] px-3.5 text-xs bg-white border border-border-line rounded-xl focus:outline-none focus:border-brand-green"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsRefundModalOpen(false)}
              >
                Batal
              </Button>
              <Button type="submit" variant="primary" size="sm">
                Simpan Catatan Refund
              </Button>
            </div>
          </form>
        </Modal>

        {/* Modal WhatsApp Preview Format PRD */}
        {selectedOrder && (
          <Modal
            isOpen={isWaPreviewModalOpen}
            onClose={() => setIsWaPreviewModalOpen(false)}
            title="Preview Pesan WhatsApp ke Penjaga Sif"
          >
            <div className="space-y-4">
              <div className="p-4 bg-paper rounded-xl border border-border-line font-mono text-xs whitespace-pre-wrap leading-relaxed text-ink select-all">
                {buildKitchenOrderWhatsAppMessage(selectedOrder, activeShift)}
              </div>

              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsWaPreviewModalOpen(false)}
                >
                  Tutup Preview
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
}
