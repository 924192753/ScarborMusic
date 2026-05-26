import 'dotenv/config'
import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: 'packages/prisma/schema.prisma',
  migrations: {
    path: 'packages/prisma/migrations',
    seed: 'tsx packages/prisma/seed.ts',
  },
  datasource: {
    // Use process.env directly so that commands like `prisma generate`
    // (which don't need a DB connection) can run without DATABASE_URL set.
    url: process.env.DATABASE_URL ?? '',
  },
})
