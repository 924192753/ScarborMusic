#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-.env.production}"
SERVICE="${1:-}"

if [[ -n "$SERVICE" ]]; then
  echo "[restart] Restarting $SERVICE..."
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" restart "$SERVICE"
else
  echo "[restart] Restarting all services..."
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" restart
fi

echo "[restart] Done."
