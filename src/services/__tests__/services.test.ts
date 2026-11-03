import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { isBackendConfigured, getBaseApiUrl, ApiError } from '../client';
import { orderService } from '../orders';
import { menuService } from '../menu';
import { settingsService } from '../settings';
import { triggerSnapPayment, isSnapAvailable } from '../midtrans';
import { SnapCallbacks } from '@/types/midtrans';
import { api } from '../api';

describe('API Client Layer Abstraction', () => {
  const originalEnv = process.env.NEXT_PUBLIC_API_URL;

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.NEXT_PUBLIC_API_URL = originalEnv;
    } else {
      delete process.env.NEXT_PUBLIC_API_URL;
    }
  });

  it('detects backend configuration and normalizes URLs', () => {
    delete process.env.NEXT_PUBLIC_API_URL;
    expect(isBackendConfigured()).toBe(false);
    expect(getBaseApiUrl()).toBe('');

    process.env.NEXT_PUBLIC_API_URL = '   ';
    expect(isBackendConfigured()).toBe(false);
    expect(getBaseApiUrl()).toBe('');

    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:4000///';
    expect(isBackendConfigured()).toBe(true);
    expect(getBaseApiUrl()).toBe('http://localhost:4000');
  });

  it('instantiates ApiError with correct properties', () => {
    const error = new ApiError('Not found', 404, '/api/orders', { id: 'ord_123' });
    expect(error.name).toBe('ApiError');
    expect(error.message).toBe('Not found');
    expect(error.statusCode).toBe(404);
    expect(error.endpoint).toBe('/api/orders');
    expect(error.responseData).toEqual({ id: 'ord_123' });
    expect(error instanceof Error).toBe(true);
  });

  it('exports complete unified api facade', () => {
    expect(api.orders).toBeDefined();
    expect(api.menu).toBeDefined();
    expect(api.settings).toBeDefined();
    expect(api.midtrans).toBeDefined();
    expect(typeof api.isBackendConfigured).toBe('function');
    expect(typeof api.getBaseApiUrl).toBe('function');
    expect(typeof api.request).toBe('function');
  });
});

describe('Domain Services LocalStorage Fallback', () => {
  let storage: Record<string, string> = {};

  beforeEach(() => {
    storage = {};
    const mockStorage = {
      getItem: (key: string) => storage[key] || null,
      setItem: (key: string, val: string) => {
        storage[key] = String(val);
      },
      removeItem: (key: string) => {
        delete storage[key];
      },
      clear: () => {
        storage = {};
      },
      key: (i: number) => Object.keys(storage)[i] || null,
      length: 0,
    };

    const mockWindow = {
      localStorage: mockStorage,
      dispatchEvent: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };

    vi.stubGlobal('window', mockWindow);
    vi.stubGlobal('localStorage', mockStorage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('manages full order lifecycle in fallback mode', async () => {
    // 1. Initial orders
    const initialOrders = await orderService.getOrders();
    expect(Array.isArray(initialOrders)).toBe(true);
    expect(initialOrders.length).toBeGreaterThan(0);

    // 2. Create order
    const createResult = await orderService.createOrder({
      name: 'Santri Ahmad',
      phone: '6281234567890',
      mode: 'asap',
      pickup: Date.now() + 600000,
      estimate: 10,
      items: [{ name: 'Indomie Goreng', qty: 2, unit: 14000, egg: true }],
      total: 28000,
      note: 'Pedas sedang',
    });

    expect(createResult.order).toBeDefined();
    expect(createResult.order.name).toBe('Santri Ahmad');
    expect(createResult.order.payment).toBe('PENDING');
    expect(createResult.order.fulfillment).toBe('NEW');
    expect(createResult.snapToken).toBeUndefined(); // Fallback simulation modal indicator

    const { id, token } = createResult.order;

    // 3. Lookup by token
    const fetched = await orderService.getOrderByToken(token);
    expect(fetched).toBeDefined();
    expect(fetched?.id).toBe(id);

    // 4. Update payment to PAID
    const paid = await orderService.updateOrderPayment(id, 'PAID');
    expect(paid.payment).toBe('PAID');
    expect(paid.paidAt).toBeDefined();

    // 5. Update fulfillment status: PREPARING -> READY -> COMPLETED
    const preparing = await orderService.updateOrderStatus(id, 'PREPARING');
    expect(preparing.fulfillment).toBe('PREPARING');

    const ready = await orderService.updateOrderStatus(id, 'READY');
    expect(ready.fulfillment).toBe('READY');

    const completed = await orderService.updateOrderStatus(id, 'COMPLETED');
    expect(completed.fulfillment).toBe('COMPLETED');
    expect(completed.completedAt).toBeDefined();

    // 6. Cancel and refund flow
    const createResult2 = await orderService.createOrder({
      name: 'Santri Budi',
      phone: '6281234567891',
      mode: 'asap',
      pickup: Date.now() + 600000,
      estimate: 10,
      items: [{ name: 'Kopi Susu', qty: 1, unit: 7000 }],
      total: 7000,
    });

    const cancelled = await orderService.cancelOrder(createResult2.order.id, 'Stok habis');
    expect(cancelled.fulfillment).toBe('CANCELLED');
    expect(cancelled.cancelReason).toBe('Stok habis');
    expect(cancelled.refund?.status).toBe('PENDING');

    const refunded = await orderService.recordRefund(createResult2.order.id, {
      status: 'FULL_REFUNDED',
      amount: 7000,
      reason: 'Refund tunai kasir',
    });
    expect(refunded.refund?.status).toBe('FULL_REFUNDED');
    expect(refunded.refund?.confirmedAt).toBeDefined();

    // 7. Retry WA
    const retried = await orderService.retryWhatsApp(id);
    expect(retried.attempts).toBeGreaterThan(1);
  });

  it('manages menu items and categories in fallback mode', async () => {
    const items = await menuService.getMenuItems();
    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBeGreaterThan(0);

    const categories = await menuService.getCategories();
    expect(Array.isArray(categories)).toBe(true);
    expect(categories).toContain('Mi');

    const updatedCategories = [...categories, 'Paket Hemat'];
    await menuService.saveCategories(updatedCategories);

    const reFetchedCategories = await menuService.getCategories();
    expect(reFetchedCategories).toContain('Paket Hemat');
  });

  it('manages settings and shifts in fallback mode', async () => {
    const settings = await settingsService.getStoreSettings();
    expect(typeof settings.open).toBe('boolean');
    expect(typeof settings.estimate).toBe('number');

    await settingsService.saveStoreSettings({
      ...settings,
      estimate: 15,
      open: false,
    });

    const updatedSettings = await settingsService.getStoreSettings();
    expect(updatedSettings.estimate).toBe(15);
    expect(updatedSettings.open).toBe(false);

    const shifts = await settingsService.getShifts();
    expect(Array.isArray(shifts)).toBe(true);
    expect(shifts.length).toBeGreaterThan(0);

    await settingsService.resetAllData();
    const resetSettings = await settingsService.getStoreSettings();
    expect(resetSettings.estimate).toBe(10);
    expect(resetSettings.open).toBe(true);
  });
});

describe('Midtrans Snap SDK Client Integration', () => {
  it('detects when snap is not available in mock/headless environment', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubGlobal('window', {
      document: {
        getElementById: () => null,
        createElement: () => ({ setAttribute: vi.fn() }),
        head: { appendChild: vi.fn() },
      },
    });

    expect(isSnapAvailable()).toBe(false);
    const triggered = await triggerSnapPayment('mock_token');
    expect(triggered).toBe(false);

    warnSpy.mockRestore();
    vi.unstubAllGlobals();
  });

  it('successfully triggers window.snap.pay when snap is available', async () => {
    const mockPay = vi.fn((_token: string, callbacks?: SnapCallbacks) => {
      callbacks?.onSuccess?.({ status_code: '200', transaction_status: 'settlement' });
    });

    vi.stubGlobal('window', {
      snap: { pay: mockPay },
    });

    expect(isSnapAvailable()).toBe(true);
    const successCallback = vi.fn();
    const result = await triggerSnapPayment('real_snap_token_123', {
      onSuccess: successCallback,
    });

    expect(result).toBe(true);
    expect(mockPay).toHaveBeenCalledWith('real_snap_token_123', expect.any(Object));
    expect(successCallback).toHaveBeenCalledWith(
      expect.objectContaining({ status_code: '200', transaction_status: 'settlement' })
    );

    vi.unstubAllGlobals();
  });
});
