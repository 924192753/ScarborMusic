#!/usr/bin/env bash
# Obtain initial Let's Encrypt certificate (run once after DNS points to server).
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-.env.production}"

set -a
# shellcheck source=/dev/null
source "$ENV_FILE"
set +a

: "${DOMAIN:?DOMAIN is required}"
: "${CERTBOT_EMAIL:?CERTBOT_EMAIL is required}"

echo "[init-ssl] Starting Nginx in HTTP mode for ACME challenge..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d nginx

echo "[init-ssl] Requesting certificate for ${DOMAIN}..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" run --rm certbot \
  certbot certonly --webroot -w /var/www/certbot \
  -d "$DOMAIN" \
  --email "$CERTBOT_EMAIL" \
  --agree-tos \
  --non-interactive \
  --no-eff-email

echo "[init-ssl] Restarting Nginx with TLS..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" restart nginx

echo "[init-ssl] Certificate installed. Verify: https://${DOMAIN}"
