import { type NextRequest } from 'next/server'

import { handleApiError, notFound, ok, parseBody } from '@/lib/api'
import { logAudit } from '@/lib/audit'
import { requireAdminUser } from '@/lib/auth-server'
import { invalidateCache } from '@/lib/cache'
import { prisma } from '@/lib/prisma'
import { adminUpdateCommentSchema } from '@/lib/validators/admin'

type RouteContext = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const authResult = await requireAdminUser(request)
    if ('status' in authResult) return authResult
    const admin = authResult

    const { id } = await params
    const parsed = await parseBody(request, adminUpdateCommentSchema)
    if (!('data' in parsed)) return parsed

    const existing = await prisma.comment.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, songId: true, status: true },
    })
    if (!existing) return notFound('Comment not found')

    const updateData: { status: typeof parsed.data.status; deletedAt?: Date | null } = {
      status: parsed.data.status,
    }

    if (parsed.data.status === 'DELETED') {
      updateData.deletedAt = new Date()
    } else if (parsed.data.status === 'VISIBLE') {
      updateData.deletedAt = null
    }

    const comment = await prisma.comment.update({
      where: { id },
      data: updateData,
      select: { id: true, status: true, songId: true },
    })

    await invalidateCache(`comment:count:${existing.songId}`)

    const action =
      parsed.data.status === 'HIDDEN'
        ? 'hide'
        : parsed.data.status === 'VISIBLE'
          ? 'restore'
          : 'delete'

    await logAudit({
      adminId: admin.sub,
      action,
      resource: 'comment',
      resourceId: id,
      payload: { status: parsed.data.status },
    })

    return ok(comment, 'Comment updated')
  } catch (error) {
    return handleApiError(error, 'PATCH /api/admin/comments/[id]')
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const authResult = await requireAdminUser(request)
    if ('status' in authResult) return authResult
    const admin = authResult

    const { id } = await params
    const existing = await prisma.comment.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, songId: true },
    })
    if (!existing) return notFound('Comment not found')

    const comment = await prisma.comment.update({
      where: { id },
      data: { status: 'DELETED', deletedAt: new Date() },
      select: { id: true, status: true },
    })

    await invalidateCache(`comment:count:${existing.songId}`)

    await logAudit({
      adminId: admin.sub,
      action: 'delete',
      resource: 'comment',
      resourceId: id,
    })

    return ok(comment, 'Comment deleted')
  } catch (error) {
    return handleApiError(error, 'DELETE /api/admin/comments/[id]')
  }
}
