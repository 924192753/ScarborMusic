#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-.env.production}"

FAIL=0

check() {
  local name="$1"
  local cmd="$2"
  if eval "$cmd" >/dev/null 2>&1; then
    echo "  OK   $name"
  else
    echo "  FAIL $name"
    FAIL=1
  fi
}

echo "[health-check] Container status"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps

echo "[health-check] Service probes"
check "nginx /health" "curl -sf http://127.0.0.1/health"
check "web /api/categories" "curl -sf http://127.0.0.1/api/categories || docker compose -f $COMPOSE_FILE --env-file $ENV_FILE exec -T web curl -sf http://127.0.0.1:3000/api/categories"
check "redis" "docker compose -f $COMPOSE_FILE --env-file $ENV_FILE exec -T redis redis-cli ping | grep -q PONG"
check "mysql" "docker compose -f $COMPOSE_FILE --env-file $ENV_FILE exec -T mysql mysqladmin ping -h localhost -u root -p\${MYSQL_ROOT_PASSWORD}"

if [[ "$FAIL" -ne 0 ]]; then
  echo "[health-check] One or more checks failed"
  exit 1
fi

echo "[health-check] All checks passed"
