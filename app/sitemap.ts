import type { MetadataRoute } from 'next'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const now = new Date()

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/songs`, lastModified: now, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${baseUrl}/discover`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${baseUrl}/charts`, lastModified: now, changeFrequency: 'hourly', priority: 0.8 },
    { url: `${baseUrl}/search`, lastModified: now, changeFrequency: 'daily', priority: 0.7 },
  ]

  // Dynamic song routes — only include published songs
  let songRoutes: MetadataRoute.Sitemap = []
  try {
    const { prisma } = await import('@/lib/prisma')
    const songs = await prisma.song.findMany({
      where: { status: 'PUBLISHED', deletedAt: null },
      select: { id: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
      take: 5000,
    })
    songRoutes = songs.map((song) => ({
      url: `${baseUrl}/song/${song.id}`,
      lastModified: song.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }))
  } catch {
    // DB not available at build time — return static only
  }

  return [...staticRoutes, ...songRoutes]
}
