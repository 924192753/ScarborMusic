import { type NextRequest } from 'next/server'

import { z } from 'zod'

import {
  badRequest,
  created,
  handleApiError,
  notFound,
  ok,
  parseBody,
  tooManyRequests,
  type unauthorized,
} from '@/lib/api'
import { getAuthUser, requireAuthUser } from '@/lib/auth-server'
import { withCache } from '@/lib/cache'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'
import { validateCommentContent } from '@/lib/sanitize'

const RATE_WINDOW = 30 // seconds
const RATE_MAX = 5 // max comments per window

const createCommentSchema = z.object({
  songId: z.string().uuid(),
  content: z.string().min(1).max(1000),
  parentId: z.string().uuid().optional(),
})

const USER_SELECT = { id: true, username: true, avatarUrl: true } as const

// Static 3-level nested comment include (level 0 → 1 → 2)
const COMMENT_INCLUDE = {
  user: { select: USER_SELECT },
  replies: {
    where: { deletedAt: null, status: 'VISIBLE' as const },
    include: {
      user: { select: USER_SELECT },
      replies: {
        where: { deletedAt: null, status: 'VISIBLE' as const },
        include: { user: { select: USER_SELECT } },
        orderBy: { createdAt: 'asc' as const },
        take: 3,
      },
    },
    orderBy: { createdAt: 'asc' as const },
    take: 5,
  },
}

// ─── GET /api/comments ────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const songId = url.searchParams.get('songId')
    if (!songId) return badRequest('songId is required')

    const page = Math.max(1, Number(url.searchParams.get('page') ?? 1))
    const pageSize = Math.min(50, Math.max(1, Number(url.searchParams.get('pageSize') ?? 20)))
    const sort = url.searchParams.get('sort') === 'hot' ? 'hot' : 'latest'

    // Verify song exists
    const song = await prisma.song.findUnique({
      where: { id: songId, deletedAt: null },
      select: { id: true },
    })
    if (!song) return notFound('Song not found')

    // Get total count (cached 5 min)
    const total = await withCache(`comment:count:${songId}`, 300, () =>
      prisma.comment.count({
        where: { songId, parentId: null, deletedAt: null, status: 'VISIBLE' },
      }),
    )

    // Fetch top-level comments with nested replies (3 levels deep)
    const comments = await prisma.comment.findMany({
      where: { songId, parentId: null, deletedAt: null, status: 'VISIBLE' },
      include: COMMENT_INCLUDE,
      orderBy: sort === 'hot' ? { likeCount: 'desc' } : { createdAt: 'desc' },
      take: pageSize,
      skip: (page - 1) * pageSize,
    })

    // Check like status for the current user (Redis batch SISMEMBER)
    const currentUser = await getAuthUser(request)

    interface CommentWithLiked {
      isLiked?: boolean
      replies?: CommentWithLiked[]
      [key: string]: unknown
    }

    let result: CommentWithLiked[] = comments as unknown as CommentWithLiked[]

    if (currentUser) {
      // Batch check all comment IDs (top-level + replies)
      const allIds: string[] = []
      function collectIds(items: CommentWithLiked[]) {
        for (const item of items) {
          allIds.push(item.id as string)
          if (item.replies) collectIds(item.replies)
        }
      }
      collectIds(result)

      if (allIds.length > 0) {
        const pipeline = redis.pipeline()
        allIds.forEach((id) => pipeline.sismember(`comment:likes:${id}`, currentUser.sub))
        const likeResults = await pipeline.exec()

        const likedSet = new Set<string>()
        allIds.forEach((id, idx) => {
          if ((likeResults?.[idx]?.[1] as number) === 1) likedSet.add(id)
        })

        function addIsLiked(items: CommentWithLiked[]): CommentWithLiked[] {
          return items.map((item) => ({
            ...item,
            isLiked: likedSet.has(item.id as string),
            replies: item.replies ? addIsLiked(item.replies) : undefined,
          }))
        }
        result = addIsLiked(result)
      }
    }

    return ok({ comments: result, total, page, pages: Math.ceil(total / pageSize) })
  } catch (error) {
    return handleApiError(error, 'GET /api/comments')
  }
}

// ─── POST /api/comments ───────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuthUser(request)
    if ('status' in authResult) return authResult as ReturnType<typeof unauthorized>
    const user = authResult

    // Rate limiting: 5 comments per 30 seconds per user
    const rateKey = `rate:comment:${user.sub}`
    const count = await redis.incr(rateKey)
    if (count === 1) await redis.expire(rateKey, RATE_WINDOW)
    if (count > RATE_MAX) {
      return tooManyRequests(
        `Too many comments. Please wait ${RATE_WINDOW} seconds before posting again.`,
      )
    }

    const parsed = await parseBody(request, createCommentSchema)
    if (!('data' in parsed)) return parsed

    const { songId, content: rawContent, parentId } = parsed.data

    // Sanitize and validate content
    const { valid, content, error } = validateCommentContent(rawContent)
    if (!valid) return badRequest(error!)

    // Verify song exists
    const song = await prisma.song.findUnique({
      where: { id: songId, deletedAt: null, status: 'PUBLISHED' },
      select: { id: true },
    })
    if (!song) return notFound('Song not found')

    // Verify parent comment exists (if replying)
    if (parentId) {
      const parent = await prisma.comment.findUnique({
        where: { id: parentId, songId, deletedAt: null },
        select: { id: true },
      })
      if (!parent) return notFound('Parent comment not found')
    }

    const comment = await prisma.comment.create({
      data: { songId, userId: user.sub, content, parentId },
      include: { user: { select: USER_SELECT } },
    })

    // Invalidate comment count cache for this song
    await redis.del(`comment:count:${songId}`)

    return created({ ...comment, isLiked: false }, parentId ? 'Reply posted' : 'Comment posted')
  } catch (error) {
    return handleApiError(error, 'POST /api/comments')
  }
}
