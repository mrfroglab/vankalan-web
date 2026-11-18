'use client';

import { PageHeader } from '@/components/ui/PageHeader';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { EmptyState } from '@/components/ui/EmptyState';
import { ServerErrorNotice } from '@/components/ui/ServerErrorNotice';
import { inputClass, textareaClass } from '@/components/ui/styles';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FoodlyHeader } from '@/components/customer/FoodlyHeader';
import { FoodlyFooter } from '@/components/customer/FoodlyFooter';
import { CartDrawer } from '@/components/customer/CartDrawer';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useCart } from '@/context/CartContext';
import { formatDateTimeWIB } from '@/lib/constants';
import { isBackendConfigured } from '@/services/client';
import { galleryImageUrl, galleryService, type PublicGalleryPage } from '@/services/gallery';
import type { PublicGalleryPhoto } from '@/types';
import { Camera, CheckCircle2, ImagePlus, Loader2, X } from 'lucide-react';

const DEFAULT_LIMITS = { nameMax: 40, captionMax: 200, maxBytes: 10 * 1024 * 1024 };

export default function GaleriPage() {
  const { isStoreOpen, estimateMinutes, totalItems } = useCart();
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);

  const [photos, setPhotos] = useState<PublicGalleryPhoto[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [submissionsOpen, setSubmissionsOpen] = useState(true);
  const [limits, setLimits] = useState(DEFAULT_LIMITS);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [viewing, setViewing] = useState<PublicGalleryPhoto | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [doneMessage, setDoneMessage] = useState<string | null>(null);

  const applyPage = useCallback((page: PublicGalleryPage, append: boolean) => {
    setPhotos((prev) => (append ? [...prev, ...page.photos] : page.photos));
    setCursor(page.nextCursor);
    setSubmissionsOpen(page.submissionsOpen);
    setLimits(page.limits);
  }, []);

  const load = useCallback(() => {
    if (!isBackendConfigured()) {
      setIsLoading(false);
      setLoadError('Galeri belum tersedia di mode prototipe.');
      return;
    }
    setIsLoading(true);
    setLoadError(null);
    galleryService
      .list()
      .then((page) => applyPage(page, false))
      .catch(() => setLoadError('Koneksi ke warung sedang terganggu. Coba lagi sebentar.'))
      .finally(() => setIsLoading(false));
  }, [applyPage]);

  useEffect(() => {
    load();
  }, [load]);

  const loadMore = async () => {
    if (!cursor) return;
    setIsLoadingMore(true);
    try {
      applyPage(await galleryService.list(cursor), true);
    } catch {
      setLoadError('Gagal memuat foto berikutnya.');
    } finally {
      setIsLoadingMore(false);
    }
  };

  return (
    <div className="bg-canvas min-h-screen flex flex-col">
      <FoodlyHeader
        isOpen={isStoreOpen}
        estimateMinutes={estimateMinutes}
        totalCartItems={totalItems}
        onOpenCart={() => setIsCartDrawerOpen(true)}
      />

      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 flex-1 space-y-6">
        <PageHeader
          breadcrumb={<Breadcrumb items={[{ label: 'Beranda', href: '/' }, { label: 'Galeri' }]} />}
          title="Galeri Kenangan"
          description="Momen pelanggan di Warmindo Putra Vangkalan. Pernah nongkrong di sini? Kirim fotomu dan jadi bagian dari kenangan warung."
          actions={
            submissionsOpen && !loadError ? (
              <Button
                onClick={() => {
                  setDoneMessage(null);
                  setIsFormOpen(true);
                }}
              >
                <ImagePlus className="w-4 h-4" />
                Kirim Foto
              </Button>
            ) : undefined
          }
        />

        {doneMessage && (
          <div
            role="status"
            className="p-3 px-4 bg-ink text-white text-sm font-semibold rounded-2xl flex items-start gap-2"
          >
            <CheckCircle2 className="w-4 h-4 text-gold shrink-0 mt-0.5" />
            <span>{doneMessage}</span>
          </div>
        )}

        {isLoading ? (
          <div className="py-20 text-center">
            <Loader2 className="w-8 h-8 text-gold animate-spin mx-auto" />
            <p className="text-sm text-subtle mt-3">Memuat galeri...</p>
          </div>
        ) : loadError && photos.length === 0 ? (
          <ServerErrorNotice title="Galeri belum bisa dimuat" message={loadError} onRetry={() => load()} />
        ) : photos.length === 0 ? (
          <EmptyState
            icon={Camera}
            title="Belum ada foto"
            description="Jadilah yang pertama mengirim foto kenangan di warung ini."
          />
        ) : (
          <>
            <ul className="columns-2 md:columns-3 lg:columns-4 gap-3 [&>li]:mb-3">
              {photos.map((p) => (
                <li key={p.id} className="break-inside-avoid">
                  <button
                    type="button"
                    onClick={() => setViewing(p)}
                    className="block w-full text-left bg-white rounded-2xl overflow-hidden border border-line shadow-card hover:shadow-md transition-shadow cursor-pointer"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- berkas dari API sendiri, sudah diperkecil server */}
                    <img
                      src={galleryImageUrl(p.id, 'thumb')}
                      alt={p.caption || `Foto dari ${p.name || 'pelanggan'}`}
                      width={p.width}
                      height={p.height}
                      loading="lazy"
                      className="w-full h-auto bg-line-soft"
                    />
                    {(p.caption || p.name) && (
                      <div className="p-3 space-y-1">
                        {p.caption && <p className="text-sm text-ink line-clamp-3 whitespace-pre-line">{p.caption}</p>}
                        {p.name && <p className="text-xs font-semibold text-icon">— {p.name}</p>}
                      </div>
                    )}
                  </button>
                </li>
              ))}
            </ul>
            {cursor && (
              <div className="text-center">
                <Button variant="outline" onClick={loadMore} disabled={isLoadingMore} className="min-h-11">
                  {isLoadingMore ? 'Memuat...' : 'Muat foto lainnya'}
                </Button>
              </div>
            )}
          </>
        )}
      </main>

      <FoodlyFooter />

      {viewing && <PhotoViewer photo={viewing} onClose={() => setViewing(null)} />}

      <SubmitPhotoModal
        isOpen={isFormOpen}
        limits={limits}
        onClose={() => setIsFormOpen(false)}
        onDone={(status) => {
          setIsFormOpen(false);
          setDoneMessage(
            status === 'APPROVED'
              ? 'Terima kasih! Fotomu sudah tampil di galeri.'
              : 'Terima kasih! Fotomu akan tampil setelah dicek oleh warung.'
          );
          if (status === 'APPROVED') galleryService.list().then((page) => applyPage(page, false)).catch(() => {});
        }}
      />

      <CartDrawer isOpen={isCartDrawerOpen} onClose={() => setIsCartDrawerOpen(false)} />
    </div>
  );
}

function PhotoViewer({ photo, onClose }: { photo: PublicGalleryPhoto; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Foto galeri"
      className="fixed inset-0 z-50 bg-black/85 flex flex-col items-center justify-center p-4"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Tutup"
        className="absolute top-3 right-3 w-11 h-11 rounded-full bg-white/10 text-white flex items-center justify-center cursor-pointer"
      >
        <X className="w-5 h-5" />
      </button>
      <figure className="max-w-3xl w-full space-y-3" onClick={(e) => e.stopPropagation()}>
        {/* eslint-disable-next-line @next/next/no-img-element -- berkas dari API sendiri */}
        <img
          src={galleryImageUrl(photo.id)}
          alt={photo.caption || `Foto dari ${photo.name || 'pelanggan'}`}
          width={photo.width}
          height={photo.height}
          className="w-full h-auto max-h-[75vh] object-contain rounded-xl"
        />
        <figcaption className="text-white space-y-1">
          {photo.caption && <p className="text-sm whitespace-pre-line">{photo.caption}</p>}
          <p className="text-xs text-white/70">
            {photo.name ? `${photo.name} · ` : ''}
            {formatDateTimeWIB(photo.createdAt)}
          </p>
        </figcaption>
      </figure>
    </div>
  );
}

function SubmitPhotoModal({
  isOpen,
  limits,
  onClose,
  onDone,
}: {
  isOpen: boolean;
  limits: typeof DEFAULT_LIMITS;
  onClose: () => void;
  onDone: (status: 'PENDING' | 'APPROVED') => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [caption, setCaption] = useState('');
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (!isOpen) {
      setFile(null);
      setCaption('');
      setConsent(false);
      setError(null);
    }
  }, [isOpen]);

  const pick = (f: File | undefined) => {
    setError(null);
    if (!f) return;
    if (!/^image\/(jpeg|png|webp)$/.test(f.type)) {
      setError('Pilih foto JPG, PNG, atau WebP.');
      return;
    }
    if (f.size > limits.maxBytes) {
      setError('Ukuran foto maksimal 10 MB.');
      return;
    }
    setFile(f);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return setError('Pilih foto dulu.');
    if (!consent) return setError('Centang persetujuan dulu.');
    setIsSending(true);
    setError(null);
    try {
      const res = await galleryService.submit({ photo: file, name, caption });
      onDone(res.status);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengirim foto. Coba lagi.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Kirim Foto Kenangan">
      <form onSubmit={submit} className="space-y-4">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(e) => pick(e.target.files?.[0])}
        />
        {preview ? (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element -- pratinjau lokal (blob URL) */}
            <img src={preview} alt="Pratinjau foto" className="w-full max-h-72 object-contain rounded-xl bg-line-soft" />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="absolute bottom-2 right-2 min-h-10 px-3 rounded-full bg-white/90 text-xs font-semibold text-ink cursor-pointer"
            >
              Ganti foto
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="w-full h-40 rounded-xl border-2 border-dashed border-line-strong bg-surface-muted flex flex-col items-center justify-center gap-2 text-muted cursor-pointer hover:border-gold"
          >
            <Camera className="w-7 h-7" />
            <span className="text-sm font-semibold">Pilih atau ambil foto</span>
            <span className="text-xs">JPG/PNG/WebP, maks. 10 MB</span>
          </button>
        )}

        <label className="block space-y-1">
          <span className="text-sm font-semibold text-ink">Nama (boleh dikosongkan)</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={limits.nameMax}
            placeholder="mis. Raka & teman-teman"
            className={inputClass}
          />
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-semibold text-ink">Caption</span>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            maxLength={limits.captionMax}
            rows={3}
            placeholder="Cerita singkat momen ini..."
            className={`${textareaClass} resize-none`}
          />
          <span className="block text-right text-xs text-subtle">
            {caption.length}/{limits.captionMax}
          </span>
        </label>

        {/* Honeypot untuk bot; tersembunyi dari pengguna dan pembaca layar. */}
        <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />

        <label className="flex items-start gap-2 text-sm text-ink-soft">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-1 w-4 h-4 accent-gold"
          />
          <span>
            Foto ini milik saya, dan semua orang di foto setuju fotonya ditampilkan di galeri warung. Warung boleh
            tidak menampilkan atau menghapus foto kapan saja.
          </span>
        </label>

        <p className="text-xs text-subtle">
          Foto dicek dulu oleh warung sebelum tampil. Jangan cantumkan nomor HP, link, atau kata kasar. Lokasi GPS di
          foto otomatis dihapus.
        </p>

        {error && (
          <p role="alert" className="text-sm text-danger-ink bg-danger-soft border border-danger-line rounded-2xl px-4 py-3">
            {error}
          </p>
        )}

        <Button type="submit" variant="gold" disabled={isSending} className="w-full min-h-12">
          {isSending ? 'Mengirim...' : 'Kirim Foto'}
        </Button>
      </form>
    </Modal>
  );
}
