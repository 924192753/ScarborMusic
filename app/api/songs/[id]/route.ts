import { type NextRequest } from 'next/server'

import {
  badRequest,
  forbidden,
  handleApiError,
  notFound,
  ok,
  parseBody,
  type unauthorized,
} from '@/lib/api'
import { requireAuthUser } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { updateSongSchema } from '@/lib/validators/song'

const SONG_INCLUDE = {
  category: { select: { id: true, name: true, slug: true } },
  tags: { include: { tag: { select: { id: true, name: true, slug: true } } } },
  coverFile: { select: { id: true, url: true } },
  audioFile: { select: { id: true, url: true } },
  user: { select: { id: true, username: true, avatarUrl: true } },
} as const

type RouteContext = { params: Promise<{ id: string }> }

// ─── GET /api/songs/[id] ──────────────────────────────────────────────────────

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params

    const song = await prisma.song.findUnique({
      where: { id, deletedAt: null },
      include: SONG_INCLUDE,
    })

    if (!song || song.status === 'HIDDEN') return notFound('Song not found')
    return ok(song)
  } catch (error) {
    return handleApiError(error, 'GET /api/songs/[id]')
  }
}

// ─── PATCH /api/songs/[id] ────────────────────────────────────────────────────

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const authResult = await requireAuthUser(request)
    if ('status' in authResult) return authResult as ReturnType<typeof unauthorized>
    const user = authResult

    const { id } = await params

    const existing = await prisma.song.findUnique({
      where: { id, deletedAt: null },
      select: { userId: true },
    })
    if (!existing) return notFound('Song not found')
    if (existing.userId !== user.sub && user.role !== 'ADMIN') {
      return forbidden('You do not have permission to edit this song')
    }

    const parsed = await parseBody(request, updateSongSchema)
    if (!('data' in parsed)) return parsed

    const { tagIds, ...rest } = parsed.data

    // Validate cover file if provided
    if (rest.coverFileId) {
      const coverFile = await prisma.uploadedFile.findUnique({
        where: { id: rest.coverFileId },
        select: { userId: true, fileType: true },
      })
      if (!coverFile) return badRequest('Cover file not found')
      if (coverFile.userId !== user.sub && user.role !== 'ADMIN') {
        return badRequest('Cover file does not belong to you')
      }
      if (coverFile.fileType !== 'image') return badRequest('Not an image file')
    }

    // Handle tag update
    if (tagIds !== undefined) {
      await prisma.songTag.deleteMany({ where: { songId: id } })
      if (tagIds.length > 0) {
        await prisma.songTag.createMany({
          data: tagIds.map((tagId) => ({ songId: id, tagId })),
        })
      }
    }

    const updated = await prisma.song.update({
      where: { id },
      data: rest,
      include: SONG_INCLUDE,
    })

    return ok(updated, 'Song updated successfully')
  } catch (error) {
    return handleApiError(error, 'PATCH /api/songs/[id]')
  }
}

// ─── DELETE /api/songs/[id] ───────────────────────────────────────────────────

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const authResult = await requireAuthUser(request)
    if ('status' in authResult) return authResult as ReturnType<typeof unauthorized>
    const user = authResult

    const { id } = await params

    const existing = await prisma.song.findUnique({
      where: { id, deletedAt: null },
      select: { userId: true },
    })
    if (!existing) return notFound('Song not found')
    if (existing.userId !== user.sub && user.role !== 'ADMIN') {
      return forbidden('You do not have permission to delete this song')
    }

    // Soft delete
    await prisma.song.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'HIDDEN' },
    })

    return ok(null, 'Song deleted successfully')
  } catch (error) {
    return handleApiError(error, 'DELETE /api/songs/[id]')
  }
}
