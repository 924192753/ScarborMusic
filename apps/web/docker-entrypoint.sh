#!/bin/sh
set -e

echo "[entrypoint] ScarborMusic web starting..."

if [ -n "${DATABASE_URL}" ]; then
  echo "[entrypoint] Running database migrations..."
  node ./prisma-cli/node_modules/prisma/build/index.js migrate deploy
fi

echo "[entrypoint] Starting Next.js server on port ${PORT:-3000}"
exec node server.js
