#!/usr/bin/env bash
# 从 IP 模板生成 .env.production 并自动填充随机密钥（保留 MySQL 密码若已存在）
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

ENV_FILE="${ENV_FILE:-.env.production}"
TEMPLATE="${TEMPLATE:-.env.production.ip.example}"

if [[ ! -f "$TEMPLATE" ]]; then
  echo "缺少模板: $TEMPLATE"
  exit 1
fi

if [[ -f "$ENV_FILE" ]]; then
  read -r -p "已存在 $ENV_FILE，是否覆盖并重新生成密钥? [y/N] " ans
  [[ "${ans:-N}" =~ ^[Yy]$ ]] || exit 0
fi

cp "$TEMPLATE" "$ENV_FILE"

# 若模板里仍是 change-me，则生成随机值
if grep -q 'change-me-jwt-secret' "$ENV_FILE"; then
  sed -i "s|^JWT_SECRET=.*|JWT_SECRET=$(openssl rand -hex 32)|" "$ENV_FILE"
fi
if grep -q 'change-me-refresh-secret' "$ENV_FILE"; then
  sed -i "s|^JWT_REFRESH_SECRET=.*|JWT_REFRESH_SECRET=$(openssl rand -hex 32)|" "$ENV_FILE"
fi
if grep -q 'change-me-minio-access' "$ENV_FILE"; then
  sed -i "s|^S3_ACCESS_KEY=.*|S3_ACCESS_KEY=$(openssl rand -hex 16)|" "$ENV_FILE"
fi
if grep -q 'change-me-minio-secret' "$ENV_FILE"; then
  sed -i "s|^S3_SECRET_KEY=.*|S3_SECRET_KEY=$(openssl rand -hex 32)|" "$ENV_FILE"
fi
if grep -q 'change-me-grafana-password' "$ENV_FILE"; then
  sed -i "s|^GRAFANA_ADMIN_PASSWORD=.*|GRAFANA_ADMIN_PASSWORD=$(openssl rand -hex 16)|" "$ENV_FILE"
fi
if grep -q 'change-me-root-password' "$ENV_FILE"; then
  DB_PASS="$(openssl rand -hex 16)"
  sed -i "s|^MYSQL_ROOT_PASSWORD=.*|MYSQL_ROOT_PASSWORD=${DB_PASS}|" "$ENV_FILE"
  sed -i "s|^MYSQL_PASSWORD=.*|MYSQL_PASSWORD=${DB_PASS}|" "$ENV_FILE"
  sed -i "s|^DATABASE_URL=.*|DATABASE_URL=mysql://scarbormusic:${DB_PASS}@mysql:3306/scarbormusic|" "$ENV_FILE"
fi

echo "[setup-env] 已写入 $ENV_FILE"
echo "[setup-env] 请检查 MySQL 密码是否符合预期，然后执行: ./scripts/deploy-ip.sh"
grep -E '^(DOMAIN|NEXT_PUBLIC_APP_URL|COOKIE_SECURE|S3_PUBLIC_URL)=' "$ENV_FILE" || true
