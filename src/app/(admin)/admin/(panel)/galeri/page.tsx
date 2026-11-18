'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { formatDateTimeWIB } from '@/lib/constants';
import { galleryImageUrl, galleryService } from '@/services/gallery';
import type { GalleryPhoto, GallerySettings, GalleryStatus } from '@/types';
import { AlertTriangle, Check, CheckCircle2, EyeOff, ImageOff, Loader2, Trash2, X } from 'lucide-react';

export default function AdminGaleriPage() {
  const [tab, setTab] = useState<GalleryStatus>('PENDING');
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [counts, setCounts] = useState<Record<GalleryStatus, number>>({ PENDING: 0, APPROVED: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [captions, setCaptions] = useState<Record<string, string>>({});
  const [viewing, setViewing] = useState<GalleryPhoto | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [settings, setSettings] = useState<GallerySettings | null>(null);
  const [wordsText, setWordsText] = useState('');
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async (status: GalleryStatus) => {
    setIsLoading(true);
    try {
      const res = await galleryService.adminList(status);
      setPhotos(res.photos);
      setCounts(res.counts);
      setCaptions(Object.fromEntries(res.photos.map((p) => [p.id, p.caption])));
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal memuat galeri.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load(tab);
  }, [tab, load]);

  useEffect(() => {
    galleryService
      .getSettings()
      .then((s) => {
        setSettings(s);
        setWordsText(s.blockedWords.join(', '));
      })
      .catch(() => {});
  }, []);

  const act = async (p: GalleryPhoto, action: 'approve' | 'unpublish' | 'delete') => {
    if (action === 'delete' && !window.confirm(tab === 'PENDING' ? 'Tolak dan hapus foto ini?' : 'Hapus foto ini permanen?')) {
      return;
    }
    setBusyId(p.id);
    try {
      if (action === 'approve') {
        const edited = captions[p.id] ?? p.caption;
        await galleryService.approve(p.id, edited !== p.caption ? edited : undefined);
        showToast('Foto disetujui dan tampil di galeri.');
      } else if (action === 'unpublish') {
        await galleryService.unpublish(p.id);
        showToast('Foto disembunyikan dan kembali ke antrean.');
      } else {
        await galleryService.remove(p.id);
        showToast(tab === 'PENDING' ? 'Foto ditolak dan dihapus.' : 'Foto dihapus.');
      }
      setViewing(null);
      await load(tab);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Aksi gagal.');
    } finally {
      setBusyId(null);
    }
  };

  const saveSettings = async (patch: Partial<GallerySettings>) => {
    if (!settings) return;
    setIsSavingSettings(true);
    try {
      const next = await galleryService.saveSettings({
        ...settings,
        blockedWords: wordsText.split(/[,\n]/).map((w) => w.trim()).filter(Boolean),
        ...patch,
      });
      setSettings(next);
      setWordsText(next.blockedWords.join(', '));
      showToast('Pengaturan galeri disimpan.');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal menyimpan pengaturan.');
    } finally {
      setIsSavingSettings(false);
    }
  };

  return (
    <div>
      <div className="space-y-6">

        {toast && (
          <div
            role="status"
            className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 p-3 px-4 bg-[#242321] text-white text-sm font-semibold rounded-full shadow-lg flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 text-[#f5c943] shrink-0" />
            <span>{toast}</span>
          </div>
        )}

        <div>
          <h1 className="text-2xl font-bold font-editorial text-[#242321]">Galeri Kenangan</h1>
          <p className="text-sm text-[#68645e] mt-1">
            Foto kiriman pelanggan. Filter otomatis sudah menolak caption kasar, judi online, link, dan nomor HP;
            sisanya kamu yang memutuskan.
          </p>
        </div>

        {/* Aturan galeri */}
        <section className="bg-white rounded-2xl border border-[#e9e5df] p-4 sm:p-5 shadow-card space-y-4">
          <h2 className="text-base font-bold text-[#242321]">Aturan Galeri</h2>
          {!settings ? (
            <p className="text-sm text-[#918c84]">Memuat pengaturan...</p>
          ) : (
            <>
              <Toggle
                label="Terima kiriman foto"
                hint="Matikan untuk menutup form kirim foto. Foto yang sudah tampil tetap tampil."
                checked={settings.enabled}
                disabled={isSavingSettings}
                onChange={(v) => saveSettings({ enabled: v })}
              />
              <Toggle
                label="Setujui otomatis"
                hint="Foto yang lolos filter langsung tampil tanpa menunggu admin. Foto duplikat atau dari pengirim yang sudah sering mengirim tetap masuk antrean. Disarankan tetap mati."
                checked={settings.autoApprove}
                disabled={isSavingSettings}
                onChange={(v) => saveSettings({ autoApprove: v })}
              />
              <label className="block space-y-1">
                <span className="text-sm font-semibold text-[#242321]">Kata terlarang tambahan</span>
                <span className="block text-xs text-[#77736d]">
                  Pisahkan dengan koma. Kata kasar umum dan istilah judi online sudah diblokir bawaan.
                </span>
                <textarea
                  value={wordsText}
                  onChange={(e) => setWordsText(e.target.value)}
                  rows={2}
                  placeholder="mis. nama-warung-saingan, kata-tertentu"
                  className="w-full px-3 py-2 rounded-xl border border-[#e9e5df] text-sm"
                />
              </label>
              <button
                type="button"
                onClick={() => saveSettings({})}
                disabled={isSavingSettings}
                className="min-h-[40px] px-4 rounded-full bg-[#242321] text-white text-sm font-semibold cursor-pointer disabled:opacity-50"
              >
                Simpan kata terlarang
              </button>
            </>
          )}
        </section>

        {/* Tab */}
        <div className="bg-white border border-[#e9e5df] p-1.5 rounded-full flex items-center gap-1.5 shadow-card w-fit">
          {(
            [
              { id: 'PENDING', label: 'Menunggu' },
              { id: 'APPROVED', label: 'Tampil' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`min-h-[40px] px-4 rounded-full text-sm font-bold cursor-pointer ${
                tab === t.id ? 'bg-[#f5c943] text-[#242321]' : 'text-[#68645e] hover:bg-[#f5f2ed]'
              }`}
            >
              {t.label} ({counts[t.id]})
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="py-16 text-center">
            <Loader2 className="w-7 h-7 text-[#f5c943] animate-spin mx-auto" />
          </div>
        ) : photos.length === 0 ? (
          <div className="bg-white p-10 rounded-2xl border border-[#e9e5df] text-center text-sm text-[#68645e]">
            <ImageOff className="w-8 h-8 mx-auto mb-2 text-[#918c84]" />
            {tab === 'PENDING' ? 'Tidak ada foto yang menunggu.' : 'Belum ada foto yang tampil.'}
          </div>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {photos.map((p) => (
              <li key={p.id} className="bg-white rounded-2xl border border-[#e9e5df] overflow-hidden shadow-card flex flex-col">
                <button type="button" onClick={() => setViewing(p)} className="block cursor-zoom-in">
                  {/* eslint-disable-next-line @next/next/no-img-element -- berkas dari API sendiri */}
                  <img
                    src={galleryImageUrl(p.id, 'thumb')}
                    alt={p.caption || 'Foto kiriman'}
                    className="w-full h-56 object-cover bg-[#efebe4]"
                  />
                </button>
                <div className="p-3 space-y-2 flex-1 flex flex-col">
                  {p.flags.length > 0 && (
                    <ul className="space-y-1">
                      {p.flags.map((f) => (
                        <li key={f} className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1 flex gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="text-xs text-[#77736d]">
                    {p.name || 'Tanpa nama'} · {formatDateTimeWIB(p.createdAt)}
                  </p>
                  {tab === 'PENDING' ? (
                    <textarea
                      value={captions[p.id] ?? ''}
                      onChange={(e) => setCaptions((c) => ({ ...c, [p.id]: e.target.value }))}
                      maxLength={200}
                      rows={3}
                      aria-label="Caption (bisa dirapikan sebelum disetujui)"
                      placeholder="(tanpa caption)"
                      className="w-full px-2 py-1.5 rounded-lg border border-[#e9e5df] text-sm resize-none"
                    />
                  ) : (
                    <p className="text-sm text-[#242321] whitespace-pre-line">{p.caption || '(tanpa caption)'}</p>
                  )}
                  <div className="flex gap-2 mt-auto pt-1">
                    {tab === 'PENDING' ? (
                      <>
                        <ActionButton tone="ok" disabled={busyId === p.id} onClick={() => act(p, 'approve')}>
                          <Check className="w-4 h-4" /> Setujui
                        </ActionButton>
                        <ActionButton tone="bad" disabled={busyId === p.id} onClick={() => act(p, 'delete')}>
                          <X className="w-4 h-4" /> Tolak
                        </ActionButton>
                      </>
                    ) : (
                      <>
                        <ActionButton tone="neutral" disabled={busyId === p.id} onClick={() => act(p, 'unpublish')}>
                          <EyeOff className="w-4 h-4" /> Sembunyikan
                        </ActionButton>
                        <ActionButton tone="bad" disabled={busyId === p.id} onClick={() => act(p, 'delete')}>
                          <Trash2 className="w-4 h-4" /> Hapus
                        </ActionButton>
                      </>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {viewing && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Pratinjau foto"
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4"
          onClick={() => setViewing(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- berkas dari API sendiri */}
          <img
            src={galleryImageUrl(viewing.id)}
            alt={viewing.caption || 'Foto kiriman'}
            className="max-w-full max-h-[90vh] object-contain rounded-xl"
          />
        </div>
      )}
    </div>
  );
}

function Toggle({
  label,
  hint,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-semibold text-[#242321]">{label}</p>
        <p className="text-xs text-[#77736d] mt-0.5">{hint}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative shrink-0 w-12 h-7 rounded-full transition-colors cursor-pointer disabled:opacity-50 ${
          checked ? 'bg-[#2f8f4e]' : 'bg-[#d9d4cc]'
        }`}
      >
        <span
          className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all ${checked ? 'left-6' : 'left-1'}`}
        />
      </button>
    </div>
  );
}

function ActionButton({
  tone,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { tone: 'ok' | 'bad' | 'neutral' }) {
  const tones = {
    ok: 'bg-[#2f8f4e] text-white hover:bg-[#287a43]',
    bad: 'bg-white text-red-700 border border-red-200 hover:bg-red-50',
    neutral: 'bg-white text-[#242321] border border-[#e9e5df] hover:bg-[#f5f2ed]',
  };
  return (
    <button
      type="button"
      {...props}
      className={`flex-1 min-h-[40px] rounded-full text-sm font-semibold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 ${tones[tone]}`}
    >
      {children}
    </button>
  );
}
