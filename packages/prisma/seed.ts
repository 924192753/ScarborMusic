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

async function seedRoles() {
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

  console.log(`  ✅ ADMIN → ${adminRole.id}`)
  console.log(`  ✅ USER  → ${userRole.id}`)
}

async function seedCategories() {
  const categories = [
    { name: 'Pop', slug: 'pop', description: 'Popular music with broad appeal' },
    { name: 'Rock', slug: 'rock', description: 'Guitar-driven rock music' },
    { name: 'Hip-Hop', slug: 'hip-hop', description: 'Rap and hip-hop music' },
    { name: 'Electronic', slug: 'electronic', description: 'Electronic and dance music' },
    { name: 'Classical', slug: 'classical', description: 'Classical and orchestral music' },
  ]

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, description: cat.description },
      create: cat,
    })
    console.log(`  ✅ Category: ${cat.name}`)
  }
}

async function seedTags() {
  const tags = [
    { name: 'Relax', slug: 'relax' },
    { name: 'Workout', slug: 'workout' },
    { name: 'Study', slug: 'study' },
    { name: 'Gaming', slug: 'gaming' },
    { name: 'Sleep', slug: 'sleep' },
  ]

  for (const tag of tags) {
    await prisma.tag.upsert({
      where: { slug: tag.slug },
      update: { name: tag.name },
      create: tag,
    })
    console.log(`  ✅ Tag: ${tag.name}`)
  }
}

async function main() {
  console.log('🌱 Seeding database...\n')

  console.log('📋 Roles:')
  await seedRoles()

  console.log('\n🎵 Categories:')
  await seedCategories()

  console.log('\n🏷️  Tags:')
  await seedTags()

  console.log('\n🎉 Seeding complete.')
}

main()
  .catch((error) => {
    console.error('❌ Seeding failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
