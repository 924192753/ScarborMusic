import { type NextRequest } from 'next/server'

import { handleApiError, ok } from '@/lib/api'
import { CACHE_KEYS, getChartKeys, withCache } from '@/lib/cache'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'

const CHARTS_TTL = 5 * 60 // 5 minutes
const CHARTS_LIMIT = 50

type ChartType = 'all' | 'daily' | 'weekly' | 'monthly'

const SONG_SELECT = {
  id: true,
  title: true,
  artistName: true,
  albumName: true,
  duration: true,
  playCount: true,
  createdAt: true,
  coverFile: { select: { url: true } },
  audioFile: { select: { url: true } },
  category: { select: { id: true, name: true, slug: true } },
  user: { select: { id: true, username: true } },
} as const

async function getChartFromRedis(redisKey: string, limit: number) {
  // ZREVRANGE with scores — returns [id, score, id, score, ...]
  const raw = await redis.zrevrange(redisKey, 0, limit - 1, 'WITHSCORES')
  const entries: { songId: string; score: number }[] = []
  for (let i = 0; i < raw.length; i += 2) {
    entries.push({ songId: raw[i], score: Number(raw[i + 1]) })
  }
  return entries
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const type = (url.searchParams.get('type') ?? 'all') as ChartType
    const limit = Math.min(CHARTS_LIMIT, Math.max(1, Number(url.searchParams.get('limit') ?? 50)))

    const cacheKey = CACHE_KEYS.charts(type)
    const chartKeys = getChartKeys('')

    const chartData = await withCache(cacheKey, CHARTS_TTL, async () => {
      const redisKey =
        type === 'all'
          ? chartKeys.all
          : type === 'daily'
            ? chartKeys.daily
            : type === 'weekly'
              ? chartKeys.weekly
              : chartKeys.monthly

      let songIds: { songId: string; score: number }[] = []

      // Try Redis sorted set first
      try {
        songIds = await getChartFromRedis(redisKey, limit)
      } catch {
        /* Redis unavailable */
      }

      if (songIds.length > 0) {
        // Fetch song details for the ranked IDs
        const songs = await prisma.song.findMany({
          where: {
            id: { in: songIds.map((e) => e.songId) },
            deletedAt: null,
            status: 'PUBLISHED',
          },
          select: SONG_SELECT,
        })

        // Sort by Redis score and build ranked list
        const songMap = new Map(songs.map((s) => [s.id, s]))
        return songIds
          .filter((e) => songMap.has(e.songId))
          .map((e, idx) => ({
            rank: idx + 1,
            score: e.score,
            song: {
              ...songMap.get(e.songId)!,
              playCount: songMap.get(e.songId)!.playCount.toString(),
            },
          }))
      }

      // DB fallback: sort by playCount for all-time, createdAt for others
      const dbSongs = await prisma.song.findMany({
        where: { deletedAt: null, status: 'PUBLISHED' },
        select: SONG_SELECT,
        orderBy: type === 'all' ? { playCount: 'desc' } : { createdAt: 'desc' },
        take: limit,
      })

      return dbSongs.map((s, idx) => ({
        rank: idx + 1,
        score: Number(s.playCount),
        song: { ...s, playCount: s.playCount.toString() },
      }))
    })

    return ok({ type, charts: chartData, count: chartData.length })
  } catch (error) {
    return handleApiError(error, 'GET /api/charts')
  }
}
