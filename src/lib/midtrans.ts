/**
 * Midtrans Snap SDK client-side script loader and payment trigger helper.
 * Handles dynamic script injection, sandbox/production URL fallback,
 * and graceful fallback when offline or script is blocked.
 */

import { SnapCallbacks } from '@/types/midtrans';

const SNAP_SCRIPT_ID = 'midtrans-snap-script';
const DEFAULT_SANDBOX_SNAP_URL = 'https://app.sandbox.midtrans.com/snap/snap.js';

export function isSnapAvailable(): boolean {
  return typeof window !== 'undefined' && Boolean(window.snap);
}

export function loadSnapScript(): Promise<boolean> {
  if (typeof window === 'undefined') {
    return Promise.resolve(false);
  }

  if (window.snap) {
    return Promise.resolve(true);
  }

  if (typeof document === 'undefined') {
    return Promise.resolve(false);
  }

  return new Promise((resolve) => {
    const existingScript = document.getElementById(SNAP_SCRIPT_ID) as HTMLScriptElement | null;
    if (existingScript) {
      if (window.snap) {
        return resolve(true);
      }
      existingScript.addEventListener('load', () => resolve(true), { once: true });
      existingScript.addEventListener('error', () => resolve(false), { once: true });
      return;
    }

    const scriptUrl =
      process.env.NEXT_PUBLIC_MIDTRANS_SNAP_URL?.trim() || DEFAULT_SANDBOX_SNAP_URL;
    const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY?.trim() || '';

    const script = document.createElement('script');
    script.id = SNAP_SCRIPT_ID;
    script.src = scriptUrl;
    if (clientKey) {
      script.setAttribute('data-client-key', clientKey);
    }
    script.async = true;

    script.onload = () => {
      resolve(true);
    };

    script.onerror = (err) => {
      console.warn('[Midtrans] Gagal memuat script Midtrans Snap JS:', err);
      resolve(false);
    };

    document.head.appendChild(script);
  });
}

export async function triggerSnapPayment(
  snapToken: string,
  callbacks: SnapCallbacks = {}
): Promise<boolean> {
  if (typeof window === 'undefined') {
    return false;
  }

  const loaded = await loadSnapScript();
  if (!loaded || !window.snap) {
    console.warn('[Midtrans] Snap SDK tidak tersedia. Beralih ke fallback simulasi.');
    return false;
  }

  try {
    window.snap.pay(snapToken, {
      onSuccess: (result) => callbacks.onSuccess?.(result),
      onPending: (result) => callbacks.onPending?.(result),
      onError: (result) => callbacks.onError?.(result),
      onClose: () => callbacks.onClose?.(),
    });
    return true;
  } catch (err) {
    console.error('[Midtrans] Eksekusi window.snap.pay gagal:', err);
    return false;
  }
}
