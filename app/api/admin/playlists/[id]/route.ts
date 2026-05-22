import { type NextRequest } from 'next/server'

import { handleApiError, notFound, ok, parseBody } from '@/lib/api'
import { logAudit } from '@/lib/audit'
import { requireAdminUser } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { adminUpdatePlaylistSchema } from '@/lib/validators/admin'

type RouteContext = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const authResult = await requireAdminUser(request)
    if ('status' in authResult) return authResult
    const admin = authResult

    const { id } = await params
    const parsed = await parseBody(request, adminUpdatePlaylistSchema)
    if (!('data' in parsed)) return parsed

    const existing = await prisma.playlist.findFirst({ where: { id, deletedAt: null } })
    if (!existing) return notFound('Playlist not found')

    const updateData: { isPublic?: boolean; deletedAt?: Date } = {}
    if (parsed.data.isPublic !== undefined) {
      updateData.isPublic = parsed.data.isPublic
    }
    if (parsed.data.hidden) {
      updateData.isPublic = false
    }

    const playlist = await prisma.playlist.update({
      where: { id },
      data: updateData,
      select: { id: true, name: true, isPublic: true },
    })

    await logAudit({
      adminId: admin.sub,
      action: parsed.data.hidden ? 'hide' : 'update',
      resource: 'playlist',
      resourceId: id,
      payload: parsed.data,
    })

    return ok(playlist, 'Playlist updated')
  } catch (error) {
    return handleApiError(error, 'PATCH /api/admin/playlists/[id]')
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const authResult = await requireAdminUser(request)
    if ('status' in authResult) return authResult
    const admin = authResult

    const { id } = await params
    const existing = await prisma.playlist.findFirst({ where: { id, deletedAt: null } })
    if (!existing) return notFound('Playlist not found')

    await prisma.playlist.update({
      where: { id },
      data: { deletedAt: new Date(), isPublic: false },
    })

    await logAudit({
      adminId: admin.sub,
      action: 'delete',
      resource: 'playlist',
      resourceId: id,
    })

    return ok({ id }, 'Playlist deleted')
  } catch (error) {
    return handleApiError(error, 'DELETE /api/admin/playlists/[id]')
  }
}
