import { type NextRequest } from 'next/server'

import { handleApiError, notFound, ok } from '@/lib/api'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'

type RouteContext = { params: Promise<{ id: string }> }

/**
 * POST /api/songs/[id]/play
 *
 * Increments the play count for a song using Redis.
 * The DB playCount is updated asynchronously in a background job (future phase).
 * Key: song:play:{id}
 */
export async function POST(_request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params

    // Verify song exists
    const song = await prisma.song.findUnique({
      where: { id, deletedAt: null, status: 'PUBLISHED' },
      select: { id: true, playCount: true },
    })
    if (!song) return notFound('Song not found')

    // Increment Redis counter
    const redisKey = `song:play:${id}`
    const redisCount = await redis.incr(redisKey)

    // Set key expiry to 30 days on first increment (prevents memory leaks)
    if (redisCount === 1) {
      await redis.expire(redisKey, 30 * 24 * 60 * 60)
    }

    // Total = DB base + Redis delta
    const totalCount = song.playCount + BigInt(redisCount)

    return ok({ playCount: totalCount.toString(), redisCount }, 'Play count updated')
  } catch (error) {
    return handleApiError(error, 'POST /api/songs/[id]/play')
  }
}
