import { type NextRequest } from 'next/server'

import { badRequest, created, handleApiError, ok, parseBody, type unauthorized } from '@/lib/api'
import { requireAuthUser } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { createSongSchema, listSongsSchema } from '@/lib/validators/song'

// ─── Shared song include ──────────────────────────────────────────────────────

const SONG_INCLUDE = {
  category: { select: { id: true, name: true, slug: true } },
  tags: { include: { tag: { select: { id: true, name: true, slug: true } } } },
  coverFile: { select: { id: true, url: true } },
  audioFile: { select: { id: true, url: true } },
  user: { select: { id: true, username: true, avatarUrl: true } },
} as const

// ─── GET /api/songs ───────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const params = Object.fromEntries(url.searchParams.entries())
    const parsed = listSongsSchema.safeParse(params)

    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? 'Invalid query parameters')
    }

    const { page, pageSize, categoryId, tagId, status, sort, userId } = parsed.data

    const where = {
      deletedAt: null,
      ...(status ? { status } : { status: 'PUBLISHED' as const }),
      ...(categoryId && { categoryId }),
      ...(tagId && { tags: { some: { tagId } } }),
      ...(userId && { userId }),
    }

    const [songs, total] = await Promise.all([
      prisma.song.findMany({
        where,
        include: SONG_INCLUDE,
        orderBy:
          sort === 'popular'
            ? { playCount: 'desc' }
            : sort === 'liked'
              ? { likeCount: 'desc' }
              : { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.song.count({ where }),
    ])

    return ok(
      { songs, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } },
      'ok',
    )
  } catch (error) {
    return handleApiError(error, 'GET /api/songs')
  }
}

// ─── POST /api/songs ──────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuthUser(request)
    if ('status' in authResult) return authResult as ReturnType<typeof unauthorized>
    const user = authResult

    const parsed = await parseBody(request, createSongSchema)
    if (!('data' in parsed)) return parsed

    const {
      title,
      artistName,
      albumName,
      description,
      lyrics,
      duration,
      status,
      audioFileId,
      coverFileId,
      categoryId,
      tagIds,
    } = parsed.data

    // Verify audio file belongs to user and is audio type
    const audioFile = await prisma.uploadedFile.findUnique({
      where: { id: audioFileId },
      select: { id: true, userId: true, fileType: true, url: true },
    })
    if (!audioFile) return badRequest('Audio file not found')
    if (audioFile.userId !== user.sub) return badRequest('Audio file does not belong to you')
    if (audioFile.fileType !== 'audio') return badRequest('The specified file is not an audio file')

    // Verify cover file (if provided)
    if (coverFileId) {
      const coverFile = await prisma.uploadedFile.findUnique({
        where: { id: coverFileId },
        select: { id: true, userId: true, fileType: true },
      })
      if (!coverFile) return badRequest('Cover file not found')
      if (coverFile.userId !== user.sub) return badRequest('Cover file does not belong to you')
      if (coverFile.fileType !== 'image') return badRequest('The specified file is not an image')
    }

    // Verify category (if provided)
    if (categoryId) {
      const category = await prisma.category.findUnique({ where: { id: categoryId } })
      if (!category) return badRequest(`Category with ID ${categoryId} not found`)
    }

    // Verify tags (if provided)
    if (tagIds.length > 0) {
      const tags = await prisma.tag.findMany({ where: { id: { in: tagIds } } })
      if (tags.length !== tagIds.length) return badRequest('One or more tag IDs are invalid')
    }

    const song = await prisma.song.create({
      data: {
        title,
        artistName,
        albumName,
        description,
        lyrics,
        duration,
        status,
        audioFileId,
        coverFileId,
        categoryId,
        userId: user.sub,
        ...(tagIds.length > 0 && {
          tags: { createMany: { data: tagIds.map((tagId) => ({ tagId })) } },
        }),
      },
      include: SONG_INCLUDE,
    })

    return created(song, 'Song created successfully')
  } catch (error) {
    return handleApiError(error, 'POST /api/songs')
  }
}
