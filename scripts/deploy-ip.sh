#!/usr/bin/env bash
# 公网 IP + HTTP 一键部署（无 HTTPS / 不启动 certbot）
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

ENV_FILE="${ENV_FILE:-.env.production}"
IP_EXAMPLE="${IP_EXAMPLE:-.env.production.ip.example}"

if [[ ! -f "$ENV_FILE" ]]; then
  if [[ -f "$IP_EXAMPLE" ]]; then
    cp "$IP_EXAMPLE" "$ENV_FILE"
    echo "[deploy-ip] Created $ENV_FILE from $IP_EXAMPLE"
  else
    cp .env.production.example "$ENV_FILE"
    echo "[deploy-ip] Created $ENV_FILE from .env.production.example"
  fi
  echo "[deploy-ip] 请编辑 $ENV_FILE：替换所有 change-me 密码与 JWT 密钥后再执行本脚本"
  exit 1
fi

if grep -q 'change-me' "$ENV_FILE" 2>/dev/null; then
  echo "[deploy-ip] 警告: $ENV_FILE 仍含 change-me 占位符，请先设置强密码"
  echo "  生成密钥: openssl rand -hex 32"
  exit 1
fi

# 确保 IP + HTTP 关键项
if ! grep -q '^COOKIE_SECURE=false' "$ENV_FILE"; then
  echo "[deploy-ip] 提示: 公网 IP + HTTP 需在 $ENV_FILE 设置 COOKIE_SECURE=false"
fi

export COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
export ENV_FILE

echo "[deploy-ip] 模式: 公网 IP + HTTP（不启用 certbot / 443）"
"$ROOT_DIR/scripts/deploy.sh"

echo "[deploy-ip] 完成。浏览器访问: ${NEXT_PUBLIC_APP_URL:-http://159.75.87.182}"
echo "[deploy-ip] 勿执行 init-ssl.sh（无域名 HTTPS）"
