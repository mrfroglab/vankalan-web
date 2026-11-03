import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useAutoPolling, UseAutoPollingReturn, UseAutoPollingOptions } from '../useAutoPolling';

// @ts-expect-error global declaration for React test environment
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('useAutoPolling Hook — Empirical Stress & Adversarial Test Suite', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.useFakeTimers();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    // Reset default document/navigator state
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    });
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: true,
    });
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function renderHookWithComponent(
    callback: () => Promise<void> | void,
    options?: UseAutoPollingOptions
  ) {
    let hookResult: UseAutoPollingReturn | null = null;

    function TestComponent({ opts }: { opts?: UseAutoPollingOptions }) {
      hookResult = useAutoPolling(callback, opts ?? options);
      return React.createElement('div', null, 'polling-test-target');
    }

    act(() => {
      root.render(React.createElement(TestComponent, { opts: options }));
    });

    return {
      get current() {
        return hookResult!;
      },
      rerender(newOpts: UseAutoPollingOptions) {
        act(() => {
          root.render(React.createElement(TestComponent, { opts: newOpts }));
        });
      },
    };
  }

  // =========================================================================
  // 1. TIMING ACCURACY
  // =========================================================================
  describe('1. Timing Accuracy & Intervals', () => {
    it('accurately respects configured interval (10,000ms / 10s)', async () => {
      let callCount = 0;
      const callback = vi.fn(async () => {
        callCount++;
      });

      renderHookWithComponent(callback, {
        intervalMs: 10000,
        immediate: false,
      });

      expect(callCount).toBe(0);

      // Advance to 9,999ms (1ms before interval)
      await act(async () => {
        vi.advanceTimersByTime(9999);
      });
      expect(callCount).toBe(0);

      // Advance 1ms to reach 10,000ms exactly
      await act(async () => {
        vi.advanceTimersByTime(1);
      });
      expect(callCount).toBe(1);

      // Advance to 20,000ms
      await act(async () => {
        vi.advanceTimersByTime(10000);
      });
      expect(callCount).toBe(2);

      // Advance to 30,000ms
      await act(async () => {
        vi.advanceTimersByTime(10000);
      });
      expect(callCount).toBe(3);
    });

    it('accurately respects 15,000ms (15s) interval with immediate: true', async () => {
      let callCount = 0;
      const callback = vi.fn(async () => {
        callCount++;
      });

      const hook = renderHookWithComponent(callback, {
        intervalMs: 15000,
        immediate: true,
      });

      // Allow immediate execute() microtask to settle inside act
      await act(async () => {
        await Promise.resolve();
      });

      // Immediate call on mount
      expect(callCount).toBe(1);
      expect(hook.current.lastPolledAt).toBeGreaterThan(0);

      const firstTimestamp = hook.current.lastPolledAt;

      // Advance 15s
      await act(async () => {
        vi.advanceTimersByTime(15000);
      });
      expect(callCount).toBe(2);
      expect(hook.current.lastPolledAt).toBeGreaterThanOrEqual(firstTimestamp!);

      // Advance another 15s
      await act(async () => {
        vi.advanceTimersByTime(15000);
      });
      expect(callCount).toBe(3);
    });
  });

  // =========================================================================
  // 2. MEMORY LEAK & LIFECYCLE AUDIT
  // =========================================================================
  describe('2. Memory Leak & Event Listener Unregistration', () => {
    it('unregisters 100% of event listeners and clears interval timer on unmount', async () => {
      const activeWindowListeners = new Map<string, Set<EventListenerOrEventListenerObject>>();
      const activeDocListeners = new Map<string, Set<EventListenerOrEventListenerObject>>();

      const origWindowAdd = window.addEventListener.bind(window);
      const origWindowRemove = window.removeEventListener.bind(window);
      const origDocAdd = document.addEventListener.bind(document);
      const origDocRemove = document.removeEventListener.bind(document);

      vi.spyOn(window, 'addEventListener').mockImplementation((type, listener, options) => {
        if (!activeWindowListeners.has(type)) activeWindowListeners.set(type, new Set());
        activeWindowListeners.get(type)!.add(listener);
        return origWindowAdd(type, listener, options);
      });

      vi.spyOn(window, 'removeEventListener').mockImplementation((type, listener, options) => {
        activeWindowListeners.get(type)?.delete(listener);
        return origWindowRemove(type, listener, options);
      });

      vi.spyOn(document, 'addEventListener').mockImplementation((type, listener, options) => {
        if (!activeDocListeners.has(type)) activeDocListeners.set(type, new Set());
        activeDocListeners.get(type)!.add(listener);
        return origDocAdd(type, listener, options);
      });

      vi.spyOn(document, 'removeEventListener').mockImplementation((type, listener, options) => {
        activeDocListeners.get(type)?.delete(listener);
        return origDocRemove(type, listener, options);
      });

      const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');

      const callback = vi.fn();
      renderHookWithComponent(callback, {
        intervalMs: 12000,
        immediate: false,
        listenStorage: true,
        pauseOnHidden: true,
        pauseWhenOffline: true,
      });

      // Verify listeners were registered
      expect(activeDocListeners.get('visibilitychange')?.size).toBe(1);
      expect(activeWindowListeners.get('online')?.size).toBe(1);
      expect(activeWindowListeners.get('storage')?.size).toBe(1);
      expect(activeWindowListeners.get('pv_storage_update')?.size).toBe(1);

      // Now unmount the component
      await act(async () => {
        root.unmount();
      });

      // Verify timer was cleared
      expect(clearIntervalSpy).toHaveBeenCalled();

      // Verify 100% of hook event listeners were removed
      expect(activeDocListeners.get('visibilitychange')?.size ?? 0).toBe(0);
      expect(activeWindowListeners.get('online')?.size ?? 0).toBe(0);
      expect(activeWindowListeners.get('storage')?.size ?? 0).toBe(0);
      expect(activeWindowListeners.get('pv_storage_update')?.size ?? 0).toBe(0);
    });

    it('safely handles in-flight asynchronous resolution after unmount without crashing', async () => {
      let resolveSlowPromise!: () => void;
      const slowPromise = new Promise<void>((res) => {
        resolveSlowPromise = res;
      });

      const warnSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const callback = vi.fn(async () => {
        await slowPromise;
      });

      const hook = renderHookWithComponent(callback, {
        intervalMs: 12000,
        immediate: false,
      });

      // Start in-flight refresh
      let refreshPromise: Promise<void>;
      act(() => {
        refreshPromise = hook.current.refresh();
      });

      // Unmount while request is in-flight
      await act(async () => {
        root.unmount();
      });

      // Now resolve the pending async operation
      await act(async () => {
        resolveSlowPromise();
        await refreshPromise;
      });

      // Must not produce React unmounted state update errors
      expect(warnSpy).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });

  // =========================================================================
  // 3. VISIBILITY STATE TRANSITIONS
  // =========================================================================
  describe('3. Visibility State Transitions', () => {
    it('pauses polling when tab is hidden and triggers immediately when visible', async () => {
      let callCount = 0;
      const callback = vi.fn(async () => {
        callCount++;
      });

      renderHookWithComponent(callback, {
        intervalMs: 10000,
        immediate: false,
        pauseOnHidden: true,
      });

      // 1. Hide the document
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        value: 'hidden',
      });

      // Advance 30 seconds (3 polling cycles while hidden)
      await act(async () => {
        vi.advanceTimersByTime(30000);
      });

      // Nothing should have been called while hidden
      expect(callCount).toBe(0);

      // 2. Switch back to visible
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        value: 'visible',
      });

      // Dispatch visibilitychange event
      await act(async () => {
        document.dispatchEvent(new Event('visibilitychange'));
      });

      // Should have triggered immediately!
      expect(callCount).toBe(1);

      // Next interval tick while visible should call normally
      await act(async () => {
        vi.advanceTimersByTime(10000);
      });
      expect(callCount).toBe(2);
    });

    it('does NOT trigger on visibilitychange if browser is offline and pauseWhenOffline is true', async () => {
      let callCount = 0;
      const callback = vi.fn(async () => {
        callCount++;
      });

      renderHookWithComponent(callback, {
        intervalMs: 10000,
        immediate: false,
        pauseOnHidden: true,
        pauseWhenOffline: true,
      });

      // Hidden AND offline
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        value: 'hidden',
      });
      Object.defineProperty(navigator, 'onLine', {
        configurable: true,
        value: false,
      });

      // Tab becomes visible but still offline
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        value: 'visible',
      });

      await act(async () => {
        document.dispatchEvent(new Event('visibilitychange'));
      });

      expect(callCount).toBe(0);
    });
  });

  // =========================================================================
  // 4. OFFLINE STATE TRANSITIONS
  // =========================================================================
  describe('4. Offline State Transitions', () => {
    it('pauses polling when offline and triggers immediately upon online event', async () => {
      let callCount = 0;
      const callback = vi.fn(async () => {
        callCount++;
      });

      renderHookWithComponent(callback, {
        intervalMs: 10000,
        immediate: false,
        pauseWhenOffline: true,
      });

      // Go offline
      Object.defineProperty(navigator, 'onLine', {
        configurable: true,
        value: false,
      });

      // Advance 3 intervals (30s) while offline
      await act(async () => {
        vi.advanceTimersByTime(30000);
      });

      expect(callCount).toBe(0);

      // Come back online
      Object.defineProperty(navigator, 'onLine', {
        configurable: true,
        value: true,
      });

      await act(async () => {
        window.dispatchEvent(new Event('online'));
      });

      // Immediately triggers
      expect(callCount).toBe(1);

      // Normal interval continues
      await act(async () => {
        vi.advanceTimersByTime(10000);
      });
      expect(callCount).toBe(2);
    });

    it('does NOT trigger online event refresh if tab is hidden and pauseOnHidden is true', async () => {
      let callCount = 0;
      const callback = vi.fn(async () => {
        callCount++;
      });

      renderHookWithComponent(callback, {
        intervalMs: 10000,
        immediate: false,
        pauseOnHidden: true,
        pauseWhenOffline: true,
      });

      // Tab hidden
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        value: 'hidden',
      });

      // Online event fires while tab hidden
      Object.defineProperty(navigator, 'onLine', {
        configurable: true,
        value: true,
      });

      await act(async () => {
        window.dispatchEvent(new Event('online'));
      });

      expect(callCount).toBe(0);
    });
  });

  // =========================================================================
  // 5. IN-FLIGHT MUTEX & CONCURRENCY STRESS
  // =========================================================================
  describe('5. In-Flight Mutex Concurrency Guard', () => {
    it('strictly prevents overlapping executions when response time exceeds interval', async () => {
      let activeExecutions = 0;
      let maxConcurrentExecutions = 0;
      let completedExecutions = 0;

      let resolveSlowRequest!: () => void;

      const callback = vi.fn(async () => {
        activeExecutions++;
        if (activeExecutions > maxConcurrentExecutions) {
          maxConcurrentExecutions = activeExecutions;
        }

        // Simulate 25-second slow backend response
        await new Promise<void>((res) => {
          resolveSlowRequest = res;
        });

        activeExecutions--;
        completedExecutions++;
      });

      renderHookWithComponent(callback, {
        intervalMs: 10000, // 10s interval
        immediate: false,
      });

      // t=10s: Interval triggers first request
      await act(async () => {
        vi.advanceTimersByTime(10000);
      });
      expect(callback).toHaveBeenCalledTimes(1);
      expect(activeExecutions).toBe(1);

      // t=20s: Interval fires again while request #1 is still in-flight
      await act(async () => {
        vi.advanceTimersByTime(10000);
      });
      // Should NOT start another execution
      expect(callback).toHaveBeenCalledTimes(1);
      expect(activeExecutions).toBe(1);

      // Now resolve request #1 at t=25s
      await act(async () => {
        resolveSlowRequest();
      });
      expect(completedExecutions).toBe(1);
      expect(activeExecutions).toBe(0);

      // t=30s: Next interval fires -> should now cleanly trigger request #2
      await act(async () => {
        vi.advanceTimersByTime(10000);
      });
      expect(callback).toHaveBeenCalledTimes(2);

      // Clean up request #2
      await act(async () => {
        resolveSlowRequest();
      });

      expect(maxConcurrentExecutions).toBe(1);
    });

    it('survives an adversarial burst of 50 concurrent manual refreshes with zero overlap', async () => {
      let activeExecutions = 0;
      let peakConcurrency = 0;
      let totalRuns = 0;

      let finishPending!: () => void;

      const callback = vi.fn(async () => {
        activeExecutions++;
        if (activeExecutions > peakConcurrency) {
          peakConcurrency = activeExecutions;
        }
        totalRuns++;
        await new Promise<void>((r) => {
          finishPending = r;
        });
        activeExecutions--;
      });

      const hook = renderHookWithComponent(callback, {
        intervalMs: 12000,
        immediate: false,
      });

      // Fire 50 simultaneous refresh calls
      const burstPromises: Promise<void>[] = [];
      act(() => {
        for (let i = 0; i < 50; i++) {
          burstPromises.push(hook.current.refresh());
        }
      });

      expect(totalRuns).toBe(1);
      expect(activeExecutions).toBe(1);
      expect(peakConcurrency).toBe(1);

      // Resolve the in-flight request
      await act(async () => {
        finishPending();
        await Promise.all(burstPromises);
      });

      expect(activeExecutions).toBe(0);
      expect(totalRuns).toBe(1);
    });

    it('releases in-flight mutex lock even if the polling callback throws an error', async () => {
      let shouldThrow = true;
      let runCount = 0;

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const callback = vi.fn(async () => {
        runCount++;
        if (shouldThrow) {
          throw new Error('500 Internal Server Error in Polling Callback');
        }
      });

      const hook = renderHookWithComponent(callback, {
        intervalMs: 10000,
        immediate: false,
      });

      // First run throws
      await act(async () => {
        await hook.current.refresh();
      });
      expect(runCount).toBe(1);
      expect(hook.current.isPolling).toBe(false);

      // Second run succeeds (mutex lock must have been cleanly released in finally)
      shouldThrow = false;
      await act(async () => {
        await hook.current.refresh();
      });
      expect(runCount).toBe(2);

      warnSpy.mockRestore();
    });
  });

  // =========================================================================
  // 6. TERMINAL STATUS TERMINATION (Order Fulfillment / Enabled Prop)
  // =========================================================================
  describe('6. Terminal Status Termination', () => {
    it('stops polling when order status becomes COMPLETED or CANCELLED (enabled=false)', async () => {
      let callCount = 0;
      const callback = vi.fn(async () => {
        callCount++;
      });

      type FulfillmentStatus = 'NEW' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';

      function OrderTrackerSimulation({ status }: { status: FulfillmentStatus }) {
        const isTerminal = status === 'COMPLETED' || status === 'CANCELLED';
        useAutoPolling(callback, {
          intervalMs: 10000,
          enabled: !isTerminal,
          immediate: false,
        });
        return React.createElement('div', null, `Status: ${status}`);
      }

      // 1. Initial status: NEW (enabled: true)
      act(() => {
        root.render(React.createElement(OrderTrackerSimulation, { status: 'NEW' }));
      });

      await act(async () => {
        vi.advanceTimersByTime(10000);
      });
      expect(callCount).toBe(1);

      // 2. Status: PREPARING (enabled: true)
      act(() => {
        root.render(React.createElement(OrderTrackerSimulation, { status: 'PREPARING' }));
      });
      await act(async () => {
        vi.advanceTimersByTime(10000);
      });
      expect(callCount).toBe(2);

      // 3. Status transitions to COMPLETED (terminal! enabled: false)
      act(() => {
        root.render(React.createElement(OrderTrackerSimulation, { status: 'COMPLETED' }));
      });

      // Advance by 60 seconds (6 polling cycles)
      await act(async () => {
        vi.advanceTimersByTime(60000);
      });

      // Must remain at 2 calls — zero polling during terminal state
      expect(callCount).toBe(2);
    });

    it('stops polling when status is CANCELLED and resumes if order is reset to NEW', async () => {
      let callCount = 0;
      const callback = vi.fn(async () => {
        callCount++;
      });

      type FulfillmentStatus = 'NEW' | 'CANCELLED';

      function OrderTrackerSimulation({ status }: { status: FulfillmentStatus }) {
        const isTerminal = status === 'CANCELLED';
        useAutoPolling(callback, {
          intervalMs: 10000,
          enabled: !isTerminal,
          immediate: false,
        });
        return React.createElement('div', null, `Status: ${status}`);
      }

      // 1. Mount with CANCELLED (enabled: false)
      act(() => {
        root.render(React.createElement(OrderTrackerSimulation, { status: 'CANCELLED' }));
      });

      await act(async () => {
        vi.advanceTimersByTime(30000);
      });
      expect(callCount).toBe(0);

      // 2. Order reset to NEW (enabled: true)
      act(() => {
        root.render(React.createElement(OrderTrackerSimulation, { status: 'NEW' }));
      });

      // Should resume polling
      await act(async () => {
        vi.advanceTimersByTime(10000);
      });
      expect(callCount).toBe(1);
    });
  });
});
