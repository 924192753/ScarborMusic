import { type NextRequest } from 'next/server'

import { badRequest, conflict, handleApiError, notFound, ok, parseBody } from '@/lib/api'
import { logAudit } from '@/lib/audit'
import { requireAdminUser } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { adminUpdateCategorySchema } from '@/lib/validators/admin'

type RouteContext = { params: Promise<{ id: string }> }

function parseCategoryId(id: string): number | null {
  const num = parseInt(id, 10)
  return Number.isNaN(num) ? null : num
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const authResult = await requireAdminUser(request)
    if ('status' in authResult) return authResult
    const admin = authResult

    const categoryId = parseCategoryId((await params).id)
    if (categoryId === null) return badRequest('Invalid category ID')

    const parsed = await parseBody(request, adminUpdateCategorySchema)
    if (!('data' in parsed)) return parsed

    const existing = await prisma.category.findUnique({ where: { id: categoryId } })
    if (!existing) return notFound('Category not found')

    if (parsed.data.name || parsed.data.slug) {
      const conflictRow = await prisma.category.findFirst({
        where: {
          id: { not: categoryId },
          OR: [
            ...(parsed.data.name ? [{ name: parsed.data.name }] : []),
            ...(parsed.data.slug ? [{ slug: parsed.data.slug }] : []),
          ],
        },
      })
      if (conflictRow) return conflict('Category name or slug already exists')
    }

    const category = await prisma.category.update({
      where: { id: categoryId },
      data: parsed.data,
    })

    await logAudit({
      adminId: admin.sub,
      action: 'update',
      resource: 'category',
      resourceId: String(categoryId),
      payload: parsed.data,
    })

    return ok(category, 'Category updated')
  } catch (error) {
    return handleApiError(error, 'PATCH /api/admin/categories/[id]')
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const authResult = await requireAdminUser(request)
    if ('status' in authResult) return authResult
    const admin = authResult

    const categoryId = parseCategoryId((await params).id)
    if (categoryId === null) return badRequest('Invalid category ID')

    const existing = await prisma.category.findUnique({
      where: { id: categoryId },
      include: { _count: { select: { songs: true } } },
    })
    if (!existing) return notFound('Category not found')
    if (existing._count.songs > 0) {
      return badRequest('Cannot delete category with associated songs')
    }

    await prisma.category.delete({ where: { id: categoryId } })

    await logAudit({
      adminId: admin.sub,
      action: 'delete',
      resource: 'category',
      resourceId: String(categoryId),
    })

    return ok({ id: categoryId }, 'Category deleted')
  } catch (error) {
    return handleApiError(error, 'DELETE /api/admin/categories/[id]')
  }
}
