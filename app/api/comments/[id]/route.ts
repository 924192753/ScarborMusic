import { type NextRequest } from 'next/server'

import { z } from 'zod'

import { forbidden, handleApiError, notFound, ok, parseBody, type unauthorized } from '@/lib/api'
import { requireAuthUser } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'
import { validateCommentContent } from '@/lib/sanitize'

type RouteContext = { params: Promise<{ id: string }> }

const updateCommentSchema = z.object({
  content: z.string().min(1).max(1000),
})

// PATCH /api/comments/[id] — edit content (owner only)
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const authResult = await requireAuthUser(request)
    if ('status' in authResult) return authResult as ReturnType<typeof unauthorized>
    const user = authResult

    const { id } = await params

    const existing = await prisma.comment.findUnique({
      where: { id, deletedAt: null },
      select: { userId: true, songId: true },
    })
    if (!existing) return notFound('Comment not found')
    if (existing.userId !== user.sub && user.role !== 'ADMIN') {
      return forbidden('You cannot edit this comment')
    }

    const parsed = await parseBody(request, updateCommentSchema)
    if (!('data' in parsed)) return parsed

    const { valid, content, error } = validateCommentContent(parsed.data.content)
    if (!valid) return notFound(error!)

    const updated = await prisma.comment.update({
      where: { id },
      data: { content },
      include: { user: { select: { id: true, username: true, avatarUrl: true } } },
    })

    return ok(updated, 'Comment updated')
  } catch (error) {
    return handleApiError(error, 'PATCH /api/comments/[id]')
  }
}

// DELETE /api/comments/[id] — soft delete (owner or admin)
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const authResult = await requireAuthUser(request)
    if ('status' in authResult) return authResult as ReturnType<typeof unauthorized>
    const user = authResult

    const { id } = await params

    const existing = await prisma.comment.findUnique({
      where: { id, deletedAt: null },
      select: { userId: true, songId: true, parentId: true },
    })
    if (!existing) return notFound('Comment not found')
    if (existing.userId !== user.sub && user.role !== 'ADMIN') {
      return forbidden('You cannot delete this comment')
    }

    await prisma.comment.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'DELETED' },
    })

    // Invalidate count cache for the song
    await redis.del(`comment:count:${existing.songId}`)

    return ok(null, 'Comment deleted')
  } catch (error) {
    return handleApiError(error, 'DELETE /api/comments/[id]')
  }
}
