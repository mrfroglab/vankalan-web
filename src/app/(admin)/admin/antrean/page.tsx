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
  Clock,
} from 'lucide-react';

export default function AdminAntreanPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [activeTab, setActiveTab] = useState<
    'PERLU_DITANGANI' | 'SEMUA' | 'WA_GAGAL' | 'SELESAI' | 'BATAL'
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

  const updateOrderStatus = (
    orderId: string,
    nextStatus: OrderFulfillmentStatus,
    customNotificationMessage?: string
  ) => {
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

    if (customNotificationMessage) {
      showToast(customNotificationMessage);
    } else {
      showToast(`Status pesanan berhasil diperbarui: ${nextStatus}`);
    }
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
    setRefundStatus(
      order.refund?.status === 'PARTIAL_REFUNDED'
        ? 'PARTIAL_REFUNDED'
        : 'FULL_REFUNDED'
    );
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
    shifts.find((s) => s.id === settings?.recipientShiftId) ||
    shifts[0] || {
      id: 's1',
      name: 'Aa Iis',
      phone: '6281234500001',
    };

  const handleReloadSeeds = () => {
    seedDemoOrders();
    loadData();
    showToast('6 pesanan demo dapur berhasil dimuat ulang.');
  };

  const countWaFailed = orders.filter(
    (o) => o.notification === 'FAILED'
  ).length;

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
    <div className="min-h-screen bg-[#f5f2ed] py-6 sm:py-8 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8">
        {/* Navigation Bar */}
        <AdminHeader />

        {/* Floating Feedback Toast */}
        {toastMsg && (
          <div
            role="status"
            className="p-3.5 bg-[#242321] text-white text-xs font-bold rounded-2xl shadow-dropdown flex items-center gap-2.5 animate-fade-in border border-[#e9e5df]/20"
          >
            <CheckCircle className="w-4 h-4 text-[#f5c943] shrink-0" />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* Page Intro Heading & Quick Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold font-editorial text-[#242321] tracking-tight">
              Antrean Dapur
            </h1>
            <p className="text-xs sm:text-sm text-[#68645e] mt-1">
              Pantau antrean pesanan masuk, tahapan memasak, dan koordinasi dengan sif bertugas secara real-time.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReloadSeeds}
              title="Muat ulang contoh data antrean demo"
              className="bg-white hover:bg-[#f5f2ed] border-[#e9e5df] text-[#242321] rounded-full"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5 text-[#f5c943]" />
              <span>Muat Data Demo</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              title={`Pembaruan terakhir ${lastUpdated} WIB`}
              className="bg-white hover:bg-[#f5f2ed] border-[#e9e5df] text-[#242321] rounded-full"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5 text-[#77736d]" />
              <span>Refresh Cepat ({lastUpdated || 'WIB'})</span>
            </Button>
          </div>
        </div>

        {/* Search and Filter Band */}
        <div className="bg-white border border-[#e9e5df] rounded-2xl p-4 sm:p-5 shadow-card space-y-3.5">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3.5">
            {/* Filter Chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 flex-1">
              {[
                { id: 'PERLU_DITANGANI' as const, label: 'Perlu Ditangani' },
                { id: 'SEMUA' as const, label: 'Semua' },
                { id: 'WA_GAGAL' as const, label: 'WA Gagal' },
                { id: 'SELESAI' as const, label: 'Selesai' },
                { id: 'BATAL' as const, label: 'Batal' },
              ].map((tab) => {
                const isSelected = activeTab === tab.id;
                const count = tabCounts[tab.id];

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`min-h-[44px] px-3.5 sm:px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                      isSelected
                        ? 'bg-[#f5c943] text-[#242321] border border-[#f5c943] shadow-xs'
                        : 'bg-white text-[#68645e] hover:text-[#242321] border border-[#e9e5df] hover:bg-[#f5f2ed]'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                        isSelected
                          ? 'bg-[#242321] text-white'
                          : 'bg-[#f5f2ed] text-[#68645e]'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Pill Search Input */}
            <div className="relative w-full lg:w-72 shrink-0">
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nomor antrean atau pemesan..."
                className="w-full min-h-[44px] pl-10 pr-4 text-xs bg-white border border-[#e9e5df] rounded-full focus:outline-none focus:border-[#f5c943] shadow-xs text-[#242321] placeholder-[#918c84] transition-all"
              />
              <Search className="w-4 h-4 text-[#77736d] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Queue Order Cards List */}
        {filteredOrders.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-[#e9e5df] text-center space-y-3 shadow-card">
            <Utensils className="w-12 h-12 text-[#918c84] mx-auto opacity-60" />
            <h3 className="text-base font-bold text-[#242321]">
              Tidak Ada Pesanan Dapur
            </h3>
            <p className="text-xs text-[#68645e] max-w-sm mx-auto">
              Tidak ada pesanan yang sesuai dengan filter atau kata kunci saat ini. Silakan muat contoh order demo untuk melihat simulasi.
            </p>
            <div className="pt-2">
              <Button
                variant="gold"
                size="sm"
                onClick={handleReloadSeeds}
                className="rounded-full"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                <span>Muat Data Demo Dapur</span>
              </Button>
            </div>
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
                  className={`bg-white border rounded-2xl p-5 shadow-card space-y-4 hover:border-[#f5c943]/60 transition-all ${
                    isWaFailed
                      ? 'border-[#d94b3d]/40 ring-1 ring-[#d94b3d]/20'
                      : 'border-[#e9e5df]'
                  }`}
                >
                  {/* Order Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#eeeae4] pb-3.5">
                    <div className="space-y-1">
                      <div className="flex items-center flex-wrap gap-2">
                        <span className="font-mono font-black text-base sm:text-lg text-[#242321] tracking-tight">
                          {order.number}
                        </span>

                        {/* Status Pembayaran */}
                        <Badge
                          variant={order.payment === 'PAID' ? 'success' : 'warning'}
                          size="sm"
                        >
                          {order.payment === 'PAID' ? 'LUNAS' : 'PENDING'}
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
                            WA Gagal
                          </Badge>
                        )}
                      </div>

                      <p className="text-xs text-[#68645e]">
                        Pemesan: <strong className="text-[#242321] font-semibold">{order.name}</strong> ({order.phone})
                      </p>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      {/* Warm Tag Waktu Ambil */}
                      <div
                        className="inline-flex items-center gap-1.5 bg-[#f5f2ed] border border-[#e9e5df] px-3 py-1.5 rounded-full text-xs font-semibold text-[#242321]"
                        title={`Pesanan ditargetkan siap pada ${formatDateTimeWIB(order.pickup)}`}
                      >
                        <Clock className="w-3.5 h-3.5 text-[#77736d]" />
                        <span>Ambil: {formatTimeWIB(order.pickup)} WIB</span>
                      </div>

                      {/* Shortcut Chat WhatsApp Pelanggan */}
                      <a
                        href={`https://wa.me/${order.phone}`}
                        target="_blank"
                        rel="noreferrer"
                        className="min-w-[44px] min-h-[44px] rounded-full bg-white hover:bg-[#f5f2ed] border border-[#e9e5df] text-[#1c4d25] hover:text-[#1c4d25] flex items-center justify-center transition-all shadow-xs"
                        title="Chat WA Pelanggan"
                        aria-label="Chat WhatsApp Pelanggan"
                      >
                        <Phone className="w-4 h-4" />
                      </a>
                    </div>
                  </div>

                  {/* Cooking Details / Rincian Masakan */}
                  <div className="bg-[#f5f2ed]/40 rounded-2xl p-3.5 border border-[#eeeae4] space-y-2.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#918c84] block">
                      Rincian Masakan
                    </span>

                    <div className="divide-y divide-[#eeeae4]">
                      {order.items.map((it, idx) => (
                        <div
                          key={idx}
                          className="py-2 first:pt-0 last:pb-0 flex justify-between items-center text-xs"
                        >
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-[#242321] bg-white border border-[#e9e5df] px-2.5 py-0.5 rounded-full text-[11px] shrink-0">
                              {it.qty}x
                            </span>
                            <span className="font-semibold text-[#242321]">
                              {it.name}
                            </span>
                            <span className="text-[#68645e]">
                              {it.temp && `[${it.temp}] `}
                              {it.egg && '[+Telur] '}
                              {it.note && `("${it.note}")`}
                            </span>
                          </div>

                          <span className="font-bold text-[#242321] shrink-0 ml-2">
                            {formatRupiah(it.unit * it.qty)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {order.note && (
                      <div className="text-xs bg-[#fef1dc] text-[#7a4b08] p-3 rounded-2xl border border-[#f4d5a7] flex items-start gap-2">
                        <MessageSquare className="w-4 h-4 shrink-0 mt-0.5 text-[#a36307]" />
                        <span>
                          <strong>Catatan Pemesan:</strong> {order.note}
                        </span>
                      </div>
                    )}

                    <div className="pt-1.5 flex justify-end text-xs text-[#68645e]">
                      <span>Total: <strong className="text-[#242321]">{formatRupiah(order.total)}</strong></span>
                    </div>
                  </div>

                  {/* Action Buttons Band */}
                  <div className="pt-2 border-t border-[#eeeae4] flex flex-wrap items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedOrder(order);
                          setIsDetailModalOpen(true);
                        }}
                        className="bg-white hover:bg-[#f5f2ed] border-[#e9e5df] text-[#242321] rounded-full"
                      >
                        <span>Aksi & Detail</span>
                      </Button>

                      {/* Tombol Salin Draf Pesan WA */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyCustomerReadyDraft(order)}
                        title="Salin draf chat WhatsApp pesanan siap diambil"
                        className="bg-white hover:bg-[#f5f2ed] border-[#e9e5df] text-[#242321] rounded-full"
                      >
                        <Copy className="w-3.5 h-3.5 mr-1.5 text-[#77736d]" />
                        <span>Salin Draf WA</span>
                      </Button>

                      {/* Retry WA if failed */}
                      {isWaFailed && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRetryWhatsApp(order)}
                          className="bg-[#fde7e4] hover:bg-[#fde7e4]/80 text-[#91251c] border-[#f7c5be] rounded-full"
                        >
                          <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
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
                            className="rounded-full shadow-xs"
                          >
                            <Utensils className="w-3.5 h-3.5 mr-1.5" />
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
                            className="rounded-full shadow-xs"
                          >
                            <Check className="w-3.5 h-3.5 mr-1.5" />
                            <span>Tandai Siap Ambil</span>
                          </Button>
                        )}

                        {isReady && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() =>
                              updateOrderStatus(
                                order.id,
                                'COMPLETED',
                                `Pesanan ${order.number} telah diserahkan dan selesai.`
                              )
                            }
                            className="bg-[#242321] hover:bg-[#383633] text-white rounded-full shadow-xs"
                          >
                            <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                            <span>Pesanan Diambil (Selesai)</span>
                          </Button>
                        )}
                      </div>
                    )}

                    {isDone && (
                      <span className="text-xs font-semibold text-[#1c4d25] flex items-center gap-1.5 bg-[#e2edd8] px-3.5 py-1.5 rounded-full border border-[#c5dcba]">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Pesanan Selesai Diambil</span>
                      </span>
                    )}

                    {isCancelled && (
                      <span className="text-xs font-semibold text-[#91251c] flex items-center gap-1.5 bg-[#fde7e4] px-3.5 py-1.5 rounded-full border border-[#f7c5be]">
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
              <div className="p-3.5 bg-[#f5f2ed] rounded-2xl border border-[#e9e5df] space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-[#68645e]">Status Pembayaran</span>
                  <Badge
                    variant={selectedOrder.payment === 'PAID' ? 'success' : 'warning'}
                    size="sm"
                  >
                    {selectedOrder.payment}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#68645e]">Status Dapur</span>
                  <Badge variant="gold" size="sm">
                    {selectedOrder.fulfillment}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#68645e]">Status Notifikasi WA</span>
                  <strong
                    className={
                      selectedOrder.notification === 'FAILED'
                        ? 'text-[#91251c]'
                        : 'text-[#1c4d25]'
                    }
                  >
                    {selectedOrder.notification} (Percobaan: {selectedOrder.attempts || 1})
                  </strong>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#68645e]">Target Jam Ambil</span>
                  <strong className="text-[#242321]">
                    {formatTimeWIB(selectedOrder.pickup)} WIB ({formatDateTimeWIB(selectedOrder.pickup)})
                  </strong>
                </div>
              </div>

              {/* Aksi Cepat WhatsApp */}
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-[#68645e]">
                  Komunikasi & WhatsApp
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setIsWaPreviewModalOpen(true)}
                    className="p-3 px-4 bg-white hover:bg-[#f5f2ed] border border-[#e9e5df] rounded-full text-xs font-semibold text-[#242321] flex items-center justify-between cursor-pointer transition-colors min-h-[44px]"
                  >
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-[#77736d]" />
                      <span>Lihat Pesan WA Penjaga</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCopyCustomerReadyDraft(selectedOrder)}
                    className="p-3 px-4 bg-white hover:bg-[#f5f2ed] border border-[#e9e5df] rounded-full text-xs font-semibold text-[#242321] flex items-center justify-between cursor-pointer transition-colors min-h-[44px]"
                  >
                    <div className="flex items-center gap-2">
                      <Copy className="w-4 h-4 text-[#77736d]" />
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
                    className="bg-[#fde7e4] text-[#91251c] border-[#f7c5be] hover:bg-[#fde7e4]/80 rounded-full"
                  >
                    <RotateCcw className="w-4 h-4 mr-1.5" />
                    <span>Kirim Ulang Notifikasi WA ke Sif Aktif</span>
                  </Button>
                )}
              </div>

              {/* Penanganan Masalah & Refund */}
              <div className="pt-2 border-t border-[#eeeae4] space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-[#68645e]">
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
                    className="rounded-full"
                  >
                    <Ban className="w-4 h-4 mr-1.5" />
                    <span>Batalkan Pesanan (Bahan Habis)</span>
                  </Button>
                )}

                {selectedOrder.refund && (
                  <div className="p-3.5 bg-[#f5f2ed] rounded-2xl border border-[#e9e5df] space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-[#68645e]">Pencatatan Refund</span>
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
                    <p className="text-[11px] text-[#68645e]">
                      Nominal: <strong className="text-[#242321]">{formatRupiah(selectedOrder.refund.amount)}</strong> (Alasan: {selectedOrder.refund.reason})
                    </p>
                    <Button
                      variant="gold"
                      size="sm"
                      fullWidth
                      onClick={() => {
                        setIsDetailModalOpen(false);
                        handleOpenRefundModal(selectedOrder);
                      }}
                      className="rounded-full"
                    >
                      <span>Perbarui Catatan Refund Manual</span>
                    </Button>
                  </div>
                )}
              </div>

              <div className="text-right pt-2 border-t border-[#eeeae4]">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsDetailModalOpen(false)}
                  className="rounded-full"
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
            <div className="p-3.5 bg-[#fde7e4] border border-[#f7c5be] rounded-2xl text-[#91251c] text-xs leading-relaxed">
              Pembatalan tidak mentransfer uang otomatis. Hubungi pemesan via WhatsApp untuk nomor rekening pelanggan dan catat refund manual.
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#242321]">
                Alasan Pembatalan <span className="text-[#d94b3d]">*</span>
              </label>
              <textarea
                rows={3}
                required
                maxLength={200}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Contoh: Stok mie soto habis dan pelanggan konfirmasi batal."
                className="w-full p-3.5 text-xs bg-white border border-[#e9e5df] rounded-2xl focus:outline-none focus:border-[#d94b3d] text-[#242321] resize-none"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCancelModalOpen(false)}
                className="rounded-full"
              >
                Kembali
              </Button>
              <Button type="submit" variant="danger" size="sm" className="rounded-full">
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
              <label className="text-xs font-semibold text-[#242321]">
                Nominal Pengembalian Dana (Rp) <span className="text-[#d94b3d]">*</span>
              </label>
              <input
                type="number"
                min={0}
                required
                value={refundAmount}
                onChange={(e) => setRefundAmount(Number(e.target.value))}
                className="w-full min-h-[44px] px-4 text-xs bg-white border border-[#e9e5df] rounded-full focus:outline-none focus:border-[#f5c943] text-[#242321]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#242321]">
                Status Transfer Penjaga
              </label>
              <select
                value={refundStatus}
                onChange={(e) => setRefundStatus(e.target.value as RefundStatus)}
                className="w-full min-h-[44px] px-4 text-xs bg-white border border-[#e9e5df] rounded-full focus:outline-none focus:border-[#f5c943] text-[#242321]"
              >
                <option value="PENDING">Pending (Belum Ditransfer)</option>
                <option value="FULL_REFUNDED">Sudah Ditransfer Penuh (Lunas)</option>
                <option value="PARTIAL_REFUNDED">Sudah Ditransfer Sebagian</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#242321]">
                Keterangan atau Alasan Refund
              </label>
              <input
                type="text"
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="Contoh: Ditransfer via BCA ke pelanggan"
                className="w-full min-h-[44px] px-4 text-xs bg-white border border-[#e9e5df] rounded-full focus:outline-none focus:border-[#f5c943] text-[#242321]"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsRefundModalOpen(false)}
                className="rounded-full"
              >
                Batal
              </Button>
              <Button type="submit" variant="gold" size="sm" className="rounded-full">
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
              <div className="p-4 bg-[#f5f2ed] rounded-2xl border border-[#e9e5df] font-mono text-xs whitespace-pre-wrap leading-relaxed text-[#242321] select-all">
                {buildKitchenOrderWhatsAppMessage(selectedOrder, activeShift)}
              </div>

              <div className="flex justify-end gap-2.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsWaPreviewModalOpen(false)}
                  className="rounded-full"
                >
                  Tutup
                </Button>
                <Button
                  variant="gold"
                  size="sm"
                  onClick={() => handleCopyShiftDraft(selectedOrder, activeShift)}
                  className="rounded-full"
                >
                  <Copy className="w-3.5 h-3.5 mr-1.5" />
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
