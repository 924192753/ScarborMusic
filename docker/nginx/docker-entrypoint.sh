#!/bin/sh
set -e

DOMAIN="${DOMAIN:-localhost}"
export DOMAIN

mkdir -p /etc/nginx/conf.d

if [ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then
  echo "[nginx] TLS certificates found for ${DOMAIN}, enabling HTTPS"
  envsubst '${DOMAIN}' < /etc/nginx/templates/scarbormusic-ssl.conf.template \
    > /etc/nginx/conf.d/scarbormusic.conf
else
  echo "[nginx] No TLS certs yet — HTTP-only mode (use certbot to obtain certificates)"
  cp /etc/nginx/templates/scarbormusic-http.conf.template /etc/nginx/conf.d/scarbormusic.conf
fi

exec nginx -g 'daemon off;'
