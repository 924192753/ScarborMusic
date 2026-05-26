#!/usr/bin/env bash
# MySQL backup: mysqldump → gzip → upload to MinIO, retain 30 days.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-.env.production}"
NETWORK="${DOCKER_NETWORK:-scarbormusic_prod}"

set -a
# shellcheck source=/dev/null
source "$ENV_FILE"
set +a

RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
BACKUP_BUCKET="${BACKUP_S3_BUCKET:-scarbormusic-backups}"
TIMESTAMP="$(date -u +%Y%m%d_%H%M%S)"
BACKUP_DIR="${BACKUP_DIR:-/tmp/scarbormusic-backups}"
mkdir -p "$BACKUP_DIR"

DUMP_FILE="${BACKUP_DIR}/scarbormusic_${TIMESTAMP}.sql.gz"
OBJECT_KEY="mysql/scarbormusic_${TIMESTAMP}.sql.gz"

echo "[mysql-backup] Dumping database..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T mysql \
  mysqldump -u"${MYSQL_USER}" -p"${MYSQL_PASSWORD}" \
  --single-transaction --routines --triggers \
  "${MYSQL_DATABASE}" | gzip > "$DUMP_FILE"

echo "[mysql-backup] Uploading to MinIO://${BACKUP_BUCKET}/${OBJECT_KEY}"
docker run --rm --network "$NETWORK" \
  -v "${DUMP_FILE}:/backup.sql.gz:ro" \
  minio/mc:latest sh -c "
    mc alias set local http://minio:9000 ${S3_ACCESS_KEY} ${S3_SECRET_KEY}
    mc mb -p local/${BACKUP_BUCKET} 2>/dev/null || true
    mc cp /backup.sql.gz local/${BACKUP_BUCKET}/${OBJECT_KEY}
    mc find local/${BACKUP_BUCKET}/mysql --older-than ${RETENTION_DAYS}d --exec 'mc rm {}' 2>/dev/null || true
  "

rm -f "$DUMP_FILE"
echo "[mysql-backup] Completed: s3://${BACKUP_BUCKET}/${OBJECT_KEY}"
