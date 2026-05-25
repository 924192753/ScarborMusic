#!/usr/bin/env bash
# Production deploy — pull images, migrate DB, start stack.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-.env.production}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE — copy from .env.production.example"
  exit 1
fi

echo "[deploy] Building images..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build

echo "[deploy] Starting infrastructure (mysql, redis, minio)..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d mysql redis minio

echo "[deploy] Waiting for MySQL..."
sleep 15

echo "[deploy] Starting application stack..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d

echo "[deploy] Running health check..."
"$ROOT_DIR/scripts/health-check.sh"

echo "[deploy] Deployment complete."
