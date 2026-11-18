'use client';

import { PAYMENT_BADGE } from '@/lib/statusLabels';
import { demoToolsEnabled } from '@/services/client';
import { makeSaveGuard, serverErrorMessage } from '@/lib/saveGuard';
import { ServerErrorNotice } from '@/components/ui/ServerErrorNotice';
import React, { useState, useCallback } from 'react';
import {
  Order,
  OrderFulfillmentStatus,
  Shift,
  StoreSettings,
  RefundStatus,
} from '@/types';
import { orderService } from '@/services/orders';
import { settingsService } from '@/services/settings';
import { useAutoPolling } from '@/hooks/useAutoPolling';
import { formatTimeWIB, formatDateTimeWIB, formatRupiah, formatPhone } from '@/lib/constants';
import { buildKitchenOrderWhatsAppMessage } from '@/lib/waha';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Button, buttonClass } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { Tabs } from '@/components/ui/Tabs';
import { EmptyState } from '@/components/ui/EmptyState';
import { inputClass, textareaClass } from '@/components/ui/styles';
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
  Clock,
} from 'lucide-react';

/** FAILED = pasti tidak terkirim; UNKNOWN = hasil tak jelas. Keduanya butuh perhatian penjaga. */
const waNeedsAttention = (o: Pick<Order, 'notification'>) =>
  o.notification === 'FAILED' || o.notification === 'UNKNOWN';

export default function AdminAntreanPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [activeTab, setActiveTab] = useState<
    'PERLU_DITANGANI' | 'SEMUA' | 'WA_GAGAL' | 'SELESAI' | 'BATAL'
  >('PERLU_DITANGANI');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [loadError, setLoadError] = useState<string | null>(null);

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

  const loadData = useCallback(async () => {
    try {
      const [ords, sett, shfs] = await Promise.all([
        orderService.getOrders(),
        settingsService.getStoreSettings(),
        settingsService.getShifts(),
      ]);
      setOrders(ords);
      setSettings(sett);
      setShifts(shfs);
      setLastUpdated(formatTimeWIB(Date.now()));
      setLoadError(null);
      setSelectedOrder((prev) =>
        prev ? ords.find((o) => o.id === prev.id) || prev : null
      );
    } catch (err) {
      console.warn('[antrean] Gagal memuat data antrean:', err);
      setLoadError(serverErrorMessage(err));
    }
  }, []);

  // Auto-polling hook setiap 12 detik sesuai PRD FR-47
  const { isPolling, refresh } = useAutoPolling(loadData, {
    intervalMs: 12000,
    enabled: true,
    immediate: true,
    listenStorage: true,
  });

  const updateOrderStatus = async (
    orderId: string,
    nextStatus: OrderFulfillmentStatus,
    customNotificationMessage?: string
  ) => {
    try {
      const updated = await orderService.updateOrderStatus(orderId, nextStatus);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(updated);
      }
      if (customNotificationMessage) {
        showToast(customNotificationMessage);
      } else {
        showToast(`Status pesanan berhasil diperbarui: ${nextStatus}`);
      }
    } catch (err) {
      console.error('Gagal update status pesanan:', err);
      showToast('Gagal memperbarui status pesanan.');
    }
  };

  // Retry kirim notifikasi WA ke sif aktif (FR-35, FR-51)
  const handleRetryWhatsApp = async (order: Order) => {
    try {
      const updated = await orderService.retryWhatsApp(order.id);
      setOrders((prev) => prev.map((o) => (o.id === order.id ? updated : o)));
      if (selectedOrder?.id === order.id) {
        setSelectedOrder(updated);
      }
      if (updated.notification === 'SENT') {
        showToast('Notifikasi WhatsApp berhasil dikirim ulang ke sif aktif.');
      } else if (updated.notification === 'UNKNOWN') {
        showToast('Hasil pengiriman belum pasti. Periksa WhatsApp sebelum mengirim ulang lagi.');
      } else {
        const why = updated.notificationDetail?.lastError;
        showToast(`Pengiriman ulang belum berhasil${why ? `: ${why}` : '. Periksa koneksi WAHA.'}`);
      }
    } catch (err) {
      console.error('Gagal retry WA:', err);
      showToast('Gagal mengirim ulang notifikasi WhatsApp.');
    }
  };

  // Buka form batalkan order
  const handleOpenCancelModal = (order: Order) => {
    setSelectedOrder(order);
    setCancelReason('');
    setIsCancelModalOpen(true);
  };

  // Konfirmasi pembatalan order
  const handleConfirmCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !cancelReason.trim()) return;

    try {
      const updated = await orderService.cancelOrder(
        selectedOrder.id,
        cancelReason.trim()
      );
      setOrders((prev) => prev.map((o) => (o.id === selectedOrder.id ? updated : o)));
      setSelectedOrder(updated);
      setIsCancelModalOpen(false);
      showToast('Pesanan dibatalkan. Status refund dicatat PENDING.');
    } catch (err) {
      console.error('Gagal membatalkan pesanan:', err);
      showToast('Gagal membatalkan pesanan.');
    }
  };

  // Buka form catat refund
  const handleOpenRefundModal = (order: Order) => {
    setSelectedOrder(order);
    setRefundAmount(order.refund?.amount || order.total);
    setRefundReason(order.refund?.reason || order.cancelReason || 'Bahan habis');
    setRefundStatus(
      order.refund?.status === 'PARTIAL_REFUNDED'
        ? 'PARTIAL_REFUNDED'
        : 'FULL_REFUNDED'
    );
    setIsRefundModalOpen(true);
  };

  // Simpan record refund manual
  const handleSaveRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    try {
      const updated = await orderService.recordRefund(selectedOrder.id, {
        status: refundStatus,
        amount: Number(refundAmount),
        reason: refundReason.trim(),
      });
      setOrders((prev) => prev.map((o) => (o.id === selectedOrder.id ? updated : o)));
      setSelectedOrder(updated);
      setIsRefundModalOpen(false);
      showToast('Pencatatan refund manual berhasil disimpan.');
    } catch (err) {
      console.error('Gagal menyimpan refund:', err);
      showToast('Gagal menyimpan refund.');
    }
  };

  // Salin draft chat siap ke pelanggan (FR-48)
  const handleCopyCustomerReadyDraft = (order: Order) => {
    const draftText = `Halo kak ${order.name}, pesanan ${order.number} dari Warmindo Putra Vangkalan sudah siap diambil di warung. Terima kasih banyak ya!`;
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(draftText);
      setCopiedDraft(true);
      setTimeout(() => setCopiedDraft(false), 2500);
      showToast('Draft pesan pelanggan berhasil disalin ke clipboard.');
    }
  };

  // Salin draft pesan WA penjaga
  const handleCopyShiftDraft = (order: Order, shift: Shift) => {
    const draftText = buildKitchenOrderWhatsAppMessage(order, shift);
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(draftText);
      showToast('Pesan WA penjaga sif berhasil disalin.');
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
      return (
        o.payment === 'PAID' && ['NEW', 'PREPARING', 'READY'].includes(o.fulfillment)
      );
    }
    if (activeTab === 'WA_GAGAL') {
      return waNeedsAttention(o);
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
    shifts.find((s) => s.id === settings?.recipientShiftId) ||
    shifts[0] || {
      id: 's1',
      name: 'Aa Iis',
      phone: '6281234500001',
    };

  const guard = makeSaveGuard(showToast, loadData);

  const handleReloadSeeds = guard(async () => {
    await orderService.seedDemoOrders();
    await loadData();
    showToast('6 pesanan demo dapur berhasil dimuat ulang.');
  });

  const countWaFailed = orders.filter(waNeedsAttention).length;

  // Hitungan tab filter
  const tabCounts = {
    PERLU_DITANGANI: orders.filter(
      (o) => o.payment === 'PAID' && ['NEW', 'PREPARING', 'READY'].includes(o.fulfillment)
    ).length,
    SEMUA: orders.length,
    WA_GAGAL: countWaFailed,
    SELESAI: orders.filter((o) => o.fulfillment === 'COMPLETED').length,
    BATAL: orders.filter((o) => o.fulfillment === 'CANCELLED' || o.payment !== 'PAID').length,
  };

  return (
    <div>
      <div className="space-y-6 sm:space-y-8">

        {/* Floating Feedback Toast */}
        {toastMsg && (
          <div
            role="status"
            className="p-3.5 bg-ink text-white text-xs font-bold rounded-2xl shadow-dropdown flex items-center gap-2.5 animate-fade-in border border-line/20"
          >
            <CheckCircle className="w-4 h-4 text-gold shrink-0" />
            <span>{toastMsg}</span>
          </div>
        )}

        <PageHeader
          title="Antrean Dapur"
          description="Pantau pesanan masuk, tahapan memasak, dan koordinasi dengan sif bertugas secara real-time."
          actions={
            <>
              {demoToolsEnabled() && (
                <Button variant="outline" size="sm" onClick={handleReloadSeeds} title="Muat ulang contoh data antrean demo">
                  <Sparkles className="w-4 h-4 text-gold" />
                  Muat Data Demo
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={refresh} title={`Pembaruan terakhir ${lastUpdated} WIB`}>
                <RefreshCw className={`w-4 h-4 text-icon ${isPolling ? 'animate-spin' : ''}`} />
                {lastUpdated ? `Perbarui (${lastUpdated})` : 'Perbarui'}
              </Button>
            </>
          }
        />

        {/* Search and Filter Band */}
        <div className="bg-white border border-line rounded-2xl p-4 sm:p-5 shadow-card space-y-3.5">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3.5">
            <Tabs
              ariaLabel="Filter antrean"
              className="flex-1"
              value={activeTab}
              onChange={setActiveTab}
              items={[
                { value: 'PERLU_DITANGANI', label: 'Perlu Ditangani', count: tabCounts.PERLU_DITANGANI },
                { value: 'SEMUA', label: 'Semua', count: tabCounts.SEMUA },
                { value: 'WA_GAGAL', label: 'WA Gagal', count: tabCounts.WA_GAGAL },
                { value: 'SELESAI', label: 'Selesai', count: tabCounts.SELESAI },
                { value: 'BATAL', label: 'Batal', count: tabCounts.BATAL },
              ]}
            />

            {/* Pill Search Input */}
            <div className="relative w-full lg:w-72 shrink-0">
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nomor antrean atau pemesan..."
                className={`${inputClass} pl-10`}
              />
              <Search className="w-4 h-4 text-icon absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {loadError && (
          <ServerErrorNotice
            title="Antrean gagal dimuat dari server"
            message={
              <>
                {loadError}{' '}
                {lastUpdated
                  ? `Daftar di bawah adalah data terakhir pukul ${lastUpdated} WIB dan mungkin sudah berubah.`
                  : 'Belum ada data yang berhasil dimuat.'}{' '}
                Jangan memasak berdasarkan daftar lama; muat ulang setelah koneksi pulih.
              </>
            }
            onRetry={refresh}
          />
        )}

        {/* Queue Order Cards List */}
        {loadError && orders.length === 0 ? null : filteredOrders.length === 0 ? (
          <EmptyState
            icon={Utensils}
            title="Tidak ada pesanan"
            description="Belum ada pesanan yang sesuai dengan filter atau kata kunci ini."
            action={
              demoToolsEnabled() ? (
                <Button size="sm" onClick={handleReloadSeeds}>
                  <Sparkles className="w-4 h-4" />
                  Muat Data Demo Dapur
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => {
              const isPreparing = order.fulfillment === 'PREPARING';
              const isReady = order.fulfillment === 'READY';
              const isDone = order.fulfillment === 'COMPLETED';
              const isCancelled = order.fulfillment === 'CANCELLED';
              const isWaFailed = waNeedsAttention(order);

              return (
                <article
                  key={order.id}
                  className={`bg-white border rounded-2xl p-5 shadow-card space-y-4 hover:border-gold/60 transition-all ${
                    isWaFailed
                      ? 'border-danger/40 ring-1 ring-danger/20'
                      : 'border-line'
                  }`}
                >
                  {/* Order Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line-soft pb-3.5">
                    <div className="space-y-1">
                      <div className="flex items-center flex-wrap gap-2">
                        <span className="font-mono font-black text-base sm:text-lg text-ink tracking-tight">
                          {order.number}
                        </span>

                        {/* Status Pembayaran */}
                        <Badge variant={PAYMENT_BADGE[order.payment].variant} size="sm">
                          {PAYMENT_BADGE[order.payment].text}
                        </Badge>

                        {/* Status Dapur */}
                        {order.fulfillment === 'NEW' && (
                          <Badge variant="warning" size="sm">
                            Perlu Dimasak
                          </Badge>
                        )}
                        {order.fulfillment === 'PREPARING' && (
                          <Badge variant="gold" size="sm">
                            Sedang Dimasak
                          </Badge>
                        )}
                        {order.fulfillment === 'READY' && (
                          <Badge variant="success" size="sm">
                            Siap Diambil
                          </Badge>
                        )}
                        {order.fulfillment === 'COMPLETED' && (
                          <Badge variant="neutral" size="sm">
                            Selesai
                          </Badge>
                        )}
                        {order.fulfillment === 'CANCELLED' && (
                          <Badge variant="danger" size="sm">
                            Dibatalkan
                          </Badge>
                        )}

                        {/* Status WA Gagal */}
                        {isWaFailed && (
                          <Badge variant="danger" size="sm">
                            {order.notification === 'UNKNOWN' ? 'WA Belum Pasti' : 'WA Gagal'}
                          </Badge>
                        )}
                      </div>

                      <p className="text-xs text-muted">
                        Pemesan: <strong className="text-ink font-semibold">{order.name}</strong> · <span className="tabular-nums">{formatPhone(order.phone)}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      {/* Warm Tag Waktu Ambil */}
                      <div
                        className="inline-flex items-center gap-1.5 bg-canvas border border-line px-3 py-1.5 rounded-full text-xs font-semibold text-ink"
                        title={`Pesanan ditargetkan siap pada ${formatDateTimeWIB(order.pickup)}`}
                      >
                        <Clock className="w-3.5 h-3.5 text-icon" />
                        <span>Ambil: {formatTimeWIB(order.pickup)} WIB</span>
                      </div>

                      {order.needsTimeConfirmation &&
                        order.fulfillment !== 'COMPLETED' &&
                        order.fulfillment !== 'CANCELLED' && (
                          <span
                            className="inline-flex items-center bg-danger-soft border border-danger-line px-3 py-1.5 rounded-full text-xs font-bold text-danger-ink"
                            title="Pembayaran masuk terlambat; waktu ambil terjadwal mungkin tidak terkejar. Hubungi pelanggan."
                          >
                            Perlu konfirmasi waktu
                          </span>
                        )}

                      {/* Shortcut Chat WhatsApp Pelanggan */}
                      <a
                        href={`https://wa.me/${order.phone}`}
                        target="_blank"
                        rel="noreferrer"
                        className="min-w-[44px] min-h-11 rounded-full bg-white hover:bg-canvas border border-line text-success-ink hover:text-success-ink flex items-center justify-center transition-all shadow-xs"
                        title="Chat WA Pelanggan"
                        aria-label="Chat WhatsApp Pelanggan"
                      >
                        <Phone className="w-4 h-4" />
                      </a>
                    </div>
                  </div>

                  {/* Cooking Details / Rincian Masakan */}
                  <div className="bg-canvas/40 rounded-2xl p-3.5 border border-line-soft space-y-2.5">
                    <span className="text-2xs font-semibold uppercase tracking-wider text-muted block">
                      Rincian Masakan
                    </span>

                    <div className="divide-y divide-line-soft">
                      {order.items.map((it, idx) => (
                        <div
                          key={idx}
                          className="py-2 first:pt-0 last:pb-0 flex justify-between items-center text-xs"
                        >
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-ink bg-white border border-line px-2.5 py-0.5 rounded-full text-2xs shrink-0">
                              {it.qty}x
                            </span>
                            <span className="font-semibold text-ink">
                              {it.name}
                            </span>
                            <span className="text-muted">
                              {it.temp && `[${it.temp}] `}
                              {it.egg && '[+Telur] '}
                              {it.note && `("${it.note}")`}
                            </span>
                          </div>

                          <span className="font-bold text-ink shrink-0 ml-2">
                            {formatRupiah(it.unit * it.qty)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {order.note && (
                      <div className="text-xs bg-gold-soft text-gold-ink p-3 rounded-2xl border border-gold-line flex items-start gap-2">
                        <MessageSquare className="w-4 h-4 shrink-0 mt-0.5 text-gold-ink" />
                        <span>
                          <strong>Catatan Pemesan:</strong> {order.note}
                        </span>
                      </div>
                    )}

                    <div className="pt-1.5 flex justify-end text-xs text-muted">
                      <span>Total: <strong className="text-ink">{formatRupiah(order.total)}</strong></span>
                    </div>
                  </div>

                  {/* Action Buttons Band */}
                  <div className="pt-2 border-t border-line-soft flex flex-wrap items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2 flex-wrap">
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

                      {/* Tombol Salin Draf Pesan WA */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyCustomerReadyDraft(order)}
                        title="Salin draf chat WhatsApp pesanan siap diambil"
                      >
                        <Copy className="w-4 h-4 text-icon" />
                        <span>Salin Draf WA</span>
                      </Button>

                      {/* Retry WA if failed */}
                      {isWaFailed && (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleRetryWhatsApp(order)}
                        >
                          <RotateCcw className="w-4 h-4" />
                          <span>Kirim Ulang WA</span>
                        </Button>
                      )}
                    </div>

                    {/* Operational Lifecycle Action Buttons */}
                    {!isDone && !isCancelled && (
                      <div className="flex items-center gap-2">
                        {order.fulfillment === 'NEW' && (
                          <Button
                            variant="gold"
                            size="sm"
                            onClick={() =>
                              updateOrderStatus(
                                order.id,
                                'PREPARING',
                                `Pesanan ${order.number} mulai dimasak di kompor dapur.`
                              )
                            }
                          >
                            <Utensils className="w-4 h-4" />
                            <span>Mulai Masak</span>
                          </Button>
                        )}

                        {isPreparing && (
                          <Button
                            variant="gold"
                            size="sm"
                            onClick={() => {
                              updateOrderStatus(
                                order.id,
                                'READY',
                                `Pesanan ${order.number} siap diambil. Draf notifikasi siap diteruskan ke pelanggan!`
                              );
                            }}
                          >
                            <Check className="w-4 h-4" />
                            <span>Tandai Siap Ambil</span>
                          </Button>
                        )}

                        {isReady && (
                          <Button
                            variant="gold"
                            size="sm"
                            onClick={() =>
                              updateOrderStatus(
                                order.id,
                                'COMPLETED',
                                `Pesanan ${order.number} telah diserahkan dan selesai.`
                              )
                            }
                          >
                            <CheckCircle className="w-4 h-4" />
                            <span>Pesanan Diambil (Selesai)</span>
                          </Button>
                        )}
                      </div>
                    )}

                    {isDone && (
                      <span className="text-xs font-semibold text-success-ink flex items-center gap-1.5 bg-success-soft px-3.5 py-1.5 rounded-full border border-success-line">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Pesanan Selesai Diambil</span>
                      </span>
                    )}

                    {isCancelled && (
                      <span className="text-xs font-semibold text-danger-ink flex items-center gap-1.5 bg-danger-soft px-3.5 py-1.5 rounded-full border border-danger-line">
                        <Ban className="w-3.5 h-3.5" />
                        <span>Pesanan Dibatalkan</span>
                      </span>
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
              <div className="p-3.5 bg-canvas rounded-2xl border border-line space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-muted">Status Pembayaran</span>
                  <Badge
                    variant={selectedOrder.payment === 'PAID' ? 'success' : 'warning'}
                    size="sm"
                  >
                    {selectedOrder.payment}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted">Status Dapur</span>
                  <Badge variant="gold" size="sm">
                    {selectedOrder.fulfillment}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted">Status Notifikasi WA</span>
                  <strong
                    className={
                      waNeedsAttention(selectedOrder) ? 'text-danger-ink' : 'text-success-ink'
                    }
                  >
                    {selectedOrder.notification} (Percobaan: {selectedOrder.attempts || 1})
                  </strong>
                </div>
                {selectedOrder.notificationDetail && (
                  <div className="text-xs text-muted bg-canvas border border-line rounded-2xl p-3 space-y-1">
                    {selectedOrder.notificationDetail.recipientName && (
                      <p>
                        Penerima:{' '}
                        <strong className="text-ink">
                          {selectedOrder.notificationDetail.recipientName}
                        </strong>{' '}
                        ({selectedOrder.notificationDetail.recipientPhone})
                      </p>
                    )}
                    {selectedOrder.notificationDetail.lastError && (
                      <p className="text-danger-ink">{selectedOrder.notificationDetail.lastError}</p>
                    )}
                    {selectedOrder.notificationDetail.nextAttemptAt && (
                      <p>
                        Percobaan otomatis berikutnya sekitar{' '}
                        {formatTimeWIB(selectedOrder.notificationDetail.nextAttemptAt)} WIB.
                      </p>
                    )}
                    {selectedOrder.notification === 'UNKNOWN' && (
                      <p className="font-semibold text-ink">
                        Pesan mungkin sudah terkirim. Cek WhatsApp penerima dulu; sistem juga memeriksa
                        riwayat otomatis sebelum mengirim ulang.
                      </p>
                    )}
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-muted">Target Jam Ambil</span>
                  <strong className="text-ink">
                    {formatTimeWIB(selectedOrder.pickup)} WIB ({formatDateTimeWIB(selectedOrder.pickup)})
                  </strong>
                </div>
              </div>

              {/* Aksi Cepat WhatsApp */}
              <div className="space-y-2">
                <p className="text-2xs font-semibold uppercase tracking-wider text-muted">
                  Komunikasi & WhatsApp
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setIsWaPreviewModalOpen(true)}
                    className={buttonClass('outline', 'sm', 'justify-between')}
                  >
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-icon" />
                      <span>Lihat Pesan WA Penjaga</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCopyCustomerReadyDraft(selectedOrder)}
                    className={buttonClass('outline', 'sm', 'justify-between')}
                  >
                    <div className="flex items-center gap-2">
                      <Copy className="w-4 h-4 text-icon" />
                      <span>{copiedDraft ? 'Tersalin!' : 'Salin Chat Siap Ambil'}</span>
                    </div>
                  </button>
                </div>

                {waNeedsAttention(selectedOrder) && (
                  <Button
                    variant="danger"
                    size="sm"
                    fullWidth
                    onClick={() => handleRetryWhatsApp(selectedOrder)}
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Kirim Ulang Notifikasi WA ke Sif Aktif</span>
                  </Button>
                )}
              </div>

              {/* Penanganan Masalah & Refund */}
              <div className="pt-2 border-t border-line-soft space-y-2">
                <p className="text-2xs font-semibold uppercase tracking-wider text-muted">
                  Penanganan Masalah & Pembatalan
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
                    <Ban className="w-4 h-4" />
                    <span>Batalkan Pesanan (Bahan Habis)</span>
                  </Button>
                )}

                {selectedOrder.refund && (
                  <div className="p-3.5 bg-canvas rounded-2xl border border-line space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-muted">Pencatatan Refund</span>
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
                    <p className="text-2xs text-muted">
                      Nominal: <strong className="text-ink">{formatRupiah(selectedOrder.refund.amount)}</strong> (Alasan: {selectedOrder.refund.reason})
                    </p>
                    <Button
                      variant="gold"
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

              <div className="text-right pt-2 border-t border-line-soft">
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
            <div className="p-3.5 bg-danger-soft border border-danger-line rounded-2xl text-danger-ink text-xs leading-relaxed">
              Pembatalan tidak mentransfer uang otomatis. Hubungi pemesan via WhatsApp untuk nomor rekening pelanggan dan catat refund manual.
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink">
                Alasan Pembatalan <span className="text-danger">*</span>
              </label>
              <textarea
                rows={3}
                required
                maxLength={200}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Contoh: Stok mie soto habis dan pelanggan konfirmasi batal."
                className={`${textareaClass} resize-none`}
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
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
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink">
                Nominal Pengembalian Dana (Rp) <span className="text-danger">*</span>
              </label>
              <input
                type="number"
                min={0}
                required
                value={refundAmount}
                onChange={(e) => setRefundAmount(Number(e.target.value))}
                className={inputClass}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink">
                Status Transfer Penjaga
              </label>
              <select
                value={refundStatus}
                onChange={(e) => setRefundStatus(e.target.value as RefundStatus)}
                className={inputClass}
              >
                <option value="PENDING">Pending (Belum Ditransfer)</option>
                <option value="FULL_REFUNDED">Sudah Ditransfer Penuh (Lunas)</option>
                <option value="PARTIAL_REFUNDED">Sudah Ditransfer Sebagian</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink">
                Keterangan atau Alasan Refund
              </label>
              <input
                type="text"
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="Contoh: Ditransfer via BCA ke pelanggan"
                className={inputClass}
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsRefundModalOpen(false)}
              >
                Batal
              </Button>
              <Button type="submit" variant="gold" size="sm">
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
              <div className="p-4 bg-canvas rounded-2xl border border-line font-mono text-xs whitespace-pre-wrap leading-relaxed text-ink select-all">
                {buildKitchenOrderWhatsAppMessage(selectedOrder, activeShift)}
              </div>

              <div className="flex justify-end gap-2.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsWaPreviewModalOpen(false)}
                >
                  Tutup
                </Button>
                <Button
                  variant="gold"
                  size="sm"
                  onClick={() => handleCopyShiftDraft(selectedOrder, activeShift)}
                >
                  <Copy className="w-4 h-4" />
                  <span>Salin Pesan WA</span>
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
}
