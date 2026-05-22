import { type NextRequest } from 'next/server'

import { handleApiError, notFound, ok, type unauthorized } from '@/lib/api'
import { requireAuthUser } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

type RouteContext = { params: Promise<{ songId: string }> }

// DELETE /api/favorites/[songId] — unfavorite a song
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const authResult = await requireAuthUser(request)
    if ('status' in authResult) return authResult as ReturnType<typeof unauthorized>
    const user = authResult

    const { songId } = await params

    const favorite = await prisma.favorite.findUnique({
      where: { unique_user_song_favorite: { userId: user.sub, songId } },
    })
    if (!favorite) return notFound('Favorite not found')

    await prisma.favorite.delete({
      where: { unique_user_song_favorite: { userId: user.sub, songId } },
    })

    return ok(null, 'Song removed from favorites')
  } catch (error) {
    return handleApiError(error, 'DELETE /api/favorites/[songId]')
  }
}

// GET /api/favorites/[songId] — check if a song is favorited
export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const authResult = await requireAuthUser(request)
    if ('status' in authResult) return authResult as ReturnType<typeof unauthorized>
    const user = authResult

    const { songId } = await params

    const favorite = await prisma.favorite.findUnique({
      where: { unique_user_song_favorite: { userId: user.sub, songId } },
      select: { id: true, createdAt: true },
    })

    return ok({ isFavorited: !!favorite, favorite: favorite ?? null })
  } catch (error) {
    return handleApiError(error, 'GET /api/favorites/[songId]')
  }
}
