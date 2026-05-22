import { type NextRequest } from 'next/server'

import {
  badRequest,
  conflict,
  forbidden,
  handleApiError,
  notFound,
  ok,
  parseBody,
  type unauthorized,
} from '@/lib/api'
import { requireAuthUser } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { addSongToPlaylistSchema } from '@/lib/validators/playlist'

type RouteContext = { params: Promise<{ id: string }> }

// POST /api/playlists/[id]/songs — add a song
export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const authResult = await requireAuthUser(request)
    if ('status' in authResult) return authResult as ReturnType<typeof unauthorized>
    const user = authResult

    const { id: playlistId } = await params

    const playlist = await prisma.playlist.findUnique({
      where: { id: playlistId, deletedAt: null },
      select: { userId: true, songCount: true },
    })
    if (!playlist) return notFound('Playlist not found')
    if (playlist.userId !== user.sub && user.role !== 'ADMIN') return forbidden('Not your playlist')

    const parsed = await parseBody(request, addSongToPlaylistSchema)
    if (!('data' in parsed)) return parsed

    const { songId } = parsed.data

    const song = await prisma.song.findUnique({
      where: { id: songId, deletedAt: null },
      select: { id: true },
    })
    if (!song) return notFound('Song not found')

    const existing = await prisma.playlistSong.findUnique({
      where: { playlistId_songId: { playlistId, songId } },
    })
    if (existing) return conflict('Song is already in this playlist')

    // Get next position
    const maxPos = await prisma.playlistSong.aggregate({
      where: { playlistId },
      _max: { position: true },
    })
    const position = (maxPos._max.position ?? -1) + 1

    await prisma.$transaction([
      prisma.playlistSong.create({ data: { playlistId, songId, position } }),
      prisma.playlist.update({ where: { id: playlistId }, data: { songCount: { increment: 1 } } }),
    ])

    return ok({ playlistId, songId, position }, 'Song added to playlist')
  } catch (error) {
    if (error instanceof Error && error.message.includes('unique')) {
      return conflict('Song is already in this playlist')
    }
    return handleApiError(error, 'POST /api/playlists/[id]/songs')
  }
}

// GET /api/playlists/[id]/songs — check if a song is in the playlist
export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const { id: playlistId } = await params
    const url = new URL(request.url)
    const songId = url.searchParams.get('songId')

    if (!songId) return badRequest('songId query parameter required')

    const entry = await prisma.playlistSong.findUnique({
      where: { playlistId_songId: { playlistId, songId } },
    })

    return ok({ inPlaylist: !!entry })
  } catch (error) {
    return handleApiError(error, 'GET /api/playlists/[id]/songs')
  }
}
