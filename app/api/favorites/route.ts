import { type NextRequest } from 'next/server'

import { z } from 'zod'

import {
  conflict,
  created,
  handleApiError,
  notFound,
  ok,
  parseBody,
  type unauthorized,
} from '@/lib/api'
import { requireAuthUser } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

const addFavoriteSchema = z.object({ songId: z.string().uuid() })

const SONG_SELECT = {
  id: true,
  title: true,
  artistName: true,
  albumName: true,
  duration: true,
  playCount: true,
  status: true,
  createdAt: true,
  coverFile: { select: { url: true } },
  audioFile: { select: { url: true } },
  category: { select: { id: true, name: true, slug: true } },
  tags: { include: { tag: { select: { id: true, name: true, slug: true } } } },
  user: { select: { id: true, username: true } },
} as const

// GET /api/favorites — list current user's favorites
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuthUser(request)
    if ('status' in authResult) return authResult as ReturnType<typeof unauthorized>
    const user = authResult

    const url = new URL(request.url)
    const page = Math.max(1, Number(url.searchParams.get('page') ?? 1))
    const pageSize = Math.min(50, Math.max(1, Number(url.searchParams.get('pageSize') ?? 20)))

    const where = { userId: user.sub, song: { deletedAt: null, status: 'PUBLISHED' as const } }
    const [favorites, total] = await Promise.all([
      prisma.favorite.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: { id: true, createdAt: true, song: { select: SONG_SELECT } },
      }),
      prisma.favorite.count({ where }),
    ])

    return ok({
      favorites,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    })
  } catch (error) {
    return handleApiError(error, 'GET /api/favorites')
  }
}

// POST /api/favorites — favorite a song
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuthUser(request)
    if ('status' in authResult) return authResult as ReturnType<typeof unauthorized>
    const user = authResult

    const parsed = await parseBody(request, addFavoriteSchema)
    if (!('data' in parsed)) return parsed

    const { songId } = parsed.data

    const song = await prisma.song.findUnique({
      where: { id: songId, deletedAt: null },
      select: { id: true },
    })
    if (!song) return notFound('Song not found')

    const existing = await prisma.favorite.findUnique({
      where: { unique_user_song_favorite: { userId: user.sub, songId } },
    })
    if (existing) return conflict('Song is already in your favorites')

    const favorite = await prisma.favorite.create({
      data: { userId: user.sub, songId },
    })

    return created(
      { id: favorite.id, songId, createdAt: favorite.createdAt },
      'Song added to favorites',
    )
  } catch (error) {
    return handleApiError(error, 'POST /api/favorites')
  }
}
