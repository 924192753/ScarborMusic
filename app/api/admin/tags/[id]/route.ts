import { type NextRequest } from 'next/server'

import { badRequest, conflict, handleApiError, notFound, ok, parseBody } from '@/lib/api'
import { logAudit } from '@/lib/audit'
import { requireAdminUser } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { adminUpdateTagSchema } from '@/lib/validators/admin'

type RouteContext = { params: Promise<{ id: string }> }

function parseTagId(id: string): number | null {
  const num = parseInt(id, 10)
  return Number.isNaN(num) ? null : num
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const authResult = await requireAdminUser(request)
    if ('status' in authResult) return authResult
    const admin = authResult

    const tagId = parseTagId((await params).id)
    if (tagId === null) return badRequest('Invalid tag ID')

    const parsed = await parseBody(request, adminUpdateTagSchema)
    if (!('data' in parsed)) return parsed

    const existing = await prisma.tag.findUnique({ where: { id: tagId } })
    if (!existing) return notFound('Tag not found')

    if (parsed.data.name || parsed.data.slug) {
      const conflictRow = await prisma.tag.findFirst({
        where: {
          id: { not: tagId },
          OR: [
            ...(parsed.data.name ? [{ name: parsed.data.name }] : []),
            ...(parsed.data.slug ? [{ slug: parsed.data.slug }] : []),
          ],
        },
      })
      if (conflictRow) return conflict('Tag name or slug already exists')
    }

    const tag = await prisma.tag.update({
      where: { id: tagId },
      data: parsed.data,
    })

    await logAudit({
      adminId: admin.sub,
      action: 'update',
      resource: 'tag',
      resourceId: String(tagId),
      payload: parsed.data,
    })

    return ok(tag, 'Tag updated')
  } catch (error) {
    return handleApiError(error, 'PATCH /api/admin/tags/[id]')
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const authResult = await requireAdminUser(request)
    if ('status' in authResult) return authResult
    const admin = authResult

    const tagId = parseTagId((await params).id)
    if (tagId === null) return badRequest('Invalid tag ID')

    const existing = await prisma.tag.findUnique({
      where: { id: tagId },
      include: { _count: { select: { songs: true } } },
    })
    if (!existing) return notFound('Tag not found')

    await prisma.tag.delete({ where: { id: tagId } })

    await logAudit({
      adminId: admin.sub,
      action: 'delete',
      resource: 'tag',
      resourceId: String(tagId),
      payload: { songLinks: existing._count.songs },
    })

    return ok({ id: tagId }, 'Tag deleted')
  } catch (error) {
    return handleApiError(error, 'DELETE /api/admin/tags/[id]')
  }
}
