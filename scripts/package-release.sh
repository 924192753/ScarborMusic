#!/usr/bin/env bash
# Create a server-uploadable release tarball (source + Docker, no node_modules/.next)
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

VERSION="$(date -u +%Y%m%d)"
ARCHIVE_NAME="scarbormusic-deploy-${VERSION}.tar.gz"
OUTPUT_DIR="${OUTPUT_DIR:-$ROOT_DIR/dist}"
mkdir -p "$OUTPUT_DIR"

EXCLUDE_FILE="$(mktemp)"
cat > "$EXCLUDE_FILE" <<'EOF'
node_modules
.next
out
coverage
test-results
playwright-report
.git
.cursor
.husky
*.log
.env
.env.local
.env.production
dist
*.tsbuildinfo
EOF

echo "[package] Creating ${ARCHIVE_NAME} ..."
tar -czf "${OUTPUT_DIR}/${ARCHIVE_NAME}" \
  --exclude-from="$EXCLUDE_FILE" \
  -C "$ROOT_DIR" \
  .

rm -f "$EXCLUDE_FILE"

SIZE="$(du -h "${OUTPUT_DIR}/${ARCHIVE_NAME}" | cut -f1)"
echo "[package] Done: ${OUTPUT_DIR}/${ARCHIVE_NAME} (${SIZE})"
echo "[package] Upload to server, then:"
echo "  mkdir -p /opt/scarbormusic && tar -xzf ${ARCHIVE_NAME} -C /opt/scarbormusic --strip-components=0"
