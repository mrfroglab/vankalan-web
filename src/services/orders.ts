/**
 * Orders service layer for Web Warmindo Putra Vangkalan.
 * Handles order querying, creation, payment & fulfillment lifecycle transitions,
 * cancellation, refunds, and WhatsApp dispatch retries.
 * Routes to REST API when NEXT_PUBLIC_API_URL is configured,
 * falling back transparently to src/lib/store.ts (localStorage).
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
import { isBackendConfigured, apiRequest } from './client';

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
        console.warn('[orderService] Backend getOrders failed, using local store:', err);
      }
    }
    return localStore.getOrders();
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
        console.warn('[orderService] Backend lookup failed, falling back to local store:', err);
      }
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
        console.warn('[orderService] Backend getOrderById failed, using local store:', err);
      }
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
          const existing = localStore.getOrders();
          localStore.saveOrders([response.order, ...existing]);
          return response;
        }
      } catch (err) {
        console.warn('[orderService] Backend createOrder failed, using fallback:', err);
      }
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
          const orders = localStore.getOrders();
          localStore.saveOrders(orders.map((o) => (o.id === orderId ? updated : o)));
          return updated;
        }
      } catch (err) {
        console.warn('[orderService] Backend updateOrderStatus failed, using local store:', err);
      }
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
          const orders = localStore.getOrders();
          localStore.saveOrders(orders.map((o) => (o.id === orderId ? updated : o)));
          return updated;
        }
      } catch (err) {
        console.warn('[orderService] Backend updateOrderPayment failed, using local store:', err);
      }
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
          const orders = localStore.getOrders();
          localStore.saveOrders(orders.map((o) => (o.id === orderId ? updated : o)));
          return updated;
        }
      } catch (err) {
        console.warn('[orderService] Backend cancelOrder failed, using local store:', err);
      }
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
          const orders = localStore.getOrders();
          localStore.saveOrders(orders.map((o) => (o.id === orderId ? updated : o)));
          return updated;
        }
      } catch (err) {
        console.warn('[orderService] Backend recordRefund failed, using local store:', err);
      }
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
          const orders = localStore.getOrders();
          localStore.saveOrders(orders.map((o) => (o.id === orderId ? updated : o)));
          return updated;
        }
      } catch (err) {
        console.warn('[orderService] Backend retry WA failed, using local store:', err);
      }
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
        console.warn('[orderService] Backend seed failed, using local seed:', err);
      }
    }
    return localStore.seedDemoOrders();
  },

  async saveOrders(orders: Order[]): Promise<void> {
    localStore.saveOrders(orders);
  },
};
