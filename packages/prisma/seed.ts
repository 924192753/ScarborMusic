import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import { PrismaClient } from '@prisma/client'
import 'dotenv/config'

function parseMysqlUrl(url: string) {
  const parsed = new URL(url)
  return {
    host: parsed.hostname,
    port: Number(parsed.port) || 3306,
    user: parsed.username,
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.slice(1),
    connectionLimit: 5,
  }
}

const dbUrl = process.env.DATABASE_URL
if (!dbUrl) throw new Error('DATABASE_URL is not set')

const adapter = new PrismaMariaDb(parseMysqlUrl(dbUrl))
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('🌱 Seeding database...')

  const adminRole = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: { description: 'Administrator with full platform access' },
    create: { name: 'ADMIN', description: 'Administrator with full platform access' },
  })

  const userRole = await prisma.role.upsert({
    where: { name: 'USER' },
    update: { description: 'Regular user with standard permissions' },
    create: { name: 'USER', description: 'Regular user with standard permissions' },
  })

  console.log('✅ Roles seeded:')
  console.log(`   ADMIN → ${adminRole.id}`)
  console.log(`   USER  → ${userRole.id}`)
  console.log('🎉 Seeding complete.')
}

main()
  .catch((error) => {
    console.error('❌ Seeding failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
