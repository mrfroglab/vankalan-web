#!/usr/bin/env bash
# Uji pemulihan: pulihkan sebuah cadangan ke database SEMENTARA di server yang sama, pastikan
# semua tabel ada dan bisa dibaca, bandingkan jumlah baris dengan database sumber, lalu hapus
# database sementara. Database sumber TIDAK diubah.
#
#   DATABASE_URL=postgresql://user:pw@host:5432/warmindo bash scripts/db-restore-check.sh backups/warmindo-XXXX.dump
#
# Pengguna di DATABASE_URL harus boleh CREATE DATABASE. Selisih jumlah baris hanya peringatan
# (data hidup berubah sejak cadangan); tabel hilang atau gagal dibaca = gagal.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$HERE/lib-pg.sh"

DUMP="${1:?Pemakaian: db-restore-check.sh <berkas.dump>}"
: "${DATABASE_URL:?DATABASE_URL belum diatur}"
[ -s "$DUMP" ] || { echo "Berkas cadangan tidak ada/kosong: $DUMP" >&2; exit 1; }

base="${DATABASE_URL%%\?*}"
query="${DATABASE_URL#"$base"}"
root="${base%/*}"
TMP_DB="warmindo_restore_check_$(date +%s)"
ADMIN_URL="$root/postgres$query"
TMP_URL="$root/$TMP_DB$query"

TABLES=(categories menu_items shifts store_settings orders order_items refunds order_counters payment_transactions payment_events notification_jobs)

cleanup() { pg psql "$ADMIN_URL" -q -c "DROP DATABASE IF EXISTS \"$TMP_DB\"" >/dev/null 2>&1 || true; }
trap cleanup EXIT

pg psql "$ADMIN_URL" -q -v ON_ERROR_STOP=1 -c "CREATE DATABASE \"$TMP_DB\"" >/dev/null
echo "Memulihkan $DUMP ke database sementara $TMP_DB ..."
pg pg_restore --no-owner --exit-on-error -d "$TMP_URL" < "$DUMP"

fail=0
printf "%-24s %10s %10s\n" tabel dipulihkan sumber
for t in "${TABLES[@]}"; do
  restored="$(pg psql "$TMP_URL" -Atc "select count(*) from \"$t\"" 2>/dev/null)" || { echo "GAGAL: tabel $t tidak ada atau tak terbaca di hasil pemulihan" >&2; fail=1; continue; }
  source_n="$(pg psql "$DATABASE_URL" -Atc "select count(*) from \"$t\"" 2>/dev/null || echo "?")"
  flag=""
  [ "$restored" != "$source_n" ] && flag="  <- berbeda (data berubah sejak cadangan?)"
  printf "%-24s %10s %10s%s\n" "$t" "$restored" "$source_n" "$flag"
done

if [ "$fail" -ne 0 ]; then
  echo "UJI PEMULIHAN GAGAL." >&2
  exit 1
fi
echo "Uji pemulihan BERHASIL: semua tabel ada dan terbaca."
