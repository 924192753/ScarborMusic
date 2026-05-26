import { type NextRequest } from 'next/server'

import { forbidden, handleApiError, notFound, ok, parseBody, type unauthorized } from '@/lib/api'
import { requireAuthUser } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { reorderPlaylistSongsSchema } from '@/lib/validators/playlist'

type RouteContext = { params: Promise<{ id: string }> }

// PATCH /api/playlists/[id]/songs/reorder — drag-and-drop reorder
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const authResult = await requireAuthUser(request)
    if ('status' in authResult) return authResult as ReturnType<typeof unauthorized>
    const user = authResult

    const { id: playlistId } = await params

    const playlist = await prisma.playlist.findUnique({
      where: { id: playlistId, deletedAt: null },
      select: { userId: true },
    })
    if (!playlist) return notFound('Playlist not found')
    if (playlist.userId !== user.sub && user.role !== 'ADMIN') return forbidden('Not your playlist')

    const parsed = await parseBody(request, reorderPlaylistSongsSchema)
    if (!('data' in parsed)) return parsed

    const { songs } = parsed.data

    // Batch update positions in a transaction
    await prisma.$transaction(
      songs.map(({ songId, position }) =>
        prisma.playlistSong.updateMany({
          where: { playlistId, songId },
          data: { position },
        }),
      ),
    )

    return ok(null, 'Playlist order updated')
  } catch (error) {
    return handleApiError(error, 'PATCH /api/playlists/[id]/songs/reorder')
  }
}
