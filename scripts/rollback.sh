#!/usr/bin/env bash
# Rollback web/nginx images to a previous tag.
# Usage: ./scripts/rollback.sh <web-tag> [nginx-tag]
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

WEB_TAG="${1:-}"
NGINX_TAG="${2:-$WEB_TAG}"

if [[ -z "$WEB_TAG" ]]; then
  echo "Usage: $0 <web-image-tag> [nginx-image-tag]"
  echo "Example: $0 sha-abc1234"
  exit 1
fi

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-.env.production}"

export WEB_IMAGE="scarbormusic/web:${WEB_TAG}"
export NGINX_IMAGE="scarbormusic/nginx:${NGINX_TAG}"

echo "[rollback] Rolling back to WEB_IMAGE=$WEB_IMAGE NGINX_IMAGE=$NGINX_IMAGE"

docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" pull web nginx 2>/dev/null || true
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d web nginx

"$ROOT_DIR/scripts/health-check.sh"
echo "[rollback] Done."
