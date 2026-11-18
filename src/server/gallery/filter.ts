/**
 * Filter otomatis untuk kiriman galeri.
 *
 * - Ditolak langsung (pengirim diberi tahu dan bisa memperbaiki): kata kasar/judi online
 *   (bawaan + daftar admin), tautan, nomor HP, dan email. Nomor HP/email ditolak demi privasi
 *   (caption tampil publik) sekaligus mencegah spam.
 * - Selain itu tetap diputuskan admin (kecuali mode setujui otomatis aktif).
 *
 * Pencocokan per kata utuh setelah normalisasi (huruf kecil, angka "leet" -> huruf, huruf
 * berulang diringkas), jadi "pantai" tidak kena "tai" dan "4nj1ng" / "anjiiing" tetap kena.
 */

const BUILTIN_BLOCKED = [
  // kasar / cabul
  'anjing', 'anjeng', 'anjg', 'anjir', 'asu', 'bangsat', 'bajingan', 'babi', 'kontol', 'memek',
  'ngentot', 'entot', 'ngewe', 'jembut', 'pepek', 'peler', 'titit', 'tolol', 'goblok', 'goblog',
  'bego', 'kampret', 'keparat', 'tai', 'taik', 'jancok', 'jancuk', 'dancok', 'cok', 'jamput',
  'bangke', 'lonte', 'pelacur', 'sundel', 'perek', 'coli', 'bokep', 'sange', 'porno', 'bencong',
  'fuck', 'shit', 'bitch', 'dick', 'pussy', 'sex', 'seks', 'telanjang',
  // judi online (spam umum)
  'judi', 'slot', 'gacor', 'togel', 'maxwin', 'jackpot', 'scatter', 'zeus', 'casino', 'kasino',
  'depo', 'deposit', 'wd', 'rtp', 'bandar',
];

const LEET: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', $: 's' };

export function normalizeWord(word: string): string {
  return word
    .toLowerCase()
    .replace(/[013457@$]/g, (c) => LEET[c] ?? c)
    .replace(/[^a-z]/g, '')
    .replace(/(.)\1+/g, '$1');
}

function tokens(text: string): string[] {
  return text
    .split(/[\s.,!?;:()[\]{}"'`~\-_/\\|*+=<>#%^&]+/)
    .map(normalizeWord)
    .filter(Boolean);
}

export function normalizeBlockedList(words: string[]): string[] {
  return [...new Set(words.map(normalizeWord).filter((w) => w.length >= 2))].slice(0, 200);
}

const LINK = /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|id|co|xyz|me|io|link|ly|site|online|top|vip|bet)\b)/i;
const EMAIL = /[^\s@]+@[^\s@]+\.[a-z]{2,}/i;
/** 9+ digit (spasi/titik/strip di antaranya diabaikan), mis. 0812-3456-7890 atau +62 812 345 678. */
const PHONE = /(\+?\d[\s.-]?){9,}/;

export interface TextCheck {
  ok: boolean;
  /** Pesan untuk pengirim bila ditolak. */
  reason?: string;
}

/** Periksa nama + caption. extraBlocked = daftar kata dari admin (sudah dinormalisasi atau belum). */
export function checkGalleryText(name: string, caption: string, extraBlocked: string[] = []): TextCheck {
  const text = `${name} ${caption}`;
  if (EMAIL.test(text)) return { ok: false, reason: 'Jangan cantumkan email di nama atau caption.' };
  if (LINK.test(text)) return { ok: false, reason: 'Tautan/link tidak diizinkan di nama atau caption.' };
  if (PHONE.test(text)) return { ok: false, reason: 'Jangan cantumkan nomor HP di nama atau caption.' };
  const blocked = new Set([...BUILTIN_BLOCKED.map(normalizeWord), ...normalizeBlockedList(extraBlocked)]);
  if (tokens(text).some((t) => blocked.has(t))) {
    return { ok: false, reason: 'Nama atau caption mengandung kata yang tidak diizinkan. Silakan ubah dulu.' };
  }
  return { ok: true };
}
