import { type NextRequest } from 'next/server'

import { handleApiError, ok } from '@/lib/api'
import { CACHE_KEYS, withCache } from '@/lib/cache'
import { prisma } from '@/lib/prisma'

const SUGGEST_TTL = 60 // 60 seconds

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const q = url.searchParams.get('q')?.trim() ?? ''

    if (q.length < 1) return ok([])

    const cacheKey = CACHE_KEYS.searchSuggest(q)

    const suggestions = await withCache(cacheKey, SUGGEST_TTL, async () => {
      // Query distinct titles and artist names that match the prefix
      const [titles, artists] = await Promise.all([
        prisma.song.findMany({
          where: {
            deletedAt: null,
            status: 'PUBLISHED',
            title: { startsWith: q },
          },
          select: { title: true },
          distinct: ['title'],
          take: 5,
          orderBy: { playCount: 'desc' },
        }),
        prisma.song.findMany({
          where: {
            deletedAt: null,
            status: 'PUBLISHED',
            artistName: { startsWith: q },
          },
          select: { artistName: true },
          distinct: ['artistName'],
          take: 5,
          orderBy: { playCount: 'desc' },
        }),
      ])

      const seen = new Set<string>()
      const results: { text: string; type: 'song' | 'artist' }[] = []

      for (const t of titles) {
        if (!seen.has(t.title)) {
          seen.add(t.title)
          results.push({ text: t.title, type: 'song' })
        }
      }
      for (const a of artists) {
        if (!seen.has(a.artistName)) {
          seen.add(a.artistName)
          results.push({ text: a.artistName, type: 'artist' })
        }
      }

      return results.slice(0, 10)
    })

    return ok(suggestions)
  } catch (error) {
    return handleApiError(error, 'GET /api/search/suggest')
  }
}
