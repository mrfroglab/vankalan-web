#!/usr/bin/env bash
# Cadangkan database ke berkas .dump (format custom pg_dump).
#
#   DATABASE_URL=postgresql://... bash scripts/db-backup.sh [folder_tujuan]
#
# Env: KEEP (jumlah cadangan terbaru yang disimpan, default 14), PG_IMAGE.
# Jadwalkan lewat cron di server, mis. tiap hari 02:00. Simpan salinan di LUAR server database.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$HERE/lib-pg.sh"

: "${DATABASE_URL:?DATABASE_URL belum diatur}"
OUT_DIR="${1:-backups}"
KEEP="${KEEP:-14}"

mkdir -p "$OUT_DIR"
FILE="$OUT_DIR/warmindo-$(date +%Y%m%d-%H%M%S).dump"

# Tulis ke berkas sementara dulu supaya cadangan setengah jadi tidak pernah tampak valid.
pg pg_dump --format=custom --no-owner "$DATABASE_URL" > "$FILE.partial"
if [ ! -s "$FILE.partial" ]; then
  rm -f "$FILE.partial"
  echo "GAGAL: hasil cadangan kosong." >&2
  exit 1
fi
mv "$FILE.partial" "$FILE"
echo "Cadangan dibuat: $FILE ($(wc -c < "$FILE") byte)"

# Hanya berkas berpola warmindo-*.dump di folder ini yang dipangkas.
if [ "$KEEP" -gt 0 ]; then
  # shellcheck disable=SC2012
  ls -1t "$OUT_DIR"/warmindo-*.dump 2>/dev/null | tail -n +"$((KEEP + 1))" | while read -r old; do
    rm -f -- "$old"
    echo "Cadangan lama dihapus: $old"
  done
fi
