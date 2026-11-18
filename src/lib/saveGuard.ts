import { ApiError } from '@/services/client';

/** Pesan singkat untuk staf dari error server/jaringan. */
export function serverErrorMessage(err: unknown): string {
  if (err instanceof ApiError && err.statusCode === 0) return 'Server tidak terjangkau. Periksa koneksi internet.';
  if (err instanceof Error && err.message) return err.message;
  return 'Terjadi kesalahan pada server.';
}

/**
 * Bungkus aksi simpan di dashboard: bila server menolak / tidak terjangkau, tampilkan pesan dan
 * muat ulang data dari server, supaya layar tidak menampilkan perubahan yang sebenarnya tidak tersimpan.
 */
export function makeSaveGuard(notify: (message: string) => void, resync?: () => unknown) {
  return <A extends unknown[]>(fn: (...args: A) => Promise<unknown>) =>
    async (...args: A): Promise<void> => {
      try {
        await fn(...args);
      } catch (err) {
        console.error('[dashboard] aksi gagal:', err);
        notify(`Gagal menyimpan: ${serverErrorMessage(err)}`);
        try {
          await resync?.();
        } catch {
          // resync gagal juga (server mati): pesan di atas sudah cukup.
        }
      }
    };
}
