# =============================================================================
# ScarborMusic — Production Web Image (Node 22 LTS, Next.js standalone)
# Build context: repository root (docker build -f apps/web/Dockerfile .)
# =============================================================================

# ─── Stage 1: Dependencies ────────────────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app

RUN apk add --no-cache libc6-compat openssl

COPY package.json package-lock.json ./
COPY prisma.config.ts ./
COPY packages/prisma ./packages/prisma

RUN npm ci --ignore-scripts

# ─── Stage 2: Builder ───────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

RUN apk add --no-cache libc6-compat openssl

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Prisma client required for Next.js build (server components / API routes)
RUN npx prisma generate

RUN npm run build

# ─── Stage 3: Runner ────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

RUN apk add --no-cache libc6-compat openssl curl \
  && addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Standalone server + static assets
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Prisma schema, migrations, config (runtime migrate deploy)
COPY --from=builder --chown=nextjs:nodejs /app/packages/prisma ./packages/prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma/adapter-mariadb ./node_modules/@prisma/adapter-mariadb
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/mariadb ./node_modules/mariadb

COPY --from=builder --chown=nextjs:nodejs /app/apps/web/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD curl -f http://127.0.0.1:3000/api/categories || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
