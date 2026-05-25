#!/usr/bin/env bash
# Renew Let's Encrypt certificates and reload Nginx.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-.env.production}"

echo "[cert-renew] Renewing certificates..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" run --rm certbot \
  certbot renew --webroot -w /var/www/certbot

echo "[cert-renew] Reloading Nginx..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec nginx nginx -s reload

echo "[cert-renew] Done."
