import { type NextRequest } from 'next/server'

import { handleApiError, notFound, ok, type unauthorized } from '@/lib/api'
import { requireAuthUser } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'

type RouteContext = { params: Promise<{ id: string }> }

const LIKE_TTL = 30 * 24 * 60 * 60 // 30 days

/**
 * POST /api/comments/[id]/like — toggle like on a comment
 *
 * Redis key: comment:likes:{commentId} → Redis SET of userId strings
 * - SADD (returns 1 if added → newly liked)
 * - SREM (returns 1 if removed → unliked)
 * DB: likeCount incremented/decremented atomically
 */
export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const authResult = await requireAuthUser(request)
    if ('status' in authResult) return authResult as ReturnType<typeof unauthorized>
    const user = authResult

    const { id: commentId } = await params

    const comment = await prisma.comment.findUnique({
      where: { id: commentId, deletedAt: null, status: 'VISIBLE' },
      select: { id: true, likeCount: true },
    })
    if (!comment) return notFound('Comment not found')

    const likeKey = `comment:likes:${commentId}`

    // Check current like status
    const isCurrentlyLiked = (await redis.sismember(likeKey, user.sub)) === 1

    let newLikeCount: number
    let isLiked: boolean

    if (isCurrentlyLiked) {
      // Unlike
      await redis.srem(likeKey, user.sub)
      const updated = await prisma.comment.update({
        where: { id: commentId },
        data: { likeCount: { decrement: 1 } },
        select: { likeCount: true },
      })
      newLikeCount = updated.likeCount
      isLiked = false
    } else {
      // Like
      const added = await redis.sadd(likeKey, user.sub)
      if (added === 1) {
        // Set TTL on first entry to prevent memory leak
        await redis.expire(likeKey, LIKE_TTL)
      }
      const updated = await prisma.comment.update({
        where: { id: commentId },
        data: { likeCount: { increment: 1 } },
        select: { likeCount: true },
      })
      newLikeCount = updated.likeCount
      isLiked = true
    }

    return ok({ isLiked, likeCount: newLikeCount })
  } catch (error) {
    return handleApiError(error, 'POST /api/comments/[id]/like')
  }
}
