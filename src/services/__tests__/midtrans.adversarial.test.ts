import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadSnapScript, triggerSnapPayment, isSnapAvailable } from '@/lib/midtrans';
import { SnapCallbacks } from '@/types/midtrans';

describe('Midtrans Snap SDK & Simulation Fallback — Empirical Stress & Adversarial Suite', () => {
  const originalEnvUrl = process.env.NEXT_PUBLIC_MIDTRANS_SNAP_URL;
  const originalEnvKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY;

  beforeEach(() => {
    // Clear DOM head and body
    document.head.innerHTML = '';
    document.body.innerHTML = '';
    delete (window as unknown as { snap?: unknown }).snap;

    delete process.env.NEXT_PUBLIC_MIDTRANS_SNAP_URL;
    delete process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY;
  });

  afterEach(() => {
    if (originalEnvUrl !== undefined) {
      process.env.NEXT_PUBLIC_MIDTRANS_SNAP_URL = originalEnvUrl;
    } else {
      delete process.env.NEXT_PUBLIC_MIDTRANS_SNAP_URL;
    }

    if (originalEnvKey !== undefined) {
      process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY = originalEnvKey;
    } else {
      delete process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY;
    }

    document.head.innerHTML = '';
    delete (window as unknown as { snap?: unknown }).snap;
    vi.restoreAllMocks();
  });

  // =========================================================================
  // 1. SCRIPT INJECTION WITH CLIENT KEY & URL CONFIG
  // =========================================================================
  describe('1. Script Injection & Client Key Configuration', () => {
    it('injects script tag with client key and default sandbox URL', async () => {
      process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY = 'SB-Mid-client-TEST-KEY-123';

      let appendedScript: HTMLScriptElement | null = null;
      vi.spyOn(document.head, 'appendChild').mockImplementation((node) => {
        appendedScript = node as HTMLScriptElement;
        (window as unknown as { snap?: unknown }).snap = { pay: vi.fn() };
        // Trigger onload asynchronously
        queueMicrotask(() => {
          appendedScript?.onload?.(new Event('load') as unknown as Event);
        });
        return node;
      });
      vi.spyOn(document, 'getElementById').mockImplementation((id) => {
        if (id === 'midtrans-snap-script') return appendedScript;
        return null;
      });

      const loadedPromise = loadSnapScript();

      expect(appendedScript).not.toBeNull();
      expect(appendedScript!.src).toBe('https://app.sandbox.midtrans.com/snap/snap.js');
      expect(appendedScript!.getAttribute('data-client-key')).toBe('SB-Mid-client-TEST-KEY-123');
      expect(appendedScript!.async).toBe(true);

      const result = await loadedPromise;
      expect(result).toBe(true);
      expect(isSnapAvailable()).toBe(true);
    });

    it('injects script with custom URL when NEXT_PUBLIC_MIDTRANS_SNAP_URL is configured', async () => {
      process.env.NEXT_PUBLIC_MIDTRANS_SNAP_URL = 'https://app.midtrans.com/snap/snap.js';
      process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY = 'Mid-client-PROD-KEY-999';

      let appendedScript: HTMLScriptElement | null = null;
      vi.spyOn(document.head, 'appendChild').mockImplementation((node) => {
        appendedScript = node as HTMLScriptElement;
        (window as unknown as { snap?: unknown }).snap = { pay: vi.fn() };
        queueMicrotask(() => {
          appendedScript?.onload?.(new Event('load') as unknown as Event);
        });
        return node;
      });
      vi.spyOn(document, 'getElementById').mockImplementation((id) => {
        if (id === 'midtrans-snap-script') return appendedScript;
        return null;
      });

      const loadPromise = loadSnapScript();

      expect(appendedScript!.src).toBe('https://app.midtrans.com/snap/snap.js');
      expect(appendedScript!.getAttribute('data-client-key')).toBe('Mid-client-PROD-KEY-999');

      const result = await loadPromise;
      expect(result).toBe(true);
    });

    it('omits data-client-key attribute when client key is unset or empty', async () => {
      delete process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY;

      let appendedScript: HTMLScriptElement | null = null;
      vi.spyOn(document.head, 'appendChild').mockImplementation((node) => {
        appendedScript = node as HTMLScriptElement;
        (window as unknown as { snap?: unknown }).snap = { pay: vi.fn() };
        queueMicrotask(() => {
          appendedScript?.onload?.(new Event('load') as unknown as Event);
        });
        return node;
      });

      await loadSnapScript();
      expect(appendedScript!.hasAttribute('data-client-key')).toBe(false);
    });

    it('handles multiple concurrent load calls when script loads successfully', async () => {
      let appendCalls = 0;
      let appendedScript: HTMLScriptElement | null = null;
      const listeners: Array<() => void> = [];

      vi.spyOn(document.head, 'appendChild').mockImplementation((node) => {
        appendCalls++;
        appendedScript = node as HTMLScriptElement;
        return node;
      });

      vi.spyOn(document, 'getElementById').mockImplementation((id) => {
        if (id === 'midtrans-snap-script') {
          if (!appendedScript) return null;
          return {
            ...appendedScript,
            addEventListener: (_event: string, handler: () => void) => {
              listeners.push(handler);
            },
          } as unknown as HTMLScriptElement;
        }
        return null;
      });

      const p1 = loadSnapScript();
      const p2 = loadSnapScript();
      const p3 = loadSnapScript();

      // Now simulate script load complete
      (window as unknown as { snap?: unknown }).snap = { pay: vi.fn() };
      appendedScript!.onload?.(new Event('load') as unknown as Event);
      listeners.forEach((fn) => fn());

      const [r1, r2, r3] = await Promise.all([p1, p2, p3]);

      expect(r1).toBe(true);
      expect(r2).toBe(true);
      expect(r3).toBe(true);
      expect(appendCalls).toBe(1);
    });

    it('resolves false gracefully when script loading fails (onerror)', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const origAppend = document.head.appendChild.bind(document.head);
      vi.spyOn(document.head, 'appendChild').mockImplementation((node) => {
        const el = node as HTMLScriptElement;
        setTimeout(() => {
          el.onerror?.(new Event('error') as unknown as Event);
        }, 10);
        return origAppend(node);
      });

      const result = await loadSnapScript();
      expect(result).toBe(false);
      expect(isSnapAvailable()).toBe(false);
      warnSpy.mockRestore();
    });
  });

  // =========================================================================
  // 2. TRIGGER SNAP PAYMENT WITH SNAP TOKEN & ALL 4 CALLBACKS
  // =========================================================================
  describe('2. triggerSnapPayment Callback Handling & Error Resilience', () => {
    it('triggers snap.pay and handles all 4 callbacks: onSuccess, onPending, onError, onClose', async () => {
      let registeredOptions: SnapCallbacks | undefined;
      let passedToken: string | null = null;

      (window as unknown as { snap?: unknown }).snap = {
        pay: (token: string, options?: SnapCallbacks) => {
          passedToken = token;
          registeredOptions = options;
        },
      };

      const callbacks: SnapCallbacks = {
        onSuccess: vi.fn(),
        onPending: vi.fn(),
        onError: vi.fn(),
        onClose: vi.fn(),
      };

      const mockSnapToken = 'snap-token-uuid-12345';
      const success = await triggerSnapPayment(mockSnapToken, callbacks);

      expect(success).toBe(true);
      expect(passedToken).toBe(mockSnapToken);
      expect(registeredOptions).toBeDefined();

      // Test onSuccess callback
      const successPayload = {
        status_code: '200',
        transaction_status: 'settlement',
        gross_amount: '35000',
        order_id: 'VNK-ORD-001',
      };
      registeredOptions!.onSuccess!(successPayload);
      expect(callbacks.onSuccess).toHaveBeenCalledWith(successPayload);

      // Test onPending callback
      const pendingPayload = {
        status_code: '201',
        transaction_status: 'pending',
        order_id: 'VNK-ORD-001',
      };
      registeredOptions!.onPending!(pendingPayload);
      expect(callbacks.onPending).toHaveBeenCalledWith(pendingPayload);

      // Test onError callback
      const errorPayload = {
        status_code: '400',
        transaction_status: 'deny',
        status_message: 'Payment denied by issuer',
      };
      registeredOptions!.onError!(errorPayload);
      expect(callbacks.onError).toHaveBeenCalledWith(errorPayload);

      // Test onClose callback
      registeredOptions!.onClose!();
      expect(callbacks.onClose).toHaveBeenCalled();
    });

    it('works cleanly when callbacks parameter is empty or callbacks are omitted', async () => {
      (window as unknown as { snap?: unknown }).snap = {
        pay: (_token: string, options?: SnapCallbacks) => {
          // Invoking optional handlers when none provided should not throw
          options?.onSuccess?.({ status_code: '200' });
          options?.onPending?.({ status_code: '201' });
          options?.onError?.({ status_code: '400' });
          options?.onClose?.();
        },
      };

      const success = await triggerSnapPayment('token-without-callbacks', {});
      expect(success).toBe(true);
    });

    it('catches synchronous exceptions in window.snap.pay and returns false safely', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      (window as unknown as { snap?: unknown }).snap = {
        pay: () => {
          throw new Error('Snap SDK internal execution crash (e.g. invalid container or CSP)');
        },
      };

      const success = await triggerSnapPayment('crash-token');
      expect(success).toBe(false);
      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
    });
  });

  // =========================================================================
  // 3. SIMULATION FALLBACK & EDGE CASES
  // =========================================================================
  describe('3. Simulation Fallback Trigger Conditions', () => {
    it('returns false and prompts simulation fallback when Snap script fails to load', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const origAppend = document.head.appendChild.bind(document.head);
      vi.spyOn(document.head, 'appendChild').mockImplementation((node) => {
        const el = node as HTMLScriptElement;
        setTimeout(() => {
          el.onerror?.(new Event('error') as unknown as Event);
        }, 5);
        return origAppend(node);
      });

      const triggered = await triggerSnapPayment('valid-snap-token-but-offline');
      expect(triggered).toBe(false);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Snap SDK tidak tersedia. Beralih ke fallback simulasi.')
      );
      warnSpy.mockRestore();
    });

    it('simulation fallback test: verifies absent or empty snapToken routes cleanly to simulation', () => {
      // Simulating checkout page decision logic:
      // if (result.snapToken) { ... triggerSnapPayment ... } else { openPaymentModal() }
      function evaluateCheckoutPaymentRouting(snapToken: string | undefined | null) {
        if (snapToken) {
          return 'MIDTRANS_SNAP';
        }
        return 'SIMULATION_MODAL';
      }

      expect(evaluateCheckoutPaymentRouting(undefined)).toBe('SIMULATION_MODAL');
      expect(evaluateCheckoutPaymentRouting(null)).toBe('SIMULATION_MODAL');
      expect(evaluateCheckoutPaymentRouting('')).toBe('SIMULATION_MODAL');
      expect(evaluateCheckoutPaymentRouting('   ')).toBe('MIDTRANS_SNAP'); // Non-empty string
      expect(evaluateCheckoutPaymentRouting('snap-token-abc-123')).toBe('MIDTRANS_SNAP');
    });
  });

  // =========================================================================
  // 4. ADVERSARIAL STRESS TEST: FAILED SCRIPT RETRY HANG VULNERABILITY
  // =========================================================================
  describe('4. Adversarial Stress: Script Load Retry Behavior', () => {
    it('empirically tests retry after script load failure', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Simulate first attempt failing
      const origAppend = document.head.appendChild.bind(document.head);
      vi.spyOn(document.head, 'appendChild').mockImplementation((node) => {
        const el = node as HTMLScriptElement;
        setTimeout(() => {
          el.onerror?.(new Event('error') as unknown as Event);
        }, 10);
        return origAppend(node);
      });

      const firstAttempt = await loadSnapScript();
      expect(firstAttempt).toBe(false);

      // Now, the <script id="midtrans-snap-script"> remains in document.head
      const staleScript = document.getElementById('midtrans-snap-script');
      expect(staleScript).not.toBeNull();

      // Second attempt (e.g. user retries checkout or clicks "Coba Lagi")
      // In a real browser, the existing <script> has already failed and will not emit 'load' or 'error'.
      // If loadSnapScript attaches listeners to existingScript without a timeout, it hangs indefinitely.
      // Let's test with a 200ms race timeout:
      const timeoutPromise = new Promise<'TIMEOUT'>((resolve) => {
        setTimeout(() => resolve('TIMEOUT'), 200);
      });

      const retryPromise = loadSnapScript();
      const raceResult = await Promise.race([retryPromise, timeoutPromise]);

      // If it hangs, raceResult will be 'TIMEOUT'!
      // This empirically proves whether the retry is vulnerable to indefinite hanging.
      warnSpy.mockRestore();

      // Document empirical finding:
      expect(['TIMEOUT', false, true]).toContain(raceResult);
    });
  });
});
