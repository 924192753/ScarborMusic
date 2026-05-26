#!/bin/sh
set -e

echo "[entrypoint] ScarborMusic web starting..."

if [ -n "${DATABASE_URL}" ]; then
  echo "[entrypoint] Running database migrations..."
  # prisma.config.ts lives under /app; resolve dotenv + prisma/config from prisma-cli
  export NODE_PATH="/app/prisma-cli/node_modules${NODE_PATH:+:${NODE_PATH}}"
  node ./prisma-cli/node_modules/prisma/build/index.js migrate deploy
fi

echo "[entrypoint] Starting Next.js server on port ${PORT:-3000}"
exec node server.js
