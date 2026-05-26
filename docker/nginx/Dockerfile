FROM nginx:1.27-alpine

RUN apk add --no-cache curl gettext

COPY nginx.conf /etc/nginx/nginx.conf

COPY templates/ /etc/nginx/templates/
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh \
  && mkdir -p /var/www/certbot /var/cache/nginx /etc/nginx/conf.d \
  && rm -f /etc/nginx/conf.d/default.conf

EXPOSE 80 443

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD curl -f http://127.0.0.1/health || exit 1

ENTRYPOINT ["/docker-entrypoint.sh"]
