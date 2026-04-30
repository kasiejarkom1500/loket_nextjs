#!/usr/bin/env sh
set -eu

if [ "${DATABASE_URL:-}" = "" ]; then
  echo "[entrypoint] DATABASE_URL is required"
  exit 1
fi

wait_for_mysql() {
  host="$(echo "$DATABASE_URL" | sed -n 's#.*@\\([^:/]*\\).*#\\1#p')"
  port="$(echo "$DATABASE_URL" | sed -n 's#.*:\\([0-9][0-9]*\\)/.*#\\1#p')"
  if [ "$host" = "" ]; then host="localhost"; fi
  if [ "$port" = "" ]; then port="3306"; fi

  echo "[entrypoint] Waiting for MySQL at ${host}:${port}..."
  i=0
  while ! (echo >"/dev/tcp/${host}/${port}") >/dev/null 2>&1; do
    i=$((i+1))
    if [ "$i" -gt 60 ]; then
      echo "[entrypoint] MySQL not reachable after 60s"
      exit 1
    fi
    sleep 1
  done
}

if [ "${WAIT_FOR_DB:-1}" = "1" ]; then
  wait_for_mysql
fi

if [ "${PRISMA_DB_PUSH_ON_START:-1}" = "1" ]; then
  echo "[entrypoint] prisma db push..."
  npx prisma db push
fi

if [ "${PRISMA_SEED_ON_START:-1}" = "1" ]; then
  echo "[entrypoint] prisma db seed..."
  npx prisma db seed || true
fi

exec "$@"

