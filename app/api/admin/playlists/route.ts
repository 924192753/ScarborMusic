import { type NextRequest } from 'next/server'

import { buildPagination } from '@/lib/admin-utils'
import { handleApiError, ok } from '@/lib/api'
import { requireAdminUser } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { adminListPlaylistsSchema } from '@/lib/validators/admin'

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAdminUser(request)
    if ('status' in authResult) return authResult

    const url = new URL(request.url)
    const parsed = adminListPlaylistsSchema.safeParse(Object.fromEntries(url.searchParams))
    if (!parsed.success) {
      return handleApiError(new Error(parsed.error.issues[0]?.message ?? 'Invalid query'))
    }

    const { page, pageSize, q } = parsed.data
    const where = {
      deletedAt: null,
      ...(q && {
        OR: [{ name: { contains: q } }, { description: { contains: q } }],
      }),
    }

    const [playlists, total] = await Promise.all([
      prisma.playlist.findMany({
        where,
        select: {
          id: true,
          name: true,
          description: true,
          isPublic: true,
          songCount: true,
          createdAt: true,
          user: { select: { id: true, username: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.playlist.count({ where }),
    ])

    return ok({ playlists, pagination: buildPagination(page, pageSize, total) })
  } catch (error) {
    return handleApiError(error, 'GET /api/admin/playlists')
  }
}
