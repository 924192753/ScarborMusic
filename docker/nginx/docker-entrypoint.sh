#!/bin/sh
set -e

DOMAIN="${DOMAIN:-localhost}"
export DOMAIN

mkdir -p /etc/nginx/conf.d

# 移除镜像自带的 default.conf，否则会显示 "Welcome to nginx!" 而非反代 Web
rm -f /etc/nginx/conf.d/default.conf

# 公网 IP 作为 DOMAIN 时始终使用 HTTP 模板（Let's Encrypt 不支持纯 IP）
case "$DOMAIN" in
  *[!0-9.]*|'') USE_HTTP_TEMPLATE=0 ;;
  *) USE_HTTP_TEMPLATE=1 ;;
esac

if [ "$USE_HTTP_TEMPLATE" = "1" ]; then
  echo "[nginx] DOMAIN is IP (${DOMAIN}) — HTTP-only mode"
  cp /etc/nginx/templates/scarbormusic-http.conf.template /etc/nginx/conf.d/scarbormusic.conf
elif [ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then
  echo "[nginx] TLS certificates found for ${DOMAIN}, enabling HTTPS"
  envsubst '${DOMAIN}' < /etc/nginx/templates/scarbormusic-ssl.conf.template \
    > /etc/nginx/conf.d/scarbormusic.conf
else
  echo "[nginx] No TLS certs yet — HTTP-only mode (use certbot to obtain certificates)"
  cp /etc/nginx/templates/scarbormusic-http.conf.template /etc/nginx/conf.d/scarbormusic.conf
fi

exec nginx -g 'daemon off;'
