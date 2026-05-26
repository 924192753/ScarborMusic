/**
 * Database adapter factory for Prisma v7.
 *
 * Prisma v7 uses a JavaScript-based query engine ("client" engine) that
 * requires an explicit database adapter instead of a Rust binary.
 * For MySQL 8.4 we use @prisma/adapter-mariadb which is compatible.
 */
import { PrismaMariaDb } from '@prisma/adapter-mariadb'

function parseMysqlUrl(url: string) {
  const parsed = new URL(url)
  return {
    host: parsed.hostname,
    port: Number(parsed.port) || 3306,
    user: parsed.username,
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.slice(1),
    connectionLimit: 10,
    idleTimeout: 30,
  }
}

/** Placeholder for `next build` when Docker/CI has no live MySQL yet. */
function resolveDatabaseUrl(): string {
  const url = process.env.DATABASE_URL
  if (url) return url

  const isNextProductionBuild =
    process.env.NEXT_PHASE === 'phase-production-build' ||
    process.env.npm_lifecycle_event === 'build'

  if (isNextProductionBuild) {
    return 'mysql://scarbormusic:build@127.0.0.1:3306/scarbormusic'
  }

  throw new Error('DATABASE_URL environment variable is not set')
}

export function createDbAdapter() {
  const dbUrl = resolveDatabaseUrl()

  const config = parseMysqlUrl(dbUrl)
  return new PrismaMariaDb(config)
}
