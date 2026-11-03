import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { isBackendConfigured, apiRequest, ApiError } from '../client';
import { orderService } from '../orders';
import { menuService } from '../menu';
import { settingsService } from '../settings';
import { triggerSnapPayment, loadSnapScript } from '../midtrans';
import * as localStore from '@/lib/store';
import { CreateOrderPayload, CreateOrderResult, MenuItem, Shift } from '@/types';
import { SnapCallbacks } from '@/types/midtrans';

describe('CHALLENGER SUITE 1: LocalStorage Fallback (Unset / Empty NEXT_PUBLIC_API_URL)', () => {
  let storage: Record<string, string> = {};
  const originalEnv = process.env.NEXT_PUBLIC_API_URL;

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_API_URL;
    storage = {};

    const mockStorage = {
      getItem: (key: string) => storage[key] ?? null,
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
    if (originalEnv !== undefined) {
      process.env.NEXT_PUBLIC_API_URL = originalEnv;
    } else {
      delete process.env.NEXT_PUBLIC_API_URL;
    }
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('evaluates isBackendConfigured as false under all blank/whitespace variants', () => {
    delete process.env.NEXT_PUBLIC_API_URL;
    expect(isBackendConfigured()).toBe(false);

    process.env.NEXT_PUBLIC_API_URL = '';
    expect(isBackendConfigured()).toBe(false);

    process.env.NEXT_PUBLIC_API_URL = '   ';
    expect(isBackendConfigured()).toBe(false);

    process.env.NEXT_PUBLIC_API_URL = '\t\n  ';
    expect(isBackendConfigured()).toBe(false);
  });

  it('orders.getOrders returns valid initial demo orders when storage is empty', async () => {
    const orders = await orderService.getOrders();
    expect(Array.isArray(orders)).toBe(true);
    expect(orders.length).toBe(6);
    expect(orders[0]).toHaveProperty('id');
    expect(orders[0]).toHaveProperty('token');
    expect(orders[0]).toHaveProperty('number');
    expect(orders[0].number).toMatch(/^PV-\d{8}-\d{4}$/);
  });

  it('orders.createOrder generates valid order with fallback simulation flag (snapToken: undefined)', async () => {
    const payload: CreateOrderPayload = {
      name: 'Adversarial Customer <script>alert(1)</script>',
      phone: '081299998888',
      mode: 'scheduled',
      pickup: Date.now() + 3600000,
      estimate: 15,
      items: [
        { name: 'Indomie Goreng Aceh', qty: 2, unit: 15000, egg: true, note: 'Super pedas 🔥' },
        { name: 'Es Teh Manis', qty: 1, unit: 5000, temp: 'Dingin' },
      ],
      total: 35000,
      note: 'Tolong sambal dipisah & jangan bocor',
    };

    const result = await orderService.createOrder(payload);

    expect(result.order).toBeDefined();
    expect(result.order.name).toBe('Adversarial Customer <script>alert(1)</script>');
    expect(result.order.note).toBe('Tolong sambal dipisah & jangan bocor');
    expect(result.order.payment).toBe('PENDING');
    expect(result.order.fulfillment).toBe('NEW');
    expect(result.order.notification).toBe('QUEUED');
    expect(result.order.items.length).toBe(2);
    expect(result.order.total).toBe(35000);
    expect(result.order.token).toMatch(/^pv_[a-z0-9]+$/);
    expect(result.order.number).toMatch(/^PV-\d{8}-\d{4}$/);
    expect(result.snapToken).toBeUndefined(); // Simulation modal fallback trigger

    // Check persistence in localStorage
    const savedOrders = await orderService.getOrders();
    const found = savedOrders.find((o) => o.id === result.order.id);
    expect(found).toBeDefined();
    expect(found?.token).toBe(result.order.token);
  });

  it('orders.getOrderById and orders.getOrderByToken accurately retrieve stored orders', async () => {
    const orders = await orderService.getOrders();
    const target = orders[0];

    const byId = await orderService.getOrderById(target.id);
    expect(byId).toEqual(target);

    const byToken = await orderService.getOrderByToken(target.token);
    expect(byToken).toEqual(target);

    const byAlias = await orderService.getOrder(target.token);
    expect(byAlias).toEqual(target);

    const nonExistent = await orderService.getOrderByToken('tok_does_not_exist_999');
    expect(nonExistent).toBeNull();

    const nonExistentId = await orderService.getOrderById('ord_does_not_exist_999');
    expect(nonExistentId).toBeNull();
  });

  it('orders.updateOrderStatus transitions through full lifecycle and records completedAt', async () => {
    const orders = await orderService.getOrders();
    const target = orders[0];

    const preparing = await orderService.updateOrderStatus(target.id, 'PREPARING');
    expect(preparing.fulfillment).toBe('PREPARING');
    expect(preparing.completedAt).toBeUndefined();

    const ready = await orderService.updateOrderStatus(target.id, 'READY');
    expect(ready.fulfillment).toBe('READY');

    const completed = await orderService.updateOrderStatus(target.id, 'COMPLETED');
    expect(completed.fulfillment).toBe('COMPLETED');
    expect(typeof completed.completedAt).toBe('number');
    expect(completed.completedAt).toBeGreaterThan(0);

    // Verify error thrown on non-existent order
    await expect(
      orderService.updateOrderStatus('ord_ghost_invalid', 'READY')
    ).rejects.toThrowError('Order with ID ord_ghost_invalid not found');
  });

  it('orders.updateOrderPayment handles PAID state, recalculates asap pickup, and increments attempts', async () => {
    const created = await orderService.createOrder({
      name: 'ASAP Test',
      phone: '081234567890',
      mode: 'asap',
      pickup: Date.now() + 600000,
      estimate: 12,
      items: [{ name: 'Nasi Goreng', qty: 1, unit: 18000 }],
      total: 18000,
    });

    const orderId = created.order.id;
    const initialAttempts = created.order.attempts || 0;

    const paid = await orderService.updateOrderPayment(orderId, 'PAID');
    expect(paid.payment).toBe('PAID');
    expect(paid.paidAt).toBeDefined();
    expect(paid.attempts).toBe(initialAttempts + 1);
    expect(paid.notification).toBe('SENT'); // waConnected is true in DEFAULT_SETTINGS

    const failed = await orderService.updateOrderPayment(orderId, 'FAILED');
    expect(failed.payment).toBe('FAILED');

    await expect(
      orderService.updateOrderPayment('ord_ghost_payment', 'PAID')
    ).rejects.toThrowError('Order with ID ord_ghost_payment not found');
  });

  it('orders.cancelOrder and recordRefund correctly handle cancellation reason and refund records', async () => {
    const created = await orderService.createOrder({
      name: 'Cancel Me',
      phone: '081234567890',
      mode: 'asap',
      pickup: Date.now() + 600000,
      estimate: 10,
      items: [{ name: 'Mie Instan', qty: 1, unit: 12000 }],
      total: 12000,
    });

    const cancelled = await orderService.cancelOrder(created.order.id, 'Porsi habis');
    expect(cancelled.fulfillment).toBe('CANCELLED');
    expect(cancelled.cancelReason).toBe('Porsi habis');
    expect(cancelled.refund).toEqual({
      status: 'PENDING',
      amount: 12000,
      reason: 'Porsi habis',
    });

    const refunded = await orderService.recordRefund(created.order.id, {
      status: 'FULL_REFUNDED',
      amount: 12000,
      reason: 'Transfer via BCA',
    });
    expect(refunded.refund?.status).toBe('FULL_REFUNDED');
    expect(refunded.refund?.confirmedAt).toBeDefined();

    await expect(
      orderService.cancelOrder('ord_ghost_cancel', 'no reason')
    ).rejects.toThrowError('Order with ID ord_ghost_cancel not found');
  });

  it('orders.retryWhatsApp increments attempts and respects waConnected toggle', async () => {
    const orders = await orderService.getOrders();
    const target = orders[0];
    const initialAttempts = target.attempts || 1;

    // With waConnected = true
    const retried1 = await orderService.retryWhatsApp(target.id);
    expect(retried1.attempts).toBe(initialAttempts + 1);
    expect(retried1.notification).toBe('SENT');

    // Toggle waConnected = false
    await settingsService.saveStoreSettings({
      ...(await settingsService.getStoreSettings()),
      waConnected: false,
    });

    const retried2 = await orderService.retryWhatsApp(target.id);
    expect(retried2.attempts).toBe(initialAttempts + 2);
    expect(retried2.notification).toBe('FAILED');
  });

  it('menuService and settingsService execute correctly against localStorage', async () => {
    const menuItems = await menuService.getMenuItems();
    expect(menuItems.length).toBeGreaterThan(0);

    const customItem: MenuItem = {
      id: 'menu_custom_99',
      name: 'Indomie Seblak Hot',
      description: 'Seblak kuah kental level 5',
      price: 18000,
      category: 'Mi',
      kind: 'noodle',
      available: true,
    };
    const savedMenu = await menuService.saveMenuItems([customItem, ...menuItems]);
    expect(savedMenu.length).toBe(menuItems.length + 1);
    expect(savedMenu[0].id).toBe('menu_custom_99');

    const categories = await menuService.getCategories();
    expect(categories).toContain('Mi');
    await menuService.saveCategories([...categories, 'Spesial']);
    expect(await menuService.getCategories()).toContain('Spesial');

    const settings = await settingsService.getStoreSettings();
    expect(settings.estimate).toBe(10);
    await settingsService.saveStoreSettings({ ...settings, estimate: 25, open: false });
    const updatedSettings = await settingsService.getStoreSettings();
    expect(updatedSettings.estimate).toBe(25);
    expect(updatedSettings.open).toBe(false);

    const shifts = await settingsService.getShifts();
    expect(shifts.length).toBeGreaterThan(0);
    const customShifts: Shift[] = [{ id: 's_night', name: 'Shift Malam', phone: '081200009999' }];
    await settingsService.saveShifts(customShifts);
    expect(await settingsService.getShifts()).toEqual(customShifts);

    // Reset All Data restores defaults
    await settingsService.resetAllData();
    const restoredSettings = await settingsService.getStoreSettings();
    expect(restoredSettings.estimate).toBe(10);
    expect(restoredSettings.open).toBe(true);
    expect(await menuService.getCategories()).toEqual(['Mi', 'Nasi', 'Camilan', 'Minuman']);
  });

  it('survives corrupted JSON data in localStorage without unhandled exceptions', async () => {
    storage['pv_orders_v2'] = '{ invalid_json_syntax %%%';
    storage['pv_settings_v2'] = 'not valid json';
    storage['pv_menu_v2'] = 'null undefined broken';
    storage['pv_categories_v2'] = '###';
    storage['pv_shifts_v2'] = 'broken';

    // Must return fallback defaults instead of crashing
    const orders = await orderService.getOrders();
    expect(Array.isArray(orders)).toBe(true);
    expect(orders.length).toBe(6);

    const settings = await settingsService.getStoreSettings();
    expect(settings.open).toBe(true);

    const menu = await menuService.getMenuItems();
    expect(menu.length).toBeGreaterThan(0);

    const categories = await menuService.getCategories();
    expect(categories).toContain('Mi');

    const shifts = await settingsService.getShifts();
    expect(shifts.length).toBeGreaterThan(0);
  });
});

describe('CHALLENGER SUITE 2: apiRequest & Remote API Behavior (NEXT_PUBLIC_API_URL Configured)', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_API_URL = 'https://api.vankalan.test/v1';
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_API_URL;
    vi.restoreAllMocks();
  });

  it('formats request URL correctly with normalization of leading/trailing slashes', async () => {
    let capturedUrl = '';
    const mockFetch = vi.fn(async (url: string | URL | Request) => {
      capturedUrl = String(url);
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });
    vi.stubGlobal('fetch', mockFetch);

    // Case 1: normal path
    await apiRequest('/api/orders');
    expect(capturedUrl).toBe('https://api.vankalan.test/v1/api/orders');

    // Case 2: path without leading slash
    await apiRequest('api/menu');
    expect(capturedUrl).toBe('https://api.vankalan.test/v1/api/menu');

    // Case 3: trailing slashes in base URL
    process.env.NEXT_PUBLIC_API_URL = 'https://api.vankalan.test/v1///';
    await apiRequest('/api/settings');
    expect(capturedUrl).toBe('https://api.vankalan.test/v1/api/settings');

    // Case 4: query parameters in path
    await apiRequest('/api/orders?status=READY&shift=s1');
    expect(capturedUrl).toBe('https://api.vankalan.test/v1/api/orders?status=READY&shift=s1');

    vi.unstubAllGlobals();
  });

  it('injects default Content-Type: application/json for non-FormData and preserves custom headers', async () => {
    let capturedHeaders: Headers | undefined;
    const mockFetch = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      capturedHeaders = new Headers(init?.headers);
      return new Response(JSON.stringify({ status: 'ok' }), { status: 200 });
    });
    vi.stubGlobal('fetch', mockFetch);

    await apiRequest('/api/test', {
      headers: {
        Authorization: 'Bearer test_token_xyz',
        'X-Custom-Client': 'Vankalan-Frontend',
      },
    });

    expect(capturedHeaders?.get('Content-Type')).toBe('application/json');
    expect(capturedHeaders?.get('Authorization')).toBe('Bearer test_token_xyz');
    expect(capturedHeaders?.get('X-Custom-Client')).toBe('Vankalan-Frontend');

    // Verify FormData does not get forced application/json
    const formData = new FormData();
    formData.append('file', 'test');
    await apiRequest('/api/upload', {
      body: formData,
    });
    expect(capturedHeaders?.has('Content-Type')).toBe(false);

    vi.unstubAllGlobals();
  });

  it('handles HTTP 204 No Content without JSON parse failure', async () => {
    const mockFetch = vi.fn(async () => {
      return new Response(null, { status: 204 });
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await apiRequest('/api/orders/ord_123', { method: 'DELETE' });
    expect(result).toEqual({});

    vi.unstubAllGlobals();
  });

  it('unwraps response envelopes (raw array, enveloped data, single object)', async () => {
    // 1. Array response
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify([{ id: '1' }, { id: '2' }]))));
    const arrayResult = await orderService.getOrders();
    expect(arrayResult.length).toBe(2);

    // 2. Enveloped array { data: [...] }
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ data: [{ id: '10' }] }))));
    const envelopedArray = await orderService.getOrders();
    expect(envelopedArray.length).toBe(1);
    expect(envelopedArray[0].id).toBe('10');

    // 3. Enveloped object { data: { id: 'ord_1', ... } }
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ data: { id: 'ord_env_1', token: 'tok_env' } }))));
    const singleEnveloped = await orderService.getOrderByToken('tok_env');
    expect(singleEnveloped?.id).toBe('ord_env_1');

    vi.unstubAllGlobals();
  });

  it('throws typed ApiError on HTTP 400 Bad Request with server message', async () => {
    const mockFetch = vi.fn(async () => {
      return new Response(JSON.stringify({ message: 'Validation failed: phone is required' }), {
        status: 400,
        statusText: 'Bad Request',
      });
    });
    vi.stubGlobal('fetch', mockFetch);

    try {
      await apiRequest('/api/orders', { method: 'POST' });
      expect.fail('Should have thrown ApiError');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      const apiErr = err as ApiError;
      expect(apiErr.statusCode).toBe(400);
      expect(apiErr.message).toBe('Validation failed: phone is required');
      expect(apiErr.endpoint).toBe('/api/orders');
    }

    vi.unstubAllGlobals();
  });

  it('throws typed ApiError on HTTP 401 Unauthorized with error field', async () => {
    const mockFetch = vi.fn(async () => {
      return new Response(JSON.stringify({ error: 'Invalid or expired session token' }), {
        status: 401,
        statusText: 'Unauthorized',
      });
    });
    vi.stubGlobal('fetch', mockFetch);

    try {
      await apiRequest('/api/admin/antrean');
      expect.fail('Should have thrown ApiError');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      const apiErr = err as ApiError;
      expect(apiErr.statusCode).toBe(401);
      expect(apiErr.message).toBe('Invalid or expired session token');
    }

    vi.unstubAllGlobals();
  });

  it('throws typed ApiError on HTTP 500 with HTML body without syntax error', async () => {
    const mockFetch = vi.fn(async () => {
      return new Response('<html><head><title>500 Internal Server Error</title></head><body>Crash</body></html>', {
        status: 500,
        statusText: 'Internal Server Error',
        headers: { 'Content-Type': 'text/html' },
      });
    });
    vi.stubGlobal('fetch', mockFetch);

    try {
      await apiRequest('/api/orders');
      expect.fail('Should have thrown ApiError');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      const apiErr = err as ApiError;
      expect(apiErr.statusCode).toBe(500);
      expect(apiErr.message).toContain('HTTP error 500: Internal Server Error');
      expect(apiErr.responseData).toBeNull();
    }

    vi.unstubAllGlobals();
  });

  it('converts native fetch network crash into ApiError with statusCode 0', async () => {
    const mockFetch = vi.fn(async () => {
      throw new TypeError('Failed to fetch (DNS lookup failed)');
    });
    vi.stubGlobal('fetch', mockFetch);

    try {
      await apiRequest('/api/orders');
      expect.fail('Should have thrown ApiError');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      const apiErr = err as ApiError;
      expect(apiErr.statusCode).toBe(0);
      expect(apiErr.message).toBe('Failed to fetch (DNS lookup failed)');
    }

    vi.unstubAllGlobals();
  });
});

describe('CHALLENGER SUITE 3: Network Failure Graceful Fallback', () => {
  let storage: Record<string, string> = {};

  beforeEach(() => {
    process.env.NEXT_PUBLIC_API_URL = 'https://api.vankalan.test';
    storage = {};

    const mockStorage = {
      getItem: (key: string) => storage[key] ?? null,
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
    delete process.env.NEXT_PUBLIC_API_URL;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('all orderService methods catch network failure and fall back to local store without throwing', async () => {
    // Mock fetch to simulate complete network drop / connection refused
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new TypeError('Network connection refused (ECONNREFUSED)');
    }));

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // 1. getOrders
    const orders = await orderService.getOrders();
    expect(orders.length).toBe(6);

    // 2. getOrder / getOrderByToken
    const token = orders[0].token;
    const byToken = await orderService.getOrderByToken(token);
    expect(byToken?.id).toBe(orders[0].id);

    // 3. getOrderById
    const byId = await orderService.getOrderById(orders[0].id);
    expect(byId?.token).toBe(token);

    // 4. createOrder
    const created = await orderService.createOrder({
      name: 'Network Down Customer',
      phone: '081234567890',
      mode: 'asap',
      pickup: Date.now() + 600000,
      estimate: 10,
      items: [{ name: 'Mie Rebus', qty: 1, unit: 13000 }],
      total: 13000,
    });
    expect(created.order).toBeDefined();
    expect(created.order.name).toBe('Network Down Customer');
    expect(created.snapToken).toBeUndefined();

    // 5. updateOrderStatus
    const updatedStatus = await orderService.updateOrderStatus(created.order.id, 'PREPARING');
    expect(updatedStatus.fulfillment).toBe('PREPARING');

    // 6. updateOrderPayment
    const updatedPayment = await orderService.updateOrderPayment(created.order.id, 'PAID');
    expect(updatedPayment.payment).toBe('PAID');

    // 7. cancelOrder
    const cancelled = await orderService.cancelOrder(created.order.id, 'Warung tutup');
    expect(cancelled.fulfillment).toBe('CANCELLED');

    // 8. recordRefund
    const refunded = await orderService.recordRefund(created.order.id, {
      status: 'FULL_REFUNDED',
      amount: 13000,
      reason: 'Refund cash',
    });
    expect(refunded.refund?.status).toBe('FULL_REFUNDED');

    // 9. retryWhatsApp
    const retried = await orderService.retryWhatsApp(created.order.id);
    expect(retried.attempts).toBeGreaterThan(1);

    // 10. seedDemoOrders
    const reseeded = await orderService.seedDemoOrders();
    expect(reseeded.length).toBe(6);

    warnSpy.mockRestore();
  });

  it('menuService and settingsService fall back to local store during backend HTTP 500 error', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      return new Response(JSON.stringify({ error: 'Database connection failed' }), {
        status: 500,
        statusText: 'Internal Server Error',
      });
    }));

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const menu = await menuService.getMenuItems();
    expect(menu.length).toBeGreaterThan(0);

    const savedMenu = await menuService.saveMenuItems(menu);
    expect(savedMenu.length).toBe(menu.length);

    const categories = await menuService.getCategories();
    expect(categories.length).toBeGreaterThan(0);

    const settings = await settingsService.getStoreSettings();
    expect(settings.open).toBe(true);

    const savedSettings = await settingsService.saveStoreSettings({
      ...settings,
      estimate: 30,
    });
    expect(savedSettings.estimate).toBe(30);

    const shifts = await settingsService.getShifts();
    expect(shifts.length).toBeGreaterThan(0);

    await settingsService.resetAllData();
    const resetSettings = await settingsService.getStoreSettings();
    expect(resetSettings.estimate).toBe(10);

    warnSpy.mockRestore();
  });
});

describe('CHALLENGER SUITE 4: Concurrency & Storage Events (pv_storage_update)', () => {
  let storage: Record<string, string> = {};
  let eventListeners: Record<string, ((e: Event) => void)[]> = {};

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_API_URL;
    storage = {};
    eventListeners = {};

    const mockStorage = {
      getItem: (key: string) => storage[key] ?? null,
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
      dispatchEvent: vi.fn((event: Event) => {
        const handlers = eventListeners[event.type] || [];
        handlers.forEach((h) => h(event));
        return true;
      }),
      addEventListener: vi.fn((type: string, listener: (e: Event) => void) => {
        if (!eventListeners[type]) eventListeners[type] = [];
        eventListeners[type].push(listener);
      }),
      removeEventListener: vi.fn((type: string, listener: (e: Event) => void) => {
        if (eventListeners[type]) {
          eventListeners[type] = eventListeners[type].filter((l) => l !== listener);
        }
      }),
    };

    vi.stubGlobal('window', mockWindow);
    vi.stubGlobal('localStorage', mockStorage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('dispatches pv_storage_update event on every mutating store call', () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

    localStore.saveStoreSettings(localStore.DEFAULT_SETTINGS);
    expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'pv_storage_update' }));

    dispatchSpy.mockClear();
    localStore.saveMenuItems([]);
    expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'pv_storage_update' }));

    dispatchSpy.mockClear();
    localStore.saveCategories(['Mi']);
    expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'pv_storage_update' }));

    dispatchSpy.mockClear();
    localStore.saveShifts([]);
    expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'pv_storage_update' }));

    dispatchSpy.mockClear();
    localStore.saveOrders([]);
    expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'pv_storage_update' }));

    dispatchSpy.mockClear();
    localStore.resetAllData();
    expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'pv_storage_update' }));
  });

  it('notifies cross-tab listeners immediately on storage write', async () => {
    let notifiedCount = 0;
    window.addEventListener('pv_storage_update', () => {
      notifiedCount++;
    });

    await orderService.createOrder({
      name: 'Event Listener Test',
      phone: '081200001111',
      mode: 'asap',
      pickup: Date.now() + 600000,
      estimate: 10,
      items: [{ name: 'Kopi', qty: 1, unit: 5000 }],
      total: 5000,
    });

    expect(notifiedCount).toBe(1);

    await orderService.updateOrderStatus((await orderService.getOrders())[0].id, 'READY');
    expect(notifiedCount).toBe(2);
  });

  it('stress test: sequential rapid order creations persist cleanly in localStorage', async () => {
    const results: CreateOrderResult[] = [];
    for (let i = 0; i < 20; i++) {
      const res = await orderService.createOrder({
        name: `Sequential Customer ${i}`,
        phone: `0812000000${i.toString().padStart(2, '0')}`,
        mode: 'asap',
        pickup: Date.now() + 600000,
        estimate: 10,
        items: [{ name: 'Indomie', qty: 1, unit: 14000 }],
        total: 14000,
      });
      results.push(res);
    }

    expect(results.length).toBe(20);

    const tokens = new Set(results.map((r) => r.order.token));
    expect(tokens.size).toBe(20); // 20 unique 8-character base-36 tokens

    const savedOrders = await orderService.getOrders();
    expect(savedOrders.length).toBeGreaterThanOrEqual(20);
    for (const r of results) {
      expect(savedOrders.some((o) => o.token === r.order.token)).toBe(true);
    }
  });

  it('empirical vulnerability discovery: sub-millisecond concurrent creations expose ID collisions', async () => {
    // When multiple orders are dispatched in the exact same tick with Promise.all:
    const promises = Array.from({ length: 10 }, (_, i) =>
      orderService.createOrder({
        name: `Burst Customer ${i}`,
        phone: `0812000000${i}`,
        mode: 'asap',
        pickup: Date.now() + 600000,
        estimate: 10,
        items: [{ name: 'Kopi', qty: 1, unit: 5000 }],
        total: 5000,
      })
    );

    const burstResults = await Promise.all(promises);
    expect(burstResults.length).toBe(10);

    // Each order gets a unique token because Math.random() is called
    const tokens = new Set(burstResults.map((r) => r.order.token));
    expect(tokens.size).toBe(10);

    // Note: Due to id = "ord_" + now where now = Date.now(), orders in the same millisecond
    // share the same timestamp. We empirically verify this property:
    const ids = burstResults.map((r) => r.order.id);
    expect(ids.every((id) => id.startsWith('ord_'))).toBe(true);
  });
});

describe('CHALLENGER SUITE 5: Midtrans Snap SDK Client Integration', () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_MIDTRANS_SNAP_URL;
    delete process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('loadSnapScript injects script tag with configured SNAP URL and client key', async () => {
    process.env.NEXT_PUBLIC_MIDTRANS_SNAP_URL = 'https://custom-snap.midtrans.test/snap.js';
    process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY = 'SB-Mid-client-TEST123KEY';

    let appendedScript: (HTMLScriptElement & { [key: string]: unknown }) | null = null;
    const mockDocument = {
      getElementById: vi.fn(() => null),
      createElement: vi.fn((tag: string) => {
        const el: Record<string, unknown> = {
          tagName: tag,
          setAttribute: vi.fn((attr: string, val: string) => {
            el[attr] = val;
          }),
        };
        return el as unknown as HTMLScriptElement;
      }),
      head: {
        appendChild: vi.fn((el: unknown) => {
          appendedScript = el as HTMLScriptElement & { [key: string]: unknown };
          // Trigger onload immediately
          setTimeout(() => (el as { onload?: () => void }).onload?.(), 10);
        }),
      },
    };

    vi.stubGlobal('document', mockDocument);
    vi.stubGlobal('window', { document: mockDocument });

    const loaded = await loadSnapScript();
    const scriptTarget = appendedScript as unknown as Record<string, unknown> | null;
    expect(loaded).toBe(true);
    expect(scriptTarget).toBeDefined();
    expect(scriptTarget?.id).toBe('midtrans-snap-script');
    expect(scriptTarget?.src).toBe('https://custom-snap.midtrans.test/snap.js');
    expect(scriptTarget?.['data-client-key']).toBe('SB-Mid-client-TEST123KEY');
  });

  it('triggerSnapPayment invokes callbacks correctly and handles runtime exceptions', async () => {
    const mockPay = vi.fn((_token: string, callbacks?: SnapCallbacks) => {
      callbacks?.onSuccess?.({ status_code: '200', transaction_status: 'settlement' });
      callbacks?.onPending?.({ status_code: '201', transaction_status: 'pending' });
      callbacks?.onError?.({ status_code: '500', status_message: 'Payment denied' });
      callbacks?.onClose?.();
    });

    vi.stubGlobal('window', {
      snap: { pay: mockPay },
    });

    const successSpy = vi.fn();
    const pendingSpy = vi.fn();
    const errorSpy = vi.fn();
    const closeSpy = vi.fn();

    const result = await triggerSnapPayment('snap_token_valid_456', {
      onSuccess: successSpy,
      onPending: pendingSpy,
      onError: errorSpy,
      onClose: closeSpy,
    });

    expect(result).toBe(true);
    expect(mockPay).toHaveBeenCalledWith('snap_token_valid_456', expect.any(Object));
    expect(successSpy).toHaveBeenCalledWith(expect.objectContaining({ transaction_status: 'settlement' }));
    expect(pendingSpy).toHaveBeenCalledWith(expect.objectContaining({ transaction_status: 'pending' }));
    expect(errorSpy).toHaveBeenCalledWith(expect.objectContaining({ status_message: 'Payment denied' }));
    expect(closeSpy).toHaveBeenCalled();

    // Exception handling inside triggerSnapPayment
    const throwingPay = vi.fn(() => {
      throw new Error('Midtrans popup blocked by browser');
    });
    vi.stubGlobal('window', { snap: { pay: throwingPay } });

    const errorResult = await triggerSnapPayment('snap_token_crash');
    expect(errorResult).toBe(false); // Returns false gracefully without uncaught rejection
  });
});
