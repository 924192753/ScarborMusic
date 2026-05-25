import { PrismaClient } from '@prisma/client'

import { createDbAdapter } from './db'

// Extend globalThis to persist the Prisma client across Next.js hot reloads.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient {
  const adapter = createDbAdapter()

  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === 'development'
        ? [
            { emit: 'stdout', level: 'query' },
            { emit: 'stdout', level: 'error' },
            { emit: 'stdout', level: 'warn' },
          ]
        : [{ emit: 'stdout', level: 'error' }],
  })
}

function getPrismaClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient()
  }
  return globalForPrisma.prisma
}

/**
 * Lazy Prisma client — avoids connecting at module load during `next build`
 * (when DATABASE_URL may be unset inside Docker builder).
 */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getPrismaClient()
    const value = Reflect.get(client, prop, client) as unknown
    if (typeof value === 'function') {
      return (value as (...args: unknown[]) => unknown).bind(client)
    }
    return value
  },
})
