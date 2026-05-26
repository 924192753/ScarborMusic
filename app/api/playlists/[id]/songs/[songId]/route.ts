import { type NextRequest } from 'next/server'

import { forbidden, handleApiError, notFound, ok, type unauthorized } from '@/lib/api'
import { requireAuthUser } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

type RouteContext = { params: Promise<{ id: string; songId: string }> }

// DELETE /api/playlists/[id]/songs/[songId] — remove a song
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const authResult = await requireAuthUser(request)
    if ('status' in authResult) return authResult as ReturnType<typeof unauthorized>
    const user = authResult

    const { id: playlistId, songId } = await params

    const playlist = await prisma.playlist.findUnique({
      where: { id: playlistId, deletedAt: null },
      select: { userId: true },
    })
    if (!playlist) return notFound('Playlist not found')
    if (playlist.userId !== user.sub && user.role !== 'ADMIN') return forbidden('Not your playlist')

    const entry = await prisma.playlistSong.findUnique({
      where: { playlistId_songId: { playlistId, songId } },
    })
    if (!entry) return notFound('Song not in this playlist')

    await prisma.$transaction([
      prisma.playlistSong.delete({ where: { playlistId_songId: { playlistId, songId } } }),
      prisma.playlist.update({
        where: { id: playlistId },
        data: { songCount: { decrement: 1 } },
      }),
    ])

    return ok(null, 'Song removed from playlist')
  } catch (error) {
    return handleApiError(error, 'DELETE /api/playlists/[id]/songs/[songId]')
  }
}
