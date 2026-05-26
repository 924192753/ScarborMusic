import { type NextRequest } from 'next/server'

import { buildPagination } from '@/lib/admin-utils'
import { handleApiError, ok } from '@/lib/api'
import { requireAdminUser } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { adminListCommentsSchema } from '@/lib/validators/admin'

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAdminUser(request)
    if ('status' in authResult) return authResult

    const url = new URL(request.url)
    const parsed = adminListCommentsSchema.safeParse(Object.fromEntries(url.searchParams))
    if (!parsed.success) {
      return handleApiError(new Error(parsed.error.issues[0]?.message ?? 'Invalid query'))
    }

    const { page, pageSize, q, status } = parsed.data
    const where = {
      deletedAt: null,
      ...(status && { status }),
      ...(q && { content: { contains: q } }),
    }

    const [comments, total] = await Promise.all([
      prisma.comment.findMany({
        where,
        select: {
          id: true,
          content: true,
          status: true,
          likeCount: true,
          createdAt: true,
          user: { select: { id: true, username: true, avatarUrl: true } },
          song: { select: { id: true, title: true, artistName: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.comment.count({ where }),
    ])

    return ok({ comments, pagination: buildPagination(page, pageSize, total) })
  } catch (error) {
    return handleApiError(error, 'GET /api/admin/comments')
  }
}
