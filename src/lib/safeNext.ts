/**
 * Validasi parameter `next` setelah login: hanya path admin di origin yang sama,
 * tanpa segmen kosong ("//") atau naik direktori (".."). Modul murni (dipakai server & klien).
 */
export function safeNextPath(next: string | null | undefined): string {
  const fallback = '/admin/antrean';
  if (!next || !/^\/admin(\/[A-Za-z0-9._~-]+)*\/?$/.test(next)) return fallback;
  if (next.split('/').some((seg) => seg === '..' || seg === '.')) return fallback;
  return next;
}
