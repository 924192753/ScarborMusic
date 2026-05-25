FROM nginx:1.27-alpine

RUN apk add --no-cache curl gettext brotli-libs \
  && apk add --no-cache nginx-mod-http-brotli nginx-mod-http-brotli-static 2>/dev/null || true

COPY nginx.conf /etc/nginx/nginx.conf
RUN if ! ls /etc/nginx/modules/*brotli* >/dev/null 2>&1; then \
      sed -i '/brotli_/d' /etc/nginx/nginx.conf; \
    fi

COPY templates/ /etc/nginx/templates/
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh \
  && mkdir -p /var/www/certbot /var/cache/nginx /etc/nginx/conf.d

EXPOSE 80 443

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD curl -f http://127.0.0.1/health || exit 1

ENTRYPOINT ["/docker-entrypoint.sh"]
