# Helper bersama: jalankan alat PostgreSQL (pg_dump, pg_restore, psql).
# Memakai alat di host bila ada; jika tidak, lewat container postgres (--network host).
# Semua data lewat stdin/stdout sehingga tidak perlu volume mount.
PG_IMAGE="${PG_IMAGE:-postgres:16-alpine}"

pg() {
  local tool="$1"
  shift
  if command -v "$tool" >/dev/null 2>&1; then
    "$tool" "$@"
  else
    docker run --rm -i --network host "$PG_IMAGE" "$tool" "$@"
  fi
}
