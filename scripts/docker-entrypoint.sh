#!/usr/bin/env sh
set -eu

if [ "${DATABASE_URL:-}" = "" ]; then
  echo "[entrypoint] DATABASE_URL is required"
  exit 1
fi

wait_for_mysql() {
  host="$(node -p 'new URL(process.env.DATABASE_URL).hostname')"
  port="$(node -p 'new URL(process.env.DATABASE_URL).port || "3306"')"

  echo "[entrypoint] Waiting for MySQL at ${host}:${port}..."
  i=0
  while ! DB_HOST="$host" DB_PORT="$port" node <<'EOF' >/dev/null 2>&1
const net = require("net");

const socket = net.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
});

socket.setTimeout(1000);
socket.on("connect", () => {
  socket.end();
  process.exit(0);
});
socket.on("timeout", () => {
  socket.destroy();
  process.exit(1);
});
socket.on("error", () => {
  process.exit(1);
});
EOF
  do
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
