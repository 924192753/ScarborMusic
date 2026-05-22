import { type NextRequest } from 'next/server'

import { forbidden, handleApiError, notFound, ok, parseBody, type unauthorized } from '@/lib/api'
import { requireAuthUser } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { updatePlaylistSchema } from '@/lib/validators/playlist'

type RouteContext = { params: Promise<{ id: string }> }

const PLAYLIST_DETAIL_INCLUDE = {
  user: { select: { id: true, username: true, avatarUrl: true } },
  coverFile: { select: { url: true } },
  songs: {
    where: { song: { deletedAt: null } },
    orderBy: { position: 'asc' as const },
    include: {
      song: {
        select: {
          id: true,
          title: true,
          artistName: true,
          albumName: true,
          duration: true,
          playCount: true,
          status: true,
          coverFile: { select: { url: true } },
          audioFile: { select: { url: true } },
          user: { select: { id: true, username: true } },
        },
      },
    },
  },
} as const

// GET /api/playlists/[id]
export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params

    let currentUserId: string | undefined
    try {
      const token = request.cookies.get('access_token')?.value
      if (token) {
        const { verifyAccessToken } = await import('@/lib/jwt')
        const payload = await verifyAccessToken(token)
        currentUserId = payload.sub
      }
    } catch {
      /* anonymous */
    }

    const playlist = await prisma.playlist.findUnique({
      where: { id, deletedAt: null },
      include: PLAYLIST_DETAIL_INCLUDE,
    })

    if (!playlist) return notFound('Playlist not found')

    if (!playlist.isPublic && playlist.userId !== currentUserId) {
      return notFound('Playlist not found')
    }

    return ok(playlist)
  } catch (error) {
    return handleApiError(error, 'GET /api/playlists/[id]')
  }
}

// PATCH /api/playlists/[id]
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const authResult = await requireAuthUser(request)
    if ('status' in authResult) return authResult as ReturnType<typeof unauthorized>
    const user = authResult

    const { id } = await params

    const existing = await prisma.playlist.findUnique({
      where: { id, deletedAt: null },
      select: { userId: true },
    })
    if (!existing) return notFound('Playlist not found')
    if (existing.userId !== user.sub && user.role !== 'ADMIN') return forbidden('Not your playlist')

    const parsed = await parseBody(request, updatePlaylistSchema)
    if (!('data' in parsed)) return parsed

    const updated = await prisma.playlist.update({
      where: { id },
      data: parsed.data,
      include: {
        user: { select: { id: true, username: true } },
        coverFile: { select: { url: true } },
      },
    })

    return ok(updated, 'Playlist updated')
  } catch (error) {
    return handleApiError(error, 'PATCH /api/playlists/[id]')
  }
}

// DELETE /api/playlists/[id]
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const authResult = await requireAuthUser(request)
    if ('status' in authResult) return authResult as ReturnType<typeof unauthorized>
    const user = authResult

    const { id } = await params

    const existing = await prisma.playlist.findUnique({
      where: { id, deletedAt: null },
      select: { userId: true },
    })
    if (!existing) return notFound('Playlist not found')
    if (existing.userId !== user.sub && user.role !== 'ADMIN') return forbidden('Not your playlist')

    await prisma.playlist.update({
      where: { id },
      data: { deletedAt: new Date() },
    })

    return ok(null, 'Playlist deleted')
  } catch (error) {
    return handleApiError(error, 'DELETE /api/playlists/[id]')
  }
}
