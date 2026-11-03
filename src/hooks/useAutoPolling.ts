'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

export interface UseAutoPollingOptions {
  /**
   * Polling interval in milliseconds.
   * Default: 12000 (12 seconds, within recommended 10–15s range).
   */
  intervalMs?: number;

  /**
   * Whether polling is currently active.
   * Default: true.
   * Can be toggled to false (e.g. on COMPLETED / CANCELLED orders).
   */
  enabled?: boolean;

  /**
   * Pause polling when document tab is hidden.
   * Default: true.
   */
  pauseOnHidden?: boolean;

  /**
   * Pause polling when browser is offline.
   * Default: true.
   */
  pauseWhenOffline?: boolean;

  /**
   * Listen to window 'storage' and 'pv_storage_update' events for instantaneous local sync.
   * Default: true.
   */
  listenStorage?: boolean;

  /**
   * Whether to run the callback immediately upon mount or re-enabling.
   * Default: true.
   */
  immediate?: boolean;
}

export interface UseAutoPollingReturn {
  isPolling: boolean;
  refresh: () => Promise<void>;
  lastPolledAt: number | null;
}

export function useAutoPolling(
  callback: () => Promise<void> | void,
  options: UseAutoPollingOptions = {}
): UseAutoPollingReturn {
  const {
    intervalMs = 12000,
    enabled = true,
    pauseOnHidden = true,
    pauseWhenOffline = true,
    listenStorage = true,
    immediate = true,
  } = options;

  const [isPolling, setIsPolling] = useState<boolean>(false);
  const [lastPolledAt, setLastPolledAt] = useState<number | null>(null);

  const savedCallback = useRef(callback);
  const inFlightRef = useRef(false);
  const isMountedRef = useRef(true);

  // Keep latest callback reference without retriggering effect
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  const execute = useCallback(async () => {
    // Prevent overlapping in-flight executions
    if (inFlightRef.current) {
      return;
    }

    inFlightRef.current = true;
    if (isMountedRef.current) {
      setIsPolling(true);
    }

    try {
      await savedCallback.current();
      if (isMountedRef.current) {
        setLastPolledAt(Date.now());
      }
    } catch (err) {
      console.warn('[useAutoPolling] Error during polling execution:', err);
    } finally {
      inFlightRef.current = false;
      if (isMountedRef.current) {
        setIsPolling(false);
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;

    if (!enabled) {
      return;
    }

    // Immediate execution on mount or enabling
    if (immediate) {
      execute();
    }

    // Set up periodic interval timer
    const timer = setInterval(() => {
      // Check visibility state
      if (
        pauseOnHidden &&
        typeof document !== 'undefined' &&
        document.visibilityState === 'hidden'
      ) {
        return;
      }

      // Check online status
      if (
        pauseWhenOffline &&
        typeof navigator !== 'undefined' &&
        !navigator.onLine
      ) {
        return;
      }

      execute();
    }, intervalMs);

    // Tab visibility change handler
    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        if (!pauseWhenOffline || (typeof navigator !== 'undefined' && navigator.onLine)) {
          execute();
        }
      }
    };

    // Online event handler
    const handleOnline = () => {
      if (
        !pauseOnHidden ||
        (typeof document !== 'undefined' && document.visibilityState === 'visible')
      ) {
        execute();
      }
    };

    // Storage update event handler (cross-tab and local prototype reactivity)
    const handleStorageUpdate = () => {
      execute();
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline);

      if (listenStorage) {
        window.addEventListener('storage', handleStorageUpdate);
        window.addEventListener('pv_storage_update', handleStorageUpdate);
      }
    }

    return () => {
      isMountedRef.current = false;
      clearInterval(timer);

      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }

      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleOnline);

        if (listenStorage) {
          window.removeEventListener('storage', handleStorageUpdate);
          window.removeEventListener('pv_storage_update', handleStorageUpdate);
        }
      }
    };
  }, [
    enabled,
    intervalMs,
    pauseOnHidden,
    pauseWhenOffline,
    listenStorage,
    immediate,
    execute,
  ]);

  return {
    isPolling,
    refresh: execute,
    lastPolledAt,
  };
}
