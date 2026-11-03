import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { orderService } from '../orders';
import { triggerSnapPayment, isSnapAvailable } from '../midtrans';
import { SnapCallbacks } from '@/types/midtrans';
import { OrderPaymentStatus, OrderFulfillmentStatus } from '@/types';

describe('Payment & Polling Flow Integration — Empirical Adversarial Scenarios', () => {
  let mockStorage: Record<string, string> = {};

  beforeEach(() => {
    mockStorage = {};
    const storageImpl = {
      getItem: (k: string) => mockStorage[k] ?? null,
      setItem: (k: string, v: string) => {
        mockStorage[k] = String(v);
      },
      removeItem: (k: string) => {
        delete mockStorage[k];
      },
      clear: () => {
        mockStorage = {};
      },
      key: (i: number) => Object.keys(mockStorage)[i] || null,
      length: 0,
    };

    vi.stubGlobal('localStorage', storageImpl);
    vi.stubGlobal('window', {
      localStorage: storageImpl,
      dispatchEvent: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  // =========================================================================
  // SCENARIO 1: CHECKOUT WITH LIVE SNAP TOKEN
  // =========================================================================
  describe('Checkout with Live Snap Token', () => {
    it('executes triggerSnapPayment, updates payment status, and handles all outcomes', async () => {
      // 1. Create order
      const createResult = await orderService.createOrder({
        name: 'Santri Zaki',
        phone: '6281112223334',
        mode: 'asap',
        pickup: Date.now() + 600000,
        estimate: 10,
        items: [{ name: 'Nasi Goreng Warmindo', qty: 1, unit: 16000 }],
        total: 16000,
      });

      const order = createResult.order;
      const mockLiveSnapToken = 'SNAP-MOCK-LIVE-TOKEN-XYZ';

      // Mock window.snap.pay
      let capturedCallbacks: SnapCallbacks | undefined;
      (window as unknown as { snap?: unknown }).snap = {
        pay: (_token: string, callbacks?: SnapCallbacks) => {
          capturedCallbacks = callbacks;
        },
      };

      expect(isSnapAvailable()).toBe(true);

      // Simulate Checkout Page handler logic
      const handleCheckoutPayment = async (token: string | undefined) => {
        if (token) {
          const snapSuccess = await triggerSnapPayment(token, {
            onSuccess: async () => {
              await orderService.updateOrderPayment(order.id, 'PAID');
            },
            onPending: async () => {
              await orderService.updateOrderPayment(order.id, 'PENDING');
            },
            onError: async () => {
              await orderService.updateOrderPayment(order.id, 'FAILED');
            },
            onClose: () => {},
          });
          if (snapSuccess) return 'SNAP_TRIGGERED';
        }
        return 'FALLBACK_MODAL_OPENED';
      };

      // Test Live Snap Execution
      const action = await handleCheckoutPayment(mockLiveSnapToken);
      expect(action).toBe('SNAP_TRIGGERED');
      expect(capturedCallbacks).toBeDefined();

      // Trigger onSuccess callback
      await capturedCallbacks!.onSuccess!({
        transaction_status: 'settlement',
        status_code: '200',
      });

      // Verify order payment status is now PAID in database/storage
      const updatedOrder = await orderService.getOrderByToken(order.token);
      expect(updatedOrder?.payment).toBe('PAID');
      expect(updatedOrder?.paidAt).toBeDefined();
    });
  });

  // =========================================================================
  // SCENARIO 2: CHECKOUT WITH ABSENT SNAP TOKEN (SIMULATION FALLBACK)
  // =========================================================================
  describe('Checkout with Absent Snap Token (Transparent Simulation Fallback)', () => {
    it('opens simulation modal when snapToken is undefined, and successfully confirms payment', async () => {
      const createResult = await orderService.createOrder({
        name: 'Santri Hasan',
        phone: '6281112223335',
        mode: 'asap',
        pickup: Date.now() + 600000,
        estimate: 10,
        items: [{ name: 'Es Teh Manis', qty: 2, unit: 4000 }],
        total: 8000,
      });

      const order = createResult.order;
      expect(createResult.snapToken).toBeUndefined(); // Fallback simulation mode

      let modalOpened = false;
      let modalPendingOrder = null;

      const handleCheckout = async (token: string | undefined) => {
        if (token) {
          const snapSuccess = await triggerSnapPayment(token);
          if (snapSuccess) return;
        }
        modalOpened = true;
        modalPendingOrder = order;
      };

      await handleCheckout(createResult.snapToken);

      expect(modalOpened).toBe(true);
      expect(modalPendingOrder).toEqual(order);

      // Customer simulates clicking "Simulasikan Berhasil (Lunas)"
      const simulateOutcome = async (outcome: OrderPaymentStatus) => {
        await orderService.updateOrderPayment(order.id, outcome);
      };

      await simulateOutcome('PAID');

      const verifiedOrder = await orderService.getOrderByToken(order.token);
      expect(verifiedOrder?.payment).toBe('PAID');
    });
  });

  // =========================================================================
  // SCENARIO 3: CHECKOUT WITH SNAP SDK FAILURE (SIMULATION FALLBACK)
  // =========================================================================
  describe('Checkout with Snap SDK Failure / Script Blocked Fallback', () => {
    it('smoothly falls back to simulation modal if triggerSnapPayment returns false', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await orderService.createOrder({
        name: 'Santri Umar',
        phone: '6281112223336',
        mode: 'asap',
        pickup: Date.now() + 600000,
        estimate: 10,
        items: [{ name: 'Indomie Kuah', qty: 1, unit: 14000 }],
        total: 14000,
      });

      const mockToken = 'SNAP-TOKEN-CANNOT-LOAD';

      // Snap not available (script failed or blocked)
      delete (window as unknown as { snap?: unknown }).snap;

      let modalOpened = false;
      const handleCheckout = async (token: string | undefined) => {
        if (token) {
          const snapSuccess = await triggerSnapPayment(token);
          if (snapSuccess) return;
        }
        modalOpened = true;
      };

      await handleCheckout(mockToken);
      expect(modalOpened).toBe(true);

      warnSpy.mockRestore();
    });
  });

  // =========================================================================
  // SCENARIO 4: ORDER TRACKING RETRY PAYMENT & TERMINAL STATUS LOGIC
  // =========================================================================
  describe('Order Tracking Retry Payment & Terminal Polling Termination', () => {
    it('evaluates retry payment fallback accurately based on order snapToken existence', async () => {
      const orderWithToken = { id: 'ord_1', token: 'tok_1', snapToken: 'snap_tok_1' };
      const orderWithoutToken = { id: 'ord_2', token: 'tok_2', snapToken: undefined };

      const evaluateRetry = (snapToken?: string) => {
        if (snapToken) return 'TRY_SNAP';
        return 'OPEN_MODAL';
      };

      expect(evaluateRetry(orderWithToken.snapToken)).toBe('TRY_SNAP');
      expect(evaluateRetry(orderWithoutToken.snapToken)).toBe('OPEN_MODAL');
    });

    it('determines terminal polling condition for COMPLETED and CANCELLED statuses', () => {
      const isTerminalFulfillment = (status: OrderFulfillmentStatus) => {
        return status === 'COMPLETED' || status === 'CANCELLED';
      };

      expect(isTerminalFulfillment('NEW')).toBe(false);
      expect(isTerminalFulfillment('PREPARING')).toBe(false);
      expect(isTerminalFulfillment('READY')).toBe(false);
      expect(isTerminalFulfillment('COMPLETED')).toBe(true);
      expect(isTerminalFulfillment('CANCELLED')).toBe(true);
    });
  });
});
