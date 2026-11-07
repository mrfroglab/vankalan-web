/** Dijalankan sekali saat server Next.js dimulai: nyalakan pekerja antrean (hanya runtime Node.js). */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startWorker } = await import('./server/wa/worker');
    startWorker();
  }
}
