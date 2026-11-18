'use client';

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
      className="bg-white border border-[#e9e5df] rounded-2xl p-5 shadow-card space-y-4 scroll-mt-24"
    >
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full bg-[#f1ede7] flex items-center justify-center text-[#242321]">
          <MessageCircle className={`w-4 h-4 ${working ? 'text-emerald-700' : 'text-[#d94b3d]'}`} />
        </div>
        <div>
          <h3 className="text-sm font-bold text-[#242321]">Login WhatsApp Notifikasi</h3>
          <span className="text-xs text-[#68645e]">Nomor WA yang mengirim pesanan ke penjaga</span>
        </div>
      </div>

      <div className="p-4 bg-[#fbf9f5] rounded-2xl border border-[#e9e5df] space-y-3">
        {!state && (
          <p className="text-xs text-[#68645e] flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Memeriksa sesi WhatsApp…
          </p>
        )}

        {working && state?.configured && state.reachable && (
          <div className="space-y-3">
            <p className="text-sm font-bold text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 shrink-0" /> WhatsApp terhubung
            </p>
            {state.account && (
              <p className="text-xs text-[#68645e]">
                Sebagai <b className="text-[#242321]">{state.account.name || 'tanpa nama'}</b> (+{state.account.id})
              </p>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={() => act('logout')}
              className="w-full min-h-[44px] px-4 py-2 bg-white hover:bg-[#d94b3d]/10 text-[#d94b3d] border border-[#d94b3d]/30 font-bold text-xs sm:text-sm rounded-full inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              <LogOut className="w-4 h-4" /> Keluar / Ganti Nomor
            </button>
          </div>
        )}

        {scanning && (
          <div className="space-y-3">
            <div className="mx-auto w-full max-w-[264px] aspect-square bg-white rounded-xl border border-[#e9e5df] p-2 flex items-center justify-center">
              {qrFailed ? (
                <span className="text-xs text-[#68645e] flex items-center gap-2">
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
            <ol className="text-xs text-[#4a4743] space-y-1 list-decimal pl-4 leading-relaxed">
              <li>Buka WhatsApp di HP nomor warung.</li>
              <li>
                Ketuk <b>⋮</b> / <b>Setelan</b> → <b>Perangkat tertaut</b> → <b>Tautkan perangkat</b>.
              </li>
              <li>Arahkan kamera ke QR ini. Status berubah sendiri begitu berhasil.</li>
            </ol>
            <p className="text-[11px] text-[#918c84] flex items-start gap-1.5">
              <Smartphone className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              Buka halaman ini di laptop/tablet/HP lain: QR tidak bisa discan dari layar HP itu sendiri.
            </p>
          </div>
        )}

        {starting && (
          <p className="text-xs text-[#68645e] flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Sesi sedang disiapkan, QR muncul sebentar lagi…
          </p>
        )}

        {status && !working && !scanning && !starting && (
          <p className="text-xs text-[#91251c]">Sesi WhatsApp: {status}.</p>
        )}
        {unreachable && <p className="text-xs text-[#91251c]">WAHA tidak terjangkau: {unreachable}</p>}
        {error && (
          <p role="alert" className="text-xs text-[#91251c]">
            {error}
          </p>
        )}

        {state && !working && (canStart || scanning || status === 'FAILED') && (
          <button
            type="button"
            disabled={busy}
            onClick={() => act(canStart && status !== 'FAILED' ? 'start' : 'restart')}
            className="w-full min-h-[44px] px-4 py-2 bg-white hover:bg-[#f5f2ed] text-[#242321] border border-[#e9e5df] font-bold text-xs sm:text-sm rounded-full inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
            {canStart && status !== 'FAILED' ? 'Mulai Sesi WhatsApp' : 'Muat Ulang QR / Sesi'}
          </button>
        )}
      </div>
    </section>
  );
}
