'use client';

import { sectionTitleClass } from '@/components/ui/styles';
import { buttonClass } from '@/components/ui/Button';
import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Loader2, LogOut, MessageCircle, RotateCcw, Smartphone } from 'lucide-react';
import { apiRequest, isBackendConfigured } from '@/services/client';

type WaStatus =
  | { configured: false }
  | {
      configured: true;
      reachable: true;
      status: string;
      needsQr: boolean;
      account?: { id: string; name: string | null };
    }
  | { configured: true; reachable: false; error: string };

/** QR WhatsApp berganti tiap ~20 detik; gambar diambil ulang lebih sering dari itu. */
const QR_REFRESH_MS = 15_000;

/**
 * Login WhatsApp pengirim notifikasi (sesi WAHA) langsung dari dashboard dapur:
 * tampilkan QR untuk discan, status sesi, serta mulai ulang / keluar.
 */
export function WhatsAppLoginCard() {
  const [state, setState] = useState<WaStatus | null>(null);
  const [qrTick, setQrTick] = useState(() => Date.now());
  const [qrFailed, setQrFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setState(await apiRequest<WaStatus>('/api/wa/status'));
    } catch (e) {
      setState({ configured: true, reachable: false, error: (e as Error).message });
    }
  }, []);

  const scanning = state?.configured && state.reachable && state.status === 'SCAN_QR_CODE';
  const working = state?.configured && state.reachable && state.status === 'WORKING';

  // Status dicek cepat selama belum terhubung (supaya langsung tahu begitu QR discan).
  useEffect(() => {
    if (!isBackendConfigured()) return;
    load();
    const id = setInterval(load, working ? 30_000 : 3_000);
    return () => clearInterval(id);
  }, [load, working]);

  useEffect(() => {
    if (!scanning) return;
    const id = setInterval(() => {
      setQrFailed(false);
      setQrTick(Date.now());
    }, QR_REFRESH_MS);
    return () => clearInterval(id);
  }, [scanning]);

  const act = async (action: 'start' | 'restart' | 'logout') => {
    if (
      action === 'logout' &&
      !window.confirm('Keluarkan WhatsApp ini? Notifikasi pesanan berhenti sampai QR discan lagi.')
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      setState(await apiRequest<WaStatus>('/api/wa/session', { method: 'POST', body: JSON.stringify({ action }) }));
      setQrFailed(false);
      setQrTick(Date.now());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (!isBackendConfigured() || (state && !state.configured)) return null;

  const status = state?.configured && state.reachable ? state.status : null;
  const unreachable = state?.configured && !state.reachable ? state.error : null;
  const starting = status === 'STARTING';
  const canStart = status === 'STOPPED' || status === 'FAILED' || (unreachable && /404/.test(unreachable));

  return (
    <section
      id="whatsapp"
      className="bg-white border border-line rounded-2xl p-5 shadow-card space-y-4 scroll-mt-24"
    >
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full bg-cream flex items-center justify-center text-ink">
          <MessageCircle className={`w-4 h-4 ${working ? 'text-success' : 'text-danger'}`} />
        </div>
        <div>
          <h3 className={sectionTitleClass}>Login WhatsApp Notifikasi</h3>
          <span className="text-xs text-muted">Nomor WA yang mengirim pesanan ke penjaga</span>
        </div>
      </div>

      <div className="p-4 bg-surface-muted rounded-2xl border border-line space-y-3">
        {!state && (
          <p className="text-xs text-muted flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Memeriksa sesi WhatsApp…
          </p>
        )}

        {working && state?.configured && state.reachable && (
          <div className="space-y-3">
            <p className="text-sm font-bold text-success-ink flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 shrink-0" /> WhatsApp terhubung
            </p>
            {state.account && (
              <p className="text-xs text-muted">
                Sebagai <b className="text-ink">{state.account.name || 'tanpa nama'}</b> (+{state.account.id})
              </p>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={() => act('logout')}
              className={buttonClass('danger', 'md', 'w-full justify-center')}
            >
              <LogOut className="w-4 h-4" /> Keluar / Ganti Nomor
            </button>
          </div>
        )}

        {scanning && (
          <div className="space-y-3">
            <div className="mx-auto w-full max-w-[264px] aspect-square bg-white rounded-xl border border-line p-2 flex items-center justify-center">
              {qrFailed ? (
                <span className="text-xs text-muted flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Menyiapkan QR…
                </span>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element -- gambar dinamis dari API admin, tanpa cache
                <img
                  src={`/api/wa/qr?t=${qrTick}`}
                  alt="QR login WhatsApp"
                  className="w-full h-full object-contain [image-rendering:pixelated]"
                  onError={() => setQrFailed(true)}
                />
              )}
            </div>
            <ol className="text-xs text-ink-soft space-y-1 list-decimal pl-4 leading-relaxed">
              <li>Buka WhatsApp di HP nomor warung.</li>
              <li>
                Ketuk <b>⋮</b> / <b>Setelan</b> → <b>Perangkat tertaut</b> → <b>Tautkan perangkat</b>.
              </li>
              <li>Arahkan kamera ke QR ini. Status berubah sendiri begitu berhasil.</li>
            </ol>
            <p className="text-2xs text-subtle flex items-start gap-1.5">
              <Smartphone className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              Buka halaman ini di laptop/tablet/HP lain: QR tidak bisa discan dari layar HP itu sendiri.
            </p>
          </div>
        )}

        {starting && (
          <p className="text-xs text-muted flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Sesi sedang disiapkan, QR muncul sebentar lagi…
          </p>
        )}

        {status && !working && !scanning && !starting && (
          <p className="text-xs text-danger-ink">Sesi WhatsApp: {status}.</p>
        )}
        {unreachable && <p className="text-xs text-danger-ink">WAHA tidak terjangkau: {unreachable}</p>}
        {error && (
          <p role="alert" className="text-xs text-danger-ink">
            {error}
          </p>
        )}

        {state && !working && (canStart || scanning || status === 'FAILED') && (
          <button
            type="button"
            disabled={busy}
            onClick={() => act(canStart && status !== 'FAILED' ? 'start' : 'restart')}
            className={buttonClass('outline', 'md', 'w-full justify-center')}
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
            {canStart && status !== 'FAILED' ? 'Mulai Sesi WhatsApp' : 'Muat Ulang QR / Sesi'}
          </button>
        )}
      </div>
    </section>
  );
}
