#!/usr/bin/env bash
# Simulates production Docker runner: prisma-cli + dotenv in /app/node_modules
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TEST_DIR="$(mktemp -d)"
trap 'rm -rf "$TEST_DIR"' EXIT

APP="$TEST_DIR/app"
mkdir -p "$APP/node_modules" "$APP/packages"

echo "=== [1/4] Install prisma-cli (same as Dockerfile stage) ==="
npm install --prefix "$APP/prisma-cli" prisma@7.8.0 dotenv@17.4.2 --omit=dev --silent

echo "=== [2/4] Layout like runner image ==="
cp -r "$ROOT_DIR/packages/prisma" "$APP/packages/"
cp "$ROOT_DIR/prisma.config.ts" "$APP/"
cp -r "$APP/prisma-cli/node_modules/dotenv" "$APP/node_modules/dotenv"

cd "$APP"
export NODE_PATH="$APP/prisma-cli/node_modules"
export DATABASE_URL="${DATABASE_URL:-mysql://scarbormusic:build@127.0.0.1:3306/scarbormusic}"

echo "=== [3/4] dotenv/config from /app (like prisma.config.ts) ==="
node -e "process.chdir('$APP'); require('dotenv/config'); console.log('OK: dotenv/config loaded')"

echo "=== [4/4] prisma validate (same binary as entrypoint) ==="
node "$APP/prisma-cli/node_modules/prisma/build/index.js" validate

echo "=== [5/4] prisma migrate deploy (entrypoint command) ==="
set +e
out=$(node "$APP/prisma-cli/node_modules/prisma/build/index.js" migrate deploy 2>&1)
code=$?
set -e
echo "$out" | tail -5

if echo "$out" | grep -q "Cannot find module 'dotenv"; then
  echo "FAIL: dotenv still missing"
  exit 1
fi
if echo "$out" | grep -q "Cannot find module 'effect'"; then
  echo "FAIL: effect still missing"
  exit 1
fi

if [ "$code" = 0 ]; then
  echo "PASS: migrate deploy succeeded"
elif echo "$out" | grep -qiE 'connect|ECONNREFUSED|P1001|timeout'; then
  echo "PASS: Prisma CLI OK (DB not reachable here — expected without Docker MySQL)"
else
  echo "WARN: migrate exit $code — check output above"
  exit "$code"
fi

echo ""
echo "All Docker entrypoint simulation checks passed."
