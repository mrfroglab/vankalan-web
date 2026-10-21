'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Order, OrderFulfillmentStatus, Shift } from '@/types';
import { INITIAL_SHIFTS, formatTimeWIB } from '@/lib/constants';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  Utensils,
  Clock,
  CheckCircle,
  RefreshCw,
  Power,
  ArrowLeft,
} from 'lucide-react';

export default function AdminAntreanPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('AKTIF');
  const [activeShift] = useState<Shift>(INITIAL_SHIFTS[0]);
  const [isStoreOpen, setIsStoreOpen] = useState<boolean>(true);

  const loadOrders = () => {
    try {
      const ordersStr = localStorage.getItem('pv_orders_v2');
      if (ordersStr) {
        setOrders(JSON.parse(ordersStr));
      }
    } catch (e) {
      console.warn('Gagal memuat antrean', e);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const updateOrderStatus = (orderId: string, nextStatus: OrderFulfillmentStatus) => {
    const updated = orders.map((o) =>
      o.id === orderId ? { ...o, fulfillment: nextStatus } : o
    );
    setOrders(updated);
    localStorage.setItem('pv_orders_v2', JSON.stringify(updated));
  };

  const filteredOrders = orders.filter((o) => {
    if (statusFilter === 'AKTIF') {
      return ['NEW', 'PREPARING', 'READY'].includes(o.fulfillment);
    }
    if (statusFilter === 'SELESAI') {
      return o.fulfillment === 'COMPLETED';
    }
    return true; // SEMUA
  });

  return (
    <div className="min-h-screen bg-paper py-6 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header Admin & Shift Switcher */}
        <div className="bg-white p-5 rounded-2xl border border-border-line flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="w-10 h-10 rounded-xl bg-soft-green flex items-center justify-center text-brand-green hover:bg-brand-green hover:text-white transition-colors"
              title="Kembali ke halaman pelanggan"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-black text-ink">
                Dapur & Kasir Warmindo
              </h1>
              <p className="text-xs text-text-muted">
                Penjaga Sif Bertugas: <strong>{activeShift.name}</strong> ({activeShift.phone})
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Toggle Buka/Tutup Toko */}
            <button
              type="button"
              onClick={() => setIsStoreOpen(!isStoreOpen)}
              className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold border flex items-center gap-2 transition-all cursor-pointer ${
                isStoreOpen
                  ? 'bg-soft-green border-brand-green text-brand-green'
                  : 'bg-danger-red/10 border-danger-red text-danger-red'
              }`}
            >
              <Power className="w-4 h-4" />
              <span>{isStoreOpen ? 'Toko Buka' : 'Toko Tutup'}</span>
            </button>

            {/* Tombol Refresh */}
            <button
              type="button"
              onClick={loadOrders}
              className="min-h-[44px] px-3 py-2 rounded-xl border border-border-line bg-white hover:bg-neutral-50 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Segarkan</span>
            </button>
          </div>
        </div>

        {/* Tab Filter Antrean */}
        <div className="flex gap-2">
          {['AKTIF', 'SELESAI', 'SEMUA'].map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setStatusFilter(f)}
              className={`min-h-[44px] px-4 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                statusFilter === f
                  ? 'bg-brand-green text-white border-brand-green'
                  : 'bg-white text-ink border-border-line hover:bg-soft-green'
              }`}
            >
              {f === 'AKTIF'
                ? 'Antrean Masak & Ambil'
                : f === 'SELESAI'
                ? 'Sudah Selesai'
                : 'Semua Riwayat'}
            </button>
          ))}
        </div>

        {/* Daftar Kartu Antrean Dapur */}
        {filteredOrders.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-border-line text-center">
            <Utensils className="w-12 h-12 text-text-muted mx-auto mb-3" />
            <h3 className="font-bold text-base text-ink">Tidak Ada Antrean</h3>
            <p className="text-xs text-text-muted mt-1">
              Belum ada pesanan aktif yang menunggu untuk dimasak.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <div
                key={order.id}
                className="bg-white p-5 rounded-2xl border border-border-line space-y-4 shadow-xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border-line pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <strong className="text-base font-black text-ink">
                        {order.number}
                      </strong>
                      <Badge
                        variant={
                          order.fulfillment === 'READY'
                            ? 'success'
                            : order.fulfillment === 'PREPARING'
                            ? 'warning'
                            : order.fulfillment === 'COMPLETED'
                            ? 'neutral'
                            : 'info'
                        }
                      >
                        {order.fulfillment === 'NEW'
                          ? 'Perlu Dimasak'
                          : order.fulfillment === 'PREPARING'
                          ? 'Sedang Dimasak'
                          : order.fulfillment === 'READY'
                          ? 'Siap Diambil'
                          : 'Selesai'}
                      </Badge>
                    </div>
                    <span className="text-xs text-text-muted block mt-0.5">
                      Pemesan: <strong>{order.name}</strong> ({order.phone})
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs font-bold text-brand-orange bg-[#fff2de] px-3 py-1.5 rounded-lg self-start sm:self-auto">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Ambil: {formatTimeWIB(order.pickup)} WIB</span>
                  </div>
                </div>

                {/* Rincian Menu Dapur */}
                <div className="space-y-1.5 text-sm">
                  {order.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-soft-green/60 flex items-start justify-between"
                    >
                      <div>
                        <span className="font-bold text-ink">
                          {item.qty}x {item.name}
                        </span>
                        <div className="text-xs text-text-muted mt-0.5 flex flex-wrap gap-2">
                          {item.egg ? (
                            <span className="text-brand-green font-bold">
                              🍳 Pakai Telur
                            </span>
                          ) : null}
                          {item.temp ? <span>🧊 {item.temp}</span> : null}
                          {item.note ? (
                            <span className="text-danger-red font-semibold">
                              Catatan: {item.note}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {order.note ? (
                  <div className="p-2.5 bg-neutral-100 rounded-xl text-xs text-ink">
                    <strong>Catatan Pemesan:</strong> {order.note}
                  </div>
                ) : null}

                {/* Tombol Aksi Status Cepat */}
                <div className="pt-2 flex flex-wrap gap-2 justify-end">
                  {order.fulfillment === 'NEW' ? (
                    <Button
                      variant="orange"
                      size="sm"
                      onClick={() => updateOrderStatus(order.id, 'PREPARING')}
                    >
                      Mulai Masak
                    </Button>
                  ) : null}

                  {order.fulfillment === 'PREPARING' ? (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => updateOrderStatus(order.id, 'READY')}
                    >
                      Tandai Siap Diambil
                    </Button>
                  ) : null}

                  {order.fulfillment === 'READY' ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => updateOrderStatus(order.id, 'COMPLETED')}
                    >
                      <CheckCircle className="w-4 h-4 text-brand-green" />
                      <span>Sudah Diambil Pelanggan</span>
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
