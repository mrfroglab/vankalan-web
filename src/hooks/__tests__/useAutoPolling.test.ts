import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useAutoPolling, UseAutoPollingReturn, UseAutoPollingOptions } from '../useAutoPolling';

// Enable React act environment flag
// @ts-expect-error global declaration for React test environment
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('useAutoPolling Hook', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.useFakeTimers();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  function renderHookWithComponent(
    callback: () => Promise<void> | void,
    options?: UseAutoPollingOptions
  ) {
    let hookResult: UseAutoPollingReturn | null = null;

    function TestComponent() {
      hookResult = useAutoPolling(callback, options);
      return React.createElement('div', null, 'polling-test');
    }

    act(() => {
      root.render(React.createElement(TestComponent));
    });

    return {
      get current() {
        return hookResult!;
      },
    };
  }

  it('initializes and executes callback on immediate mode', async () => {
    let count = 0;
    const callback = vi.fn(async () => {
      count++;
    });

    const hook = renderHookWithComponent(callback, {
      intervalMs: 12000,
      immediate: true,
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(count).toBe(1);
    expect(hook.current).toBeDefined();
    expect(typeof hook.current.refresh).toBe('function');
  });

  it('polls periodically based on intervalMs', async () => {
    let count = 0;
    const callback = vi.fn(async () => {
      count++;
    });

    renderHookWithComponent(callback, {
      intervalMs: 12000,
      immediate: false,
    });

    expect(count).toBe(0);

    // Advance 12 seconds
    await act(async () => {
      vi.advanceTimersByTime(12000);
      await Promise.resolve();
    });

    expect(count).toBe(1);

    // Advance another 12 seconds
    await act(async () => {
      vi.advanceTimersByTime(12000);
      await Promise.resolve();
    });

    expect(count).toBe(2);
  });

  it('pauses periodic polling when document is hidden and resumes when visible', async () => {
    let count = 0;
    const callback = vi.fn(async () => {
      count++;
    });

    renderHookWithComponent(callback, {
      intervalMs: 12000,
      immediate: false,
      pauseOnHidden: true,
    });

    // Simulate tab hidden
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'hidden',
    });

    // Timer fires while hidden: should NOT call callback
    await act(async () => {
      vi.advanceTimersByTime(12000);
      await Promise.resolve();
    });

    expect(count).toBe(0);

    // Tab becomes visible: should immediately trigger callback
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    });

    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
      await Promise.resolve();
    });

    expect(count).toBe(1);
  });

  it('triggers on pv_storage_update custom event', async () => {
    let count = 0;
    const callback = vi.fn(async () => {
      count++;
    });

    renderHookWithComponent(callback, {
      intervalMs: 12000,
      immediate: false,
      listenStorage: true,
    });

    expect(count).toBe(0);

    await act(async () => {
      window.dispatchEvent(new Event('pv_storage_update'));
      await Promise.resolve();
    });

    expect(count).toBe(1);
  });

  it('prevents overlapping requests with in-flight concurrency guard', async () => {
    let callCount = 0;
    let finishFirst: () => void;
    const slowPromise = new Promise<void>((resolve) => {
      finishFirst = resolve;
    });

    const callback = vi.fn(async () => {
      callCount++;
      if (callCount === 1) {
        await slowPromise;
      }
    });

    const hook = renderHookWithComponent(callback, {
      intervalMs: 12000,
      immediate: false,
    });

    // Trigger first request (which hangs on slowPromise)
    let p1: Promise<void>;
    act(() => {
      p1 = hook.current.refresh();
    });

    // Attempt second request while first is in-flight
    let p2: Promise<void>;
    act(() => {
      p2 = hook.current.refresh();
    });

    // Finish slow promise
    await act(async () => {
      finishFirst!();
      await Promise.all([p1, p2]);
    });

    // In-flight guard ensures only 1 execution ran
    expect(callCount).toBe(1);
  });
});
