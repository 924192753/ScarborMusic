import { type NextRequest } from 'next/server'

import { handleApiError, notFound, ok } from '@/lib/api'
import { getChartKeys } from '@/lib/cache'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'

type RouteContext = { params: Promise<{ id: string }> }

/**
 * POST /api/songs/[id]/play
 *
 * Increments play count in Redis and updates chart sorted sets.
 * DB playCount sync is handled by a background job (future phase).
 *
 * Redis keys updated:
 *   song:play:{id}          — per-song counter
 *   song:charts             — all-time sorted set (ZINCRBY)
 *   song:charts:daily:{date}
 *   song:charts:weekly:{week}
 *   song:charts:monthly:{month}
 */
export async function POST(_request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params

    const song = await prisma.song.findUnique({
      where: { id, deletedAt: null, status: 'PUBLISHED' },
      select: { id: true, playCount: true },
    })
    if (!song) return notFound('Song not found')

    const keys = getChartKeys(id)

    // Increment per-song counter + all chart sorted sets atomically
    const pipeline = redis.multi()
    pipeline.incr(`song:play:${id}`)
    pipeline.zincrby(keys.all, 1, id)
    pipeline.zincrby(keys.daily, 1, id)
    pipeline.zincrby(keys.weekly, 1, id)
    pipeline.zincrby(keys.monthly, 1, id)

    // Set expiry on daily/weekly/monthly keys (30 days)
    const THIRTY_DAYS = 30 * 24 * 60 * 60
    pipeline.expire(keys.daily, THIRTY_DAYS)
    pipeline.expire(keys.weekly, THIRTY_DAYS)
    pipeline.expire(keys.monthly, THIRTY_DAYS)

    const results = await pipeline.exec()
    const redisCount = Number((results?.[0]?.[1] as number) ?? 1)

    const totalCount = song.playCount + BigInt(redisCount)

    return ok({ playCount: totalCount.toString(), redisCount }, 'Play count updated')
  } catch (error) {
    return handleApiError(error, 'POST /api/songs/[id]/play')
  }
}
