# Helper bersama: jalankan alat PostgreSQL (pg_dump, pg_restore, psql).
# Memakai alat di host bila ada; jika tidak, lewat container postgres.
# Semua data lewat stdin/stdout sehingga tidak perlu volume mount.
#
# Env: PG_IMAGE (default postgres:16-alpine), PG_NETWORK (jaringan Docker container alat,
# default host). Untuk DB yang hanya ada di jaringan Docker, mis. produksi di gateway-net:
#   PG_NETWORK=gateway-net DATABASE_URL=postgresql://user:pw@vankalan-db:5432/db ...
# PG_NETWORK diisi = selalu lewat container, karena alat di host tidak bisa menjangkau jaringan itu.
PG_IMAGE="${PG_IMAGE:-postgres:16-alpine}"
PG_NETWORK="${PG_NETWORK:-}"

# Buang parameter khusus Prisma (?schema=...) yang ditolak libpq/pg_dump.
pg_url() {
  local url="$1" base query out="" part
  base="${url%%\?*}"
  [ "$base" = "$url" ] && { printf '%s' "$url"; return; }
  query="${url#*\?}"
  IFS='&' read -ra parts <<< "$query"
  for part in "${parts[@]}"; do
    case "$part" in schema=*|"") ;; *) out="${out:+$out&}$part" ;; esac
  done
  printf '%s%s' "$base" "${out:+?$out}"
}

pg() {
  local tool="$1"
  shift
  if [ -z "$PG_NETWORK" ] && command -v "$tool" >/dev/null 2>&1; then
    "$tool" "$@"
  else
    docker run --rm -i --network "${PG_NETWORK:-host}" "$PG_IMAGE" "$tool" "$@"
  fi
}
