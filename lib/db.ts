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

export function createDbAdapter() {
  const dbUrl = process.env.DATABASE_URL

  if (!dbUrl) {
    throw new Error('DATABASE_URL environment variable is not set')
  }

  const config = parseMysqlUrl(dbUrl)
  return new PrismaMariaDb(config)
}
