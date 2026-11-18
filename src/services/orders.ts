/**
 * Orders service layer for Web Warmindo Putra Vangkalan.
 * Handles order querying, creation, payment & fulfillment lifecycle transitions,
 * cancellation, refunds, and WhatsApp dispatch retries.
 * Routes to REST API when NEXT_PUBLIC_API_URL is configured,
 * Without a backend (demo mode) data lives in src/lib/store.ts (localStorage).
 * With a backend, failures are surfaced to the caller; they never fall back to local data.
 */

import {
  Order,
  OrderFulfillmentStatus,
  OrderPaymentStatus,
  RefundRecord,
  CreateOrderPayload,
  CreateOrderResult,
} from '@/types';
import * as localStore from '@/lib/store';
import { isBackendConfigured, apiRequest, ApiError, backendFailure, unexpectedResponse } from './client';

export const orderService = {
  async getOrders(): Promise<Order[]> {
    if (isBackendConfigured()) {
      try {
        const result = await apiRequest<Order[] | { data: Order[] }>('/api/orders');
        if (Array.isArray(result)) return result;
        if (result && Array.isArray((result as { data: Order[] }).data)) {
          return (result as { data: Order[] }).data;
        }
      } catch (err) {
        throw backendFailure('orderService.getOrders', err);
      }
      throw unexpectedResponse('orderService.getOrders');
    }
    return localStore.getOrders();
  },

  /**
   * Riwayat pelanggan (tanpa login): order yang dibuat dari browser ini. Dengan backend, status
   * diperbarui dari server per token; order yang tidak dikenal server (404: data demo lama atau
   * sudah dihapus retensi) dibuang dari perangkat. Gagal jaringan -> salinan terakhir ditampilkan.
   */
  async getDeviceOrders(): Promise<Order[]> {
    if (!isBackendConfigured()) return localStore.getOrders();
    const stored = localStore.getStoredOrders();
    const refreshed = await Promise.all(
      stored.map(async (o) => {
        try {
          return await this.getOrderByToken(o.token);
        } catch {
          return o;
        }
      })
    );
    const kept = refreshed.filter((o): o is Order => o !== null);
    // Simpan hanya bila berubah: saveOrders memicu pv_storage_update yang membuat halaman
    // riwayat memuat ulang; tanpa cek ini terjadi loop.
    if (JSON.stringify(kept) !== JSON.stringify(stored)) localStore.saveOrders(kept);
    return kept;
  },

  async getOrder(token: string): Promise<Order | null> {
    return this.getOrderByToken(token);
  },

  async getOrderByToken(token: string): Promise<Order | null> {
    if (isBackendConfigured()) {
      try {
        const result = await apiRequest<Order | { data: Order }>(
          `/api/orders/token/${encodeURIComponent(token)}`
        );
        if (result && 'id' in result) return result as Order;
        if (result && (result as { data: Order }).data) {
          return (result as { data: Order }).data;
        }
      } catch (err) {
        // Order memang tidak ada -> null; error lain (server mati) harus terlihat.
        if (err instanceof ApiError && err.statusCode === 404) return null;
        throw backendFailure('orderService.lookup', err);
      }
      throw unexpectedResponse('orderService.lookup');
    }
    const orders = localStore.getOrders();
    return orders.find((o) => o.token === token) || null;
  },

  async getOrderById(id: string): Promise<Order | null> {
    if (isBackendConfigured()) {
      try {
        const result = await apiRequest<Order | { data: Order }>(
          `/api/orders/${encodeURIComponent(id)}`
        );
        if (result && 'id' in result) return result as Order;
        if (result && (result as { data: Order }).data) {
          return (result as { data: Order }).data;
        }
      } catch (err) {
        // Order memang tidak ada -> null; error lain (server mati) harus terlihat.
        if (err instanceof ApiError && err.statusCode === 404) return null;
        throw backendFailure('orderService.getOrderById', err);
      }
      throw unexpectedResponse('orderService.getOrderById');
    }
    const orders = localStore.getOrders();
    return orders.find((o) => o.id === id) || null;
  },

  async createOrder(payload: CreateOrderPayload): Promise<CreateOrderResult> {
    if (isBackendConfigured()) {
      try {
        const response = await apiRequest<CreateOrderResult>('/api/orders', {
          method: 'POST',
          body: JSON.stringify(payload),
        });

        if (response && response.order) {
          // Sync with local storage for immediate offline/history availability
          const existing = localStore.getStoredOrders();
          localStore.saveOrders([response.order, ...existing]);
          return response;
        }
      } catch (err) {
        // Penolakan server dan jaringan putus harus sampai ke pelanggan; jangan pernah
        // membuat order palsu di localStorage yang tidak pernah sampai ke dapur.
        throw backendFailure('orderService.createOrder', err);
      }
      throw unexpectedResponse('orderService.createOrder');
    }

    // LocalStorage Fallback Generation
    const settings = localStore.getStoreSettings();
    const now = Date.now();
    const randomToken = 'pv_' + Math.random().toString(36).slice(2, 10);
    const dateStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
      .format(new Date(now))
      .replace(/-/g, '');
    const orderNumber = `PV-${dateStr}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newOrder: Order = {
      id: 'ord_' + now,
      token: randomToken,
      number: orderNumber,
      created: now,
      pickup: payload.pickup,
      estimate: payload.estimate,
      mode: payload.mode,
      name: payload.name.trim(),
      phone: payload.phone,
      note: payload.note?.trim() || undefined,
      payment: 'PENDING',
      fulfillment: 'NEW',
      notification: 'QUEUED',
      recipientShiftId: payload.recipientShiftId || settings.recipientShiftId || 's1',
      total: payload.total,
      items: payload.items,
    };

    const existing = localStore.getOrders();
    localStore.saveOrders([newOrder, ...existing]);

    return {
      order: newOrder,
      snapToken: undefined, // Signals fallback to simulation modal
    };
  },

  /**
   * Mulai/lanjutkan pembayaran Midtrans untuk order yang belum lunas.
   * Mengembalikan null bila backend tidak aktif (mode lokal/simulasi).
   */
  async startPayment(token: string): Promise<{ snapToken: string; redirectUrl: string } | null> {
    if (!isBackendConfigured()) return null;
    return apiRequest<{ snapToken: string; redirectUrl: string }>(
      `/api/orders/token/${encodeURIComponent(token)}/pay`,
      { method: 'POST' }
    );
  },

  async updateOrderStatus(
    orderId: string,
    status: OrderFulfillmentStatus
  ): Promise<Order> {
    if (isBackendConfigured()) {
      try {
        const res = await apiRequest<Order | { data: Order }>(
          `/api/orders/${orderId}/status`,
          {
            method: 'PATCH',
            body: JSON.stringify({ fulfillment: status }),
          }
        );
        const updated = 'id' in res ? (res as Order) : (res as { data: Order }).data;
        if (updated) {
          const orders = localStore.getStoredOrders();
          localStore.saveOrders(orders.map((o) => (o.id === orderId ? updated : o)));
          return updated;
        }
      } catch (err) {
        throw backendFailure('orderService.updateOrderStatus', err);
      }
      throw unexpectedResponse('orderService.updateOrderStatus');
    }

    const orders = localStore.getOrders();
    let updatedOrder: Order | null = null;
    const updated = orders.map((o) => {
      if (o.id === orderId) {
        updatedOrder = {
          ...o,
          fulfillment: status,
          completedAt: status === 'COMPLETED' ? Date.now() : o.completedAt,
        };
        return updatedOrder;
      }
      return o;
    });

    localStore.saveOrders(updated);
    if (!updatedOrder) {
      throw new Error(`Order with ID ${orderId} not found`);
    }
    return updatedOrder;
  },

  async updateOrderPayment(
    orderId: string,
    status: OrderPaymentStatus
  ): Promise<Order> {
    if (isBackendConfigured()) {
      try {
        const res = await apiRequest<Order | { data: Order }>(
          `/api/orders/${orderId}/payment`,
          {
            method: 'PATCH',
            body: JSON.stringify({ payment: status }),
          }
        );
        const updated = 'id' in res ? (res as Order) : (res as { data: Order }).data;
        if (updated) {
          const orders = localStore.getStoredOrders();
          localStore.saveOrders(orders.map((o) => (o.id === orderId ? updated : o)));
          return updated;
        }
      } catch (err) {
        throw backendFailure('orderService.updateOrderPayment', err);
      }
      throw unexpectedResponse('orderService.updateOrderPayment');
    }

    const settings = localStore.getStoreSettings();
    const orders = localStore.getOrders();
    const now = Date.now();
    let updatedOrder: Order | null = null;

    const updated = orders.map((o) => {
      if (o.id === orderId) {
        if (status === 'PAID') {
          updatedOrder = {
            ...o,
            payment: 'PAID' as const,
            paidAt: now,
            pickup: o.mode === 'asap' ? now + o.estimate * 60 * 1000 : o.pickup,
            notification: (settings.waConnected ? 'SENT' : 'FAILED') as Order['notification'],
            attempts: (o.attempts || 0) + 1,
          };
        } else {
          updatedOrder = {
            ...o,
            payment: status,
          };
        }
        return updatedOrder;
      }
      return o;
    });

    localStore.saveOrders(updated);
    if (!updatedOrder) {
      throw new Error(`Order with ID ${orderId} not found`);
    }
    return updatedOrder;
  },

  async cancelOrder(orderId: string, reason: string): Promise<Order> {
    if (isBackendConfigured()) {
      try {
        const res = await apiRequest<Order | { data: Order }>(
          `/api/orders/${orderId}/cancel`,
          {
            method: 'POST',
            body: JSON.stringify({ reason }),
          }
        );
        const updated = 'id' in res ? (res as Order) : (res as { data: Order }).data;
        if (updated) {
          const orders = localStore.getStoredOrders();
          localStore.saveOrders(orders.map((o) => (o.id === orderId ? updated : o)));
          return updated;
        }
      } catch (err) {
        throw backendFailure('orderService.cancelOrder', err);
      }
      throw unexpectedResponse('orderService.cancelOrder');
    }

    const orders = localStore.getOrders();
    let updatedOrder: Order | null = null;
    const updated = orders.map((o) => {
      if (o.id === orderId) {
        updatedOrder = {
          ...o,
          fulfillment: 'CANCELLED' as const,
          cancelReason: reason,
          refund: {
            status: 'PENDING' as const,
            amount: o.total,
            reason,
          },
        };
        return updatedOrder;
      }
      return o;
    });

    localStore.saveOrders(updated);
    if (!updatedOrder) {
      throw new Error(`Order with ID ${orderId} not found`);
    }
    return updatedOrder;
  },

  async recordRefund(orderId: string, refund: RefundRecord): Promise<Order> {
    if (isBackendConfigured()) {
      try {
        const res = await apiRequest<Order | { data: Order }>(
          `/api/orders/${orderId}/refund`,
          {
            method: 'POST',
            body: JSON.stringify(refund),
          }
        );
        const updated = 'id' in res ? (res as Order) : (res as { data: Order }).data;
        if (updated) {
          const orders = localStore.getStoredOrders();
          localStore.saveOrders(orders.map((o) => (o.id === orderId ? updated : o)));
          return updated;
        }
      } catch (err) {
        throw backendFailure('orderService.recordRefund', err);
      }
      throw unexpectedResponse('orderService.recordRefund');
    }

    const orders = localStore.getOrders();
    let updatedOrder: Order | null = null;
    const updated = orders.map((o) => {
      if (o.id === orderId) {
        updatedOrder = {
          ...o,
          refund: {
            ...refund,
            confirmedAt: Date.now(),
          },
        };
        return updatedOrder;
      }
      return o;
    });

    localStore.saveOrders(updated);
    if (!updatedOrder) {
      throw new Error(`Order with ID ${orderId} not found`);
    }
    return updatedOrder;
  },

  async retryWhatsApp(orderId: string): Promise<Order> {
    if (isBackendConfigured()) {
      try {
        const res = await apiRequest<{ success: boolean; order: Order } | Order>(
          `/api/orders/${orderId}/retry-wa`,
          { method: 'POST' }
        );
        const updated = 'order' in res ? res.order : res;
        if (updated) {
          const orders = localStore.getStoredOrders();
          localStore.saveOrders(orders.map((o) => (o.id === orderId ? updated : o)));
          return updated;
        }
      } catch (err) {
        throw backendFailure('orderService.retry', err);
      }
      throw unexpectedResponse('orderService.retry');
    }

    const currentSettings = localStore.getStoreSettings();
    const orders = localStore.getOrders();
    let updatedOrder: Order | null = null;

    const updated = orders.map((o) => {
      if (o.id === orderId) {
        const isSuccess = currentSettings.waConnected;
        updatedOrder = {
          ...o,
          recipientShiftId: currentSettings.recipientShiftId || o.recipientShiftId,
          notification: (isSuccess ? 'SENT' : 'FAILED') as Order['notification'],
          attempts: (o.attempts || 1) + 1,
        };
        return updatedOrder;
      }
      return o;
    });

    localStore.saveOrders(updated);
    if (!updatedOrder) {
      throw new Error(`Order with ID ${orderId} not found`);
    }
    return updatedOrder;
  },

  async seedDemoOrders(): Promise<Order[]> {
    if (isBackendConfigured()) {
      try {
        const res = await apiRequest<Order[]>('/api/orders/seed', { method: 'POST' });
        if (Array.isArray(res)) {
          localStore.saveOrders(res);
          return res;
        }
      } catch (err) {
        throw backendFailure('orderService.seed', err);
      }
      throw unexpectedResponse('orderService.seed');
    }
    return localStore.seedDemoOrders();
  },

  async saveOrders(orders: Order[]): Promise<void> {
    localStore.saveOrders(orders);
  },
};
