import { type NextRequest } from 'next/server'

import { handleApiError, notFound, ok, parseBody } from '@/lib/api'
import { logAudit } from '@/lib/audit'
import { requireAdminUser } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { adminUpdateSongSchema } from '@/lib/validators/admin'

type RouteContext = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const authResult = await requireAdminUser(request)
    if ('status' in authResult) return authResult
    const admin = authResult

    const { id } = await params
    const parsed = await parseBody(request, adminUpdateSongSchema)
    if (!('data' in parsed)) return parsed

    const existing = await prisma.song.findFirst({ where: { id, deletedAt: null } })
    if (!existing) return notFound('Song not found')

    const song = await prisma.song.update({
      where: { id },
      data: { status: parsed.data.status },
      select: { id: true, title: true, status: true },
    })

    await logAudit({
      adminId: admin.sub,
      action: 'update_status',
      resource: 'song',
      resourceId: id,
      payload: { status: parsed.data.status },
    })

    return ok(song, 'Song updated')
  } catch (error) {
    return handleApiError(error, 'PATCH /api/admin/songs/[id]')
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const authResult = await requireAdminUser(request)
    if ('status' in authResult) return authResult
    const admin = authResult

    const { id } = await params
    const existing = await prisma.song.findFirst({ where: { id, deletedAt: null } })
    if (!existing) return notFound('Song not found')

    await prisma.song.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'HIDDEN' },
    })

    await logAudit({
      adminId: admin.sub,
      action: 'delete',
      resource: 'song',
      resourceId: id,
    })

    return ok({ id }, 'Song deleted')
  } catch (error) {
    return handleApiError(error, 'DELETE /api/admin/songs/[id]')
  }
}
