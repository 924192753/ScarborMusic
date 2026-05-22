import { type NextRequest } from 'next/server'

import { created, handleApiError, ok, parseBody, type unauthorized } from '@/lib/api'
import { requireAuthUser } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { createPlaylistSchema } from '@/lib/validators/playlist'

const PLAYLIST_INCLUDE = {
  user: { select: { id: true, username: true, avatarUrl: true } },
  coverFile: { select: { url: true } },
  _count: { select: { songs: true } },
} as const

// GET /api/playlists — list playlists (public or current user's)
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const page = Math.max(1, Number(url.searchParams.get('page') ?? 1))
    const pageSize = Math.min(50, Math.max(1, Number(url.searchParams.get('pageSize') ?? 20)))
    const userId = url.searchParams.get('userId') ?? undefined
    const mine = url.searchParams.get('mine') === 'true'

    let currentUserId: string | undefined
    if (mine) {
      try {
        const token = request.cookies.get('access_token')?.value
        if (token) {
          const { verifyAccessToken } = await import('@/lib/jwt')
          const payload = await verifyAccessToken(token)
          currentUserId = payload.sub
        }
      } catch {
        /* not authenticated */
      }
    }

    const where = {
      deletedAt: null,
      ...(userId
        ? { userId }
        : mine && currentUserId
          ? { userId: currentUserId }
          : { isPublic: true }),
    }

    const [playlists, total] = await Promise.all([
      prisma.playlist.findMany({
        where,
        include: PLAYLIST_INCLUDE,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.playlist.count({ where }),
    ])

    return ok({
      playlists,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    })
  } catch (error) {
    return handleApiError(error, 'GET /api/playlists')
  }
}

// POST /api/playlists — create a playlist
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuthUser(request)
    if ('status' in authResult) return authResult as ReturnType<typeof unauthorized>
    const user = authResult

    const parsed = await parseBody(request, createPlaylistSchema)
    if (!('data' in parsed)) return parsed

    const { name, description, isPublic, coverFileId } = parsed.data

    const playlist = await prisma.playlist.create({
      data: { userId: user.sub, name, description, isPublic, coverFileId },
      include: PLAYLIST_INCLUDE,
    })

    return created(playlist, 'Playlist created successfully')
  } catch (error) {
    return handleApiError(error, 'POST /api/playlists')
  }
}
