import { type NextRequest } from 'next/server'

import { badRequest, handleApiError, notFound, ok, parseBody } from '@/lib/api'
import { logAudit } from '@/lib/audit'
import { requireAdminUser } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { adminUpdateUserSchema } from '@/lib/validators/admin'

type RouteContext = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const authResult = await requireAdminUser(request)
    if ('status' in authResult) return authResult
    const admin = authResult

    const { id } = await params
    const parsed = await parseBody(request, adminUpdateUserSchema)
    if (!('data' in parsed)) return parsed

    const existing = await prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: { role: true },
    })
    if (!existing) return notFound('User not found')

    if (id === admin.sub && parsed.data.roleName && parsed.data.roleName !== 'ADMIN') {
      return badRequest('Cannot demote your own admin account')
    }

    const updateData: { isActive?: boolean; roleId?: string } = {}
    if (parsed.data.isActive !== undefined) {
      updateData.isActive = parsed.data.isActive
    }

    if (parsed.data.roleName) {
      const role = await prisma.role.findFirst({
        where: { name: parsed.data.roleName, deletedAt: null },
      })
      if (!role) return badRequest(`Role ${parsed.data.roleName} not found`)
      updateData.roleId = role.id
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        isActive: true,
        role: { select: { id: true, name: true } },
      },
    })

    const action =
      parsed.data.isActive === false
        ? 'ban'
        : parsed.data.isActive === true
          ? 'unban'
          : parsed.data.roleName
            ? 'change_role'
            : 'update'

    await logAudit({
      adminId: admin.sub,
      action,
      resource: 'user',
      resourceId: id,
      payload: parsed.data,
    })

    return ok(user, 'User updated')
  } catch (error) {
    return handleApiError(error, 'PATCH /api/admin/users/[id]')
  }
}
