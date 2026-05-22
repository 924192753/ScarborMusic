import { type NextRequest } from 'next/server'

import { buildPagination } from '@/lib/admin-utils'
import { handleApiError, ok } from '@/lib/api'
import { requireAdminUser } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { adminListSongsSchema } from '@/lib/validators/admin'

const SONG_SELECT = {
  id: true,
  title: true,
  artistName: true,
  albumName: true,
  status: true,
  playCount: true,
  likeCount: true,
  createdAt: true,
  coverFile: { select: { url: true } },
  user: { select: { id: true, username: true } },
  category: { select: { id: true, name: true } },
} as const

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAdminUser(request)
    if ('status' in authResult) return authResult

    const url = new URL(request.url)
    const parsed = adminListSongsSchema.safeParse(Object.fromEntries(url.searchParams))
    if (!parsed.success) {
      return handleApiError(new Error(parsed.error.issues[0]?.message ?? 'Invalid query'))
    }

    const { page, pageSize, q, status } = parsed.data
    const where = {
      deletedAt: null,
      ...(status && { status }),
      ...(q && {
        OR: [
          { title: { contains: q } },
          { artistName: { contains: q } },
          { albumName: { contains: q } },
        ],
      }),
    }

    const [songs, total] = await Promise.all([
      prisma.song.findMany({
        where,
        select: SONG_SELECT,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.song.count({ where }),
    ])

    return ok({ songs, pagination: buildPagination(page, pageSize, total) })
  } catch (error) {
    return handleApiError(error, 'GET /api/admin/songs')
  }
}
