import { PrismaClient } from '@prisma/client'

import { createDbAdapter } from './db'

// Extend globalThis to persist the Prisma client across Next.js hot reloads.
// Without this, each hot reload creates a new PrismaClient and exhausts the
// connection pool during development.
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

export const prisma: PrismaClient = globalForPrisma.prisma ?? createPrismaClient()

// Cache the client on globalThis in non-production environments so that
// Next.js Fast Refresh does not instantiate a new client on every file save.
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
